import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type UseAdminAccessResult = {
  sessionReady: boolean;
  signedIn: boolean;
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  authError: string | null;
  setAuthError: (value: string | null) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkingAdmin: boolean;
  adminCheckError: string | null;
  isAdmin: boolean;
  currentUserEmail: string | null;
};

export function useAdminAccess(): UseAdminAccessResult {
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSignedIn(Boolean(data.session));
      setCurrentUserEmail(data.session?.user?.email ?? null);
      setSessionReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setCurrentUserEmail(session?.user?.email ?? null);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionReady || !signedIn) {
      setIsAdmin(false);
      setAdminCheckError(null);
      setCheckingAdmin(false);
      return;
    }

    let cancelled = false;
    setCheckingAdmin(true);
    setAdminCheckError(null);

    const run = async () => {
      try {
        const { data, error } = await supabase.rpc("is_admin");
        if (cancelled) return;
        if (error) {
          setAdminCheckError(error.message);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(data));
        }
      } finally {
        if (!cancelled) setCheckingAdmin(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [sessionReady, signedIn]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  }, [email, password]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminCheckError(null);
    setCheckingAdmin(false);
    setEmail("");
    setPassword("");
    setAuthError(null);
  }, []);

  return {
    sessionReady,
    signedIn,
    email,
    password,
    setEmail,
    setPassword,
    authError,
    setAuthError,
    signIn,
    signOut,
    checkingAdmin,
    adminCheckError,
    isAdmin,
    currentUserEmail
  };
}
