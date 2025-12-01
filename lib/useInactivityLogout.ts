"use client";

import { useEffect, useRef } from "react";

interface UseInactivityLogoutOptions {
  /**
   * Timeout duration in milliseconds
   * @default 600000 (10 minutes)
   */
  timeout?: number;
  /**
   * Callback function to execute when inactivity timeout is reached
   */
  onInactive: () => void;
  /**
   * Whether the user is currently authenticated
   */
  isAuthenticated: boolean;
  /**
   * Authenticated user's id (used to scope last-activity tracking per user)
   */
  userId?: string | null;
}

/**
 * Custom hook to automatically logout users after a period of inactivity
 *
 * Tracks user activity through mouse movements, keyboard events, clicks, touches, and scrolls.
 * Resets the inactivity timer on each detected activity.
 */
export function useInactivityLogout({
  timeout = 600000, // 10 minutes default
  onInactive,
  isAuthenticated,
  userId
}: UseInactivityLogoutOptions) {
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const storageKey = userId ? `lastActivityAt:${userId}` : "lastActivityAt";
  const now = () => Date.now();
  const readLastActivity = () => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };
  const writeLastActivity = (ts: number) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, String(ts));
  };

  useEffect(() => {
    // Only set up inactivity tracking if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    const resetTimer = () => {
      // Clear existing timeout
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      // Set new timeout
      timeoutIdRef.current = setTimeout(() => {
        onInactive();
      }, timeout);

      writeLastActivity(now());
    };

    // If the user was away longer than timeout (even with tab closed), logout immediately
    const lastActivity = readLastActivity();
    const elapsed = lastActivity != null ? now() - lastActivity : 0;
    if (lastActivity != null && elapsed >= timeout) {
      onInactive();
      return;
    }

    // Activity events to track
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click"
    ];

    // Set initial timer respecting any elapsed idle time
    const remaining = lastActivity != null ? Math.max(timeout - elapsed, 0) : timeout;
    timeoutIdRef.current = setTimeout(() => {
      onInactive();
    }, remaining);
    writeLastActivity(now() - (timeout - remaining));

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Cleanup function
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [timeout, onInactive, isAuthenticated, storageKey]);
}
