/* Platform chrome + icon expansion for the sample screens.
   <i data-i="name" style="font-size:20px"></i> → a lucide stroke icon. */
(function () {
  const p = new URLSearchParams(location.search).get("p") === "android" ? "android" : "ios";
  document.documentElement.dataset.p = p;

  function svg(name, stroke) {
    const body = (window.ICONS || {})[name];
    if (!body) return "";
    return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  }

  function statusBar() {
    const bars = `<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>`;
    const wifi = `<svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.6c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8.5.9 10.2 10.2 0 0 0 1.3 3.8L2.5 5a8.5 8.5 0 0 1 6-2.4Zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2a6.9 6.9 0 0 0-9.6 0l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Zm0 3.4c-.5 0-1 .2-1.3.5L8.5 11.2l1.3-1.3c-.3-.3-.8-.5-1.3-.5Z"/></svg>`;
    const bat = `<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".38"/><rect x="2" y="2" width="18" height="9" rx="2.2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" fill="currentColor" fill-opacity=".4"/></svg>`;
    if (p === "android") {
      const sig = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M13 1v12H1z"/></svg>`;
      const wf = `<svg width="16" height="14" viewBox="0 0 16 14" fill="currentColor"><path d="M8 13 0 4.3A12 12 0 0 1 16 4.3Z"/></svg>`;
      const ab = `<svg width="9" height="15" viewBox="0 0 9 15"><rect x="2.5" y="0" width="4" height="2" rx=".6" fill="currentColor"/><rect x=".6" y="1.6" width="7.8" height="12.8" rx="1.8" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.2"/><rect x="1.9" y="4" width="5.2" height="9.2" rx="1" fill="currentColor"/></svg>`;
      return `<div class="sb android"><span>9:41</span><span class="icons">${wf}${sig}${ab}</span></div>`;
    }
    return `<div class="sb ios"><span class="time">9:41</span><span class="icons">${bars}${wifi}${bat}</span></div>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.body.insertAdjacentHTML("afterbegin", statusBar());
    if (!document.body.hasAttribute("data-nohome")) document.body.insertAdjacentHTML("beforeend", `<div class="home"></div>`);
    document.querySelectorAll("i[data-i]").forEach((el) => {
      el.outerHTML = svg(el.dataset.i, el.dataset.s || 2).replace("<svg ", `<svg style="${el.getAttribute("style") || ""}" `);
    });
  });
})();
