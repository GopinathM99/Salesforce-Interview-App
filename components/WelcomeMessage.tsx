"use client";

import { useAuth } from "@/components/AuthProvider";

export function WelcomeMessage() {
  const { user } = useAuth();

  if (!user) return null;

  const displayName = user.user_metadata?.full_name ?? user.email ?? "there";

  return (
    <span className="welcome-message">Welcome, {displayName}</span>
  );
}
