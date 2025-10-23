import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { phCapture, phIdentify, phReset } from "@/analytics/phLite";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth";

// ---- config ----
const PH_KEY  = import.meta.env.VITE_POSTHOG_KEY as string;
const PH_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || "https://app.posthog.com";
const HEARTBEAT_MS = 60_000; // 1/min
const OPT_OUT_KEY = "mindful_ph_opt_out";   // localStorage boolean
const SURFACE = (globalThis as any).__surface || "popup"; // you already set this per surface
const STORAGE_TYPE = (globalThis as any).__storageType || undefined;

// ---- types / context ----
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

// ---- helper: init/load/reset ----
function initPostHogOnce() {
  // Nothing to init for the PostHog Lite client
}


function resetPostHog() {
  phReset();
}

// ---- provider ----
export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  // read auth state from Amplify
  const { route } = useAuthenticator((ctx) => [ctx.route]);
  const [userId, setUserId] = useState<string | null>(null);

  // opt-out state
  const [optOut, setOptOutState] = useState<boolean>(() => {
    return localStorage.getItem(OPT_OUT_KEY) === "true";
  });

  const setOptOut = useCallback((v: boolean) => {
    setOptOutState(v);
    localStorage.setItem(OPT_OUT_KEY, String(v));
    if (v) {
      posthog.opt_out_capturing();
    } else {
      posthog.opt_in_capturing();
    }
  }, []);

  // init PH once
  useEffect(() => {
    initPostHogOnce();
    // apply persisted opt-out immediately
    if (optOut) posthog.opt_out_capturing();
  }, []); // eslint-disable-line

  // identify on sign-in; reset on sign-out
  useEffect(() => {
    let mounted = true;

    async function wireIdentity() {
      if (route !== "authenticated") {
        setUserId(null);
        resetPostHog();
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
        // swallow; analytics should never break UX
      }
    }

    wireIdentity();
    return () => { mounted = false; };
  }, [route, optOut]);

  // heartbeat while focused (<=1/min)
  const hbRef = useRef<number | null>(null);
  const sendHeartbeat = useCallback(() => {
    if (optOut || !userId) return;
    phCapture("active_ping", { surface: SURFACE });
  }, [optOut, userId]);

  useEffect(() => {
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
    // start if already focused
    if (document.hasFocus()) onFocus();
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      onBlur();
    };
  }, [sendHeartbeat]);

  // simple capture wrapper
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

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}
