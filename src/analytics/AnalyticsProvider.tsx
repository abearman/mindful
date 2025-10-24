import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { phCapture, phIdentify, phReset } from "@/analytics/phLite";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth";

const HEARTBEAT_MS = 60_000;
const OPT_OUT_KEY = "mindful_ph_opt_out";
const SURFACE = (globalThis as any).__surface || "popup";
const STORAGE_TYPE = (globalThis as any).__storageType || undefined;

type CaptureProps = Record<string, any>;
type AnalyticsCtx = {
  capture: (event: string, props?: CaptureProps) => void;
  optOut: boolean;
  setOptOut: (v: boolean) => void;
  userId: string | null;
};

const AnalyticsContext = createContext<AnalyticsCtx | null>(null);

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error("useAnalytics must be used within <AnalyticsProvider/>");
  return ctx;
}

// If you still want to honor PostHog Core SDK opt-out when it exists, make it optional:
function tryPosthogOptOut() {
  try {
    const ph = (globalThis as any).posthog;
    if (ph?.opt_out_capturing) ph.opt_out_capturing();
  } catch {}
}
function tryPosthogOptIn() {
  try {
    const ph = (globalThis as any).posthog;
    if (ph?.opt_in_capturing) ph.opt_in_capturing();
  } catch {}
}

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { route } = useAuthenticator((ctx) => [ctx.route]);
  const [userId, setUserId] = useState<string | null>(null);

  // Safer initializer for localStorage reads
  const [optOut, setOptOutState] = useState<boolean>(() => {
    try {
      return globalThis?.localStorage?.getItem(OPT_OUT_KEY) === "true";
    } catch {
      return false;
    }
  });

  const setOptOut = useCallback((v: boolean) => {
    setOptOutState(v);
    try {
      globalThis?.localStorage?.setItem(OPT_OUT_KEY, String(v));
    } catch {}
    // Only attempt PostHog core SDK toggles if it exists; phLite doesn’t need this
    if (v) {
      tryPosthogOptOut();
    } else {
      tryPosthogOptIn();
    }
  }, []);

  // No-op for phLite; keep in case you later swap implementations
  useEffect(() => {
    if (optOut) tryPosthogOptOut();
    // never let analytics init block rendering
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Identify / reset based on auth route
  useEffect(() => {
    let mounted = true;

    async function wireIdentity() {
      if (route !== "authenticated") {
        setUserId(null);
        phReset(); // safe no-op in your lite client
        return;
      }
      try {
        const { tokens } = await fetchAuthSession();
        const sub = tokens?.idToken?.payload?.sub as string | undefined;
        if (!sub) return;

        if (!optOut) {
          phIdentify(sub, { surface: SURFACE, ...(STORAGE_TYPE ? { storageType: STORAGE_TYPE } : {}) });
          phCapture("login", { surface: SURFACE });
        }
        if (mounted) setUserId(sub);
      } catch {
        // swallow; analytics must never break UX/tests
      }
    }

    wireIdentity();
    return () => { mounted = false; };
  }, [route, optOut]);

  // Heartbeat (skip in tests to reduce flake)
  const hbRef = useRef<number | null>(null);
  const sendHeartbeat = useCallback(() => {
    if (optOut || !userId) return;
    phCapture("active_ping", { surface: SURFACE });
  }, [optOut, userId]);

  useEffect(() => {
    // Don’t wire timers in tests or non-window environments
    const isTest = typeof process !== "undefined" && process.env?.NODE_ENV === "test";
    if (isTest || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    function onFocus() {
      sendHeartbeat();
      if (hbRef.current) window.clearInterval(hbRef.current);
      hbRef.current = window.setInterval(sendHeartbeat, HEARTBEAT_MS);
    }
    function onBlur() {
      if (hbRef.current) {
        window.clearInterval(hbRef.current);
        hbRef.current = null;
      }
    }

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    if (document.hasFocus()) onFocus();

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      onBlur();
    };
  }, [sendHeartbeat]);

  const capture = useCallback((event: string, props: CaptureProps = {}) => {
    if (optOut) return;
    phCapture(event, props);
  }, [optOut]);

  const value = useMemo<AnalyticsCtx>(() => ({
    capture,
    optOut,
    setOptOut,
    userId,
  }), [capture, optOut, setOptOut, userId]);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}
