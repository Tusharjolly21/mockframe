(async () => {
  const id = new URL(location.href).searchParams.get("mf_capture");
  if (!id) return;
  const key = `capture:${id}`;
  const result = await chrome.storage.local.get(key);
  const payload = result[key];
  if (!payload?.dataUrl || Date.now() - payload.createdAt > 10 * 60 * 1000) return;
  let attempts = 0;
  const message = { source: "mockframe-extension", type: "capture", id, dataUrl: payload.dataUrl, name: `${payload.title || "Website capture"}.png` };
  const timer = setInterval(() => {
    attempts += 1;
    window.postMessage(message, location.origin);
    if (attempts >= 40) clearInterval(timer);
  }, 500);
  window.postMessage(message, location.origin);
  window.addEventListener("message", async (event) => {
    if (event.origin !== location.origin || event.data?.source !== "mockframe-page" || event.data?.type !== "capture-accepted" || event.data?.id !== id) return;
    clearInterval(timer);
    await chrome.storage.local.remove(key);
  });
})();
