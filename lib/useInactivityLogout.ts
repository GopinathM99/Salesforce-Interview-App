"use client";

import { useCallback, useEffect, useRef } from "react";

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
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number | null>(null);
  const storageKey = userId ? `lastActivityAt:${userId}` : "lastActivityAt";
  const now = () => Date.now();
  const readLastActivity = useCallback(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, [storageKey]);
  const writeLastActivity = useCallback((ts: number) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, String(ts));
  }, [storageKey]);

  useEffect(() => {
    // Only set up inactivity tracking if user is authenticated
    if (!isAuthenticated) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      // Clear any persisted inactivity markers so the next sign-in starts fresh
      if (typeof window !== "undefined") {
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith("lastActivityAt"))
          .forEach((key) => window.localStorage.removeItem(key));
      }
      return;
    }

    const scheduleTimeout = (lastActivity: number) => {
      const elapsed = now() - lastActivity;

      if (elapsed >= timeout) {
        onInactive();
        return;
      }

      // Clear existing timeout
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      const remaining = timeout - elapsed;
      timeoutIdRef.current = setTimeout(() => {
        onInactive();
      }, remaining);
    };

    const resetTimer = () => {
      const activityTs = now();
      lastActivityRef.current = activityTs;

      // Set new timeout
      scheduleTimeout(activityTs);

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

    // Track activity coming from other tabs as well so one idle tab cannot log everyone out
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      const parsed = Number.parseInt(event.newValue, 10);
      if (!Number.isFinite(parsed)) return;

      // Only reschedule if the incoming timestamp is newer
      if (lastActivityRef.current != null && parsed <= lastActivityRef.current) {
        return;
      }

      lastActivityRef.current = parsed;
      scheduleTimeout(parsed);
    };

    // Set initial timer respecting any elapsed idle time
    const initialTimestamp = lastActivity != null ? lastActivity : now();
    lastActivityRef.current = initialTimestamp;
    scheduleTimeout(initialTimestamp);
    writeLastActivity(initialTimestamp);

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    window.addEventListener("storage", handleStorage);

    // Cleanup function
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      window.removeEventListener("storage", handleStorage);
    };
  }, [timeout, onInactive, isAuthenticated, storageKey, readLastActivity, writeLastActivity]);
}
