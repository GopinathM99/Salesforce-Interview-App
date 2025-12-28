"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

const clearStaleOAuthHash = () => {
  if (typeof window === "undefined") return;
  const { hash } = window.location;
  if (!hash || !hash.includes("access_token")) return;

  const params = new URLSearchParams(hash.slice(1));
  const issuedAtRaw = params.get("issued_at");
  const expiresAtRaw = params.get("expires_at");
  const expiresInRaw = params.get("expires_in");

  const issuedAt = issuedAtRaw ? Number.parseInt(issuedAtRaw, 10) : Number.NaN;
  const expiresAt = expiresAtRaw ? Number.parseInt(expiresAtRaw, 10) : Number.NaN;
  const expiresIn = expiresInRaw ? Number.parseInt(expiresInRaw, 10) : Number.NaN;
  const derivedIssuedAt =
    Number.isFinite(expiresAt) && Number.isFinite(expiresIn) ? expiresAt - expiresIn : Number.NaN;
  const resolvedIssuedAt = Number.isFinite(issuedAt) ? issuedAt : derivedIssuedAt;
  if (!Number.isFinite(resolvedIssuedAt)) return;

  const now = Math.floor(Date.now() / 1000);
  if (now - resolvedIssuedAt > 120) {
    window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }
};

clearStaleOAuthHash();

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined
  }
});
