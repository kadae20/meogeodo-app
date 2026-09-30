const DEFAULT_ORIGIN = "http://localhost:3000";

async function appOrigin() {
  const { appOrigin } = await chrome.storage.sync.get("appOrigin");
  return String(appOrigin || DEFAULT_ORIGIN).replace(/\/$/, "");
}

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

async function fetchDetailImages(urls) {
  const images = [];
  for (const url of (urls || []).slice(0, 2)) {
    try {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) continue;
      const ctype = (res.headers.get("content-type") || "").split(";")[0];
      const media =
        ctype === "image/png" ||
        ctype === "image/webp" ||
        ctype === "image/gif" ||
        ctype === "image/jpeg"
          ? ctype
          : "image/jpeg";
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 2000 || buf.byteLength > 4_500_000) continue;
      images.push({ image_base64: bufToB64(buf), media_type: media });
    } catch {
      /* skip */
    }
  }
  return images;
}

async function cookieHeader(origin) {
  const cookies = await chrome.cookies.getAll({ url: origin });
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function api(path, options = {}) {
  const { timeoutMs = 18000, ...fetchOpts } = options;
  const origin = await appOrigin();
  const headers = {
    Accept: "application/json",
    ...(fetchOpts.body ? { "Content-Type": "application/json" } : {}),
    ...(fetchOpts.headers || {}),
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${origin}${path}`, {
      ...fetchOpts,
      headers,
      credentials: "include",
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      const cookie = await cookieHeader(origin);
      if (cookie && !headers.Cookie) {
        const retry = await fetch(`${origin}${path}`, {
          ...fetchOpts,
          headers: { ...headers, Cookie: cookie },
          signal: AbortSignal.timeout(timeoutMs),
        });
        const retryData = await retry.json().catch(() => ({}));
        return { ok: retry.ok, status: retry.status, data: retryData, origin };
      }
    }
    return { ok: res.ok, status: res.status, data, origin };
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "frame-text") {
    const tabId = sender.tab?.id;
    if (tabId != null) {
      chrome.tabs.sendMessage(tabId, { type: "frame-text", text: msg.text }).catch(() => {});
    }
    return;
  }
  if (msg?.type === "peek") {
    (async () => {
      try {
        const payload = { ...msg.payload };
        if (payload.image_urls?.length && !payload.images?.length) {
          payload.images = await fetchDetailImages(payload.image_urls);
          delete payload.image_urls;
        }
        sendResponse(
          await api("/api/extension/peek", {
            method: "POST",
            body: JSON.stringify(payload),
            timeoutMs: payload.images?.length ? 50000 : 15000,
          })
        );
      } catch (err) {
        const origin = await appOrigin().catch(() => "http://localhost:3000");
        sendResponse({
          ok: false,
          status: 0,
          origin,
          data: { error: err instanceof Error ? err.message : "peek failed" },
        });
      }
    })();
    return true;
  }
  if (msg?.type === "me") {
    api("/api/extension/me").then(sendResponse);
    return true;
  }
  if (msg?.type === "origin") {
    appOrigin().then((origin) => sendResponse({ origin }));
    return true;
  }
});
