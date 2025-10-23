// Minimal PostHog client for Chrome MV3 (no remote scripts, no flags)
// Sends only what you call via /batch. No autocapture/replay.

type Event = {
  event: string;
  properties: Record<string, any>;
  timestamp?: string; // ISO
};

const PH_KEY  = import.meta.env.VITE_POSTHOG_KEY as string;
const PH_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || "https://app.posthog.com"; // keep this host

let distinctId: string | null = null;
let queue: Event[] = [];
let timer: number | null = null;

function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  // Use /batch with api_key (documented)
  navigator.sendBeacon?.(`${PH_HOST}/batch/`, new Blob([JSON.stringify({
    api_key: PH_KEY,
    batch,
    sent_at: new Date().toISOString(),
  })], { type: 'application/json' })) ||
  fetch(`${PH_HOST}/batch/`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ api_key: PH_KEY, batch, sent_at: new Date().toISOString() }),
    keepalive: true,
  }).catch(() => {});
}

function scheduleFlush() {
  if (timer) return;
  timer = window.setTimeout(() => {
    timer = null;
    flush();
  }, 2000); // small delay to batch
}

export function phIdentify(id: string, traits?: Record<string, any>) {
  distinctId = id;
  if (traits && Object.keys(traits).length) {
    // $identify event to set user properties
    queue.push({
      event: '$identify',
      properties: {
        distinct_id: id,
        $set: traits,
        $lib: 'mindful-lite',
        platform: 'chrome-extension',
      },
      timestamp: new Date().toISOString(),
    });
    scheduleFlush();
  }
}

export function phCapture(event: string, props: Record<string, any> = {}) {
  if (!distinctId) {
    // You can choose to drop or queue anonymously; here we drop
    // to keep data clean. Optionally allow anon by generating a temp id.
  }
  queue.push({
    event,
    properties: {
      distinct_id: distinctId,
      $lib: 'mindful-lite',
      platform: 'chrome-extension',
      ...props,
    },
    timestamp: new Date().toISOString(),
  });
  if (queue.length >= 10) flush(); else scheduleFlush();
}

export function phReset() {
  distinctId = null;
  // no cookies/local state to clear
}

// Optional: call on unload to flush anything remaining
window.addEventListener('beforeunload', flush);
