const button = document.querySelector("#capture");
const status = document.querySelector("#status");

async function capture() {
  button.disabled = true;
  status.textContent = "Capturing this tab...";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ [`capture:${id}`]: { dataUrl, title: tab.title || "Website capture", createdAt: Date.now() } });
    status.textContent = "Opening MockFrame...";
    await chrome.tabs.create({ url: `https://mockframe.app/editor?mf_capture=${encodeURIComponent(id)}` });
    window.close();
  } catch (error) {
    status.textContent = error?.message || "Could not capture this tab.";
    button.disabled = false;
  }
}

button.addEventListener("click", capture);
