"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { useInactivityLogout } from "@/lib/useInactivityLogout";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithOTP: (magicLink: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastLoggedSignInRef = useRef<string | null>(null);
  const sessionFetchedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const syncSession = async () => {
      // Set a 5 second timeout - if auth takes longer, stop loading to allow retry
      timeoutId = setTimeout(() => {
        if (isMounted && !sessionFetchedRef.current) {
          console.warn("Auth session check timed out after 5 seconds");
          setLoading(false);
        }
      }, 5000);

      try {
        const { data } = await supabase.auth.getSession();
        sessionFetchedRef.current = true;
        if (isMounted) {
          setSession(data.session);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to get session:", error);
        if (isMounted) {
          setLoading(false);
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    void syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      sessionFetchedRef.current = true;
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const currentUser = session?.user ?? null;

    if (!currentUser) {
      lastLoggedSignInRef.current = null;
      return;
    }

    const deriveMetaValue = (keys: string[]): string | null => {
      for (const key of keys) {
        const raw = (currentUser.user_metadata ?? {})[key];
        if (typeof raw === "string" && raw.trim()) {
          return raw.trim();
        }
      }
      return null;
    };

    const pickNameParts = () => {
      const first =
        deriveMetaValue(["given_name", "givenName", "first_name", "firstName"]) ??
        null;
      const last =
        deriveMetaValue(["family_name", "familyName", "last_name", "lastName"]) ??
        null;

      if (first && last) return { first, last };

      const full =
        deriveMetaValue(["full_name", "fullName", "name"]) ??
        null;
      if (full) {
        const parts = full.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          return { first: first ?? parts[0], last: last ?? parts.slice(1).join(" ") };
        }
        if (!first && parts.length === 1) {
          return { first: parts[0], last };
        }
      }

      return { first, last };
    };

    const { first, last } = pickNameParts();
    const email = currentUser.email ?? ((currentUser.user_metadata ?? {}).email as string | undefined) ?? "";
    const signInMarker = currentUser.last_sign_in_at ?? currentUser.created_at ?? currentUser.id;

    if (lastLoggedSignInRef.current === signInMarker) return;
    lastLoggedSignInRef.current = signInMarker;

    void supabase
      .rpc("log_user_sign_in", {
        first_name: first ?? null,
        last_name: last ?? null,
        email
      })
      .then(({ error }) => {
        if (error) {
          console.error("Failed to log user sign in", error);
        }
      });
  }, [loading, session]);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    const redirectTo =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (typeof window !== "undefined" ? window.location.origin : undefined);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" }
      }
    });
    if (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signInWithOTP = useCallback(async (magicLink: string) => {
    setLoading(true);
    try {
      // Extract the token from the magic link
      const url = new URL(magicLink);
      const token = url.searchParams.get('token');
      const type = url.searchParams.get('type');

      if (!token || !type) {
        throw new Error('Invalid magic link');
      }

      // Verify the OTP token with Supabase
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as 'magiclink' | 'email',
      });

      if (error) {
        setLoading(false);
        throw error;
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    // If session is already missing, treat as successful sign out
    if (error && !error.message?.includes("session missing")) {
      setLoading(false);
      throw error;
    }
    // Clear local session state regardless
    setSession(null);
    sessionFetchedRef.current = false;
    setLoading(false);
  }, []);

  // Automatically logout user after 15 minutes of inactivity
  useInactivityLogout({
    timeout: 900000, // 15 minutes in milliseconds
    onInactive: () => {
      void signOut();
    },
    isAuthenticated: !!session?.user,
    userId: session?.user?.id ?? null
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signInWithGoogle,
      signInWithOTP,
      signOut
    }),
    [session, loading, signInWithGoogle, signInWithOTP, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
