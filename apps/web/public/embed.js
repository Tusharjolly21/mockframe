(function () {
  class MockFrameEditor extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: "open" });
      const origin = this.getAttribute("origin") || "https://mockframe.app";
      const height = this.getAttribute("height") || "720px";
      const frame = document.createElement("iframe");
      frame.src = `${origin.replace(/\/$/, "")}/embed/editor`;
      frame.title = this.getAttribute("title") || "MockFrame screenshot editor";
      frame.allow = "clipboard-read; clipboard-write";
      frame.style.cssText = `display:block;width:100%;height:${height};border:0;border-radius:8px;background:#eef0f6`;
      root.append(frame);
      window.addEventListener("message", (event) => {
        if (event.source !== frame.contentWindow || event.origin !== new URL(origin).origin) return;
        if (event.data?.source === "mockframe" && event.data?.type === "ready") {
          this.dispatchEvent(new CustomEvent("mockframe-ready", { bubbles: true, composed: true }));
        }
      });
    }
  }
  if (!customElements.get("mockframe-editor")) customElements.define("mockframe-editor", MockFrameEditor);
})();
