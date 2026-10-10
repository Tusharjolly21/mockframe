import type { PromoScreenshot } from "./inputProps";

/**
 * Brand-neutral sample app screens for showcasing the promo templates (the
 * /templates/video gallery and its posters). Each is an inline SVG tinted with
 * the preview's accent colour, so the demo reads as "your app" in any colour
 * without shipping or licensing real product screenshots.
 */

const FONT = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Escape text for an SVG/XML text node — a bare "&" would invalidate the image. */
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svgShot(svg: string, width: number, height: number): PromoScreenshot {
  return { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, width, height };
}

/** A smooth area-chart path through the given 0..1 values. */
function areaPath(values: number[], x: number, y: number, w: number, h: number): { line: string; area: string } {
  const pts = values.map((v, i) => [x + (i / (values.length - 1)) * w, y + h - v * h] as const);
  let line = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const mx = (px + cx) / 2;
    line += ` C${mx} ${py} ${mx} ${cy} ${cx} ${cy}`;
  }
  const area = `${line} L${x + w} ${y + h} L${x} ${y + h} Z`;
  return { line, area };
}

/** Desktop analytics dashboard, 1600×1000 — laptops and tablets. */
export function demoDashboard(accent: string): PromoScreenshot {
  const W = 1600;
  const H = 1000;
  const chart = areaPath([0.32, 0.4, 0.36, 0.5, 0.46, 0.58, 0.55, 0.7, 0.66, 0.78, 0.74, 0.9], 400, 330, 760, 300);
  const bars = [0.45, 0.7, 0.55, 0.85, 0.62, 0.95, 0.75];
  const kpis = [
    ["Revenue", "$128.4k", "+18.2%"],
    ["Active users", "24,931", "+9.6%"],
    ["Conversion", "4.82%", "+1.1%"],
    ["Avg. session", "6m 12s", "+12%"],
  ];
  const rows = [
    ["Aurora Labs", "Enterprise", "$12,400", "Paid"],
    ["Northwind", "Team", "$3,180", "Paid"],
    ["Lumen Studio", "Pro", "$990", "Pending"],
    ["Kite & Co", "Team", "$2,460", "Paid"],
  ];
  const nav = ["Overview", "Analytics", "Customers", "Revenue", "Reports", "Settings"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<defs>
<linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity=".45"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity=".55"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="#0b0c11"/>
<rect width="300" height="${H}" fill="#101119"/>
<rect x="36" y="40" width="40" height="40" rx="12" fill="url(#b)"/>
<text x="92" y="68" font-size="22" font-weight="700" fill="#fff">Pulse</text>
${nav.map((n, i) => `<rect x="24" y="${130 + i * 56}" width="252" height="44" rx="12" fill="${i === 0 ? accent : "transparent"}" fill-opacity="${i === 0 ? 0.16 : 0}"/><rect x="44" y="${145 + i * 56}" width="14" height="14" rx="4" fill="${i === 0 ? accent : "#3a3d4a"}"/><text x="72" y="${158 + i * 56}" font-size="16" font-weight="${i === 0 ? 600 : 500}" fill="${i === 0 ? "#fff" : "#8a8d9a"}">${esc(n)}</text>`).join("")}
<rect x="24" y="${H - 120}" width="252" height="88" rx="16" fill="${accent}" fill-opacity=".12" stroke="${accent}" stroke-opacity=".35"/>
<text x="44" y="${H - 82}" font-size="15" font-weight="700" fill="#fff">Upgrade to Pro</text>
<text x="44" y="${H - 58}" font-size="13" fill="#9a9dab">Unlock every report</text>
<text x="340" y="80" font-size="30" font-weight="700" fill="#fff">Good morning, Alex</text>
<text x="340" y="112" font-size="16" fill="#7d8090">Here is how your product performed this week.</text>
<rect x="1180" y="52" width="380" height="48" rx="14" fill="#161722" stroke="#262838"/>
<text x="1204" y="82" font-size="15" fill="#6c6f7e">Search reports…</text>
${kpis.map(([k, v, d], i) => `<rect x="${340 + i * 310}" y="150" width="290" height="140" rx="20" fill="#13141d" stroke="#222433"/><text x="${364 + i * 310}" y="190" font-size="15" fill="#868999">${esc(k)}</text><text x="${364 + i * 310}" y="238" font-size="34" font-weight="700" fill="#fff">${esc(v)}</text><rect x="${364 + i * 310}" y="254" width="74" height="24" rx="12" fill="#22c55e" fill-opacity=".15"/><text x="${374 + i * 310}" y="271" font-size="13" font-weight="600" fill="#4ade80">${esc(d)}</text>`).join("")}
<rect x="340" y="310" width="880" height="380" rx="22" fill="#13141d" stroke="#222433"/>
<text x="370" y="352" font-size="18" font-weight="600" fill="#fff">Revenue growth</text>
${[0, 1, 2, 3].map((i) => `<line x1="400" x2="1160" y1="${380 + i * 80}" y2="${380 + i * 80}" stroke="#20222f"/>`).join("")}
<path d="${chart.area}" fill="url(#a)"/>
<path d="${chart.line}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
<circle cx="1160" cy="360" r="9" fill="${accent}" stroke="#fff" stroke-width="3"/>
<rect x="1240" y="310" width="320" height="380" rx="22" fill="#13141d" stroke="#222433"/>
<text x="1270" y="352" font-size="18" font-weight="600" fill="#fff">Weekly signups</text>
${bars.map((b, i) => `<rect x="${1272 + i * 40}" y="${650 - b * 240}" width="24" height="${b * 240}" rx="8" fill="${i === 5 ? accent : "#2b2e40"}"/>`).join("")}
<rect x="340" y="710" width="1220" height="250" rx="22" fill="#13141d" stroke="#222433"/>
<text x="370" y="752" font-size="18" font-weight="600" fill="#fff">Recent customers</text>
${rows.map(([n, p, a, s], i) => `<circle cx="388" cy="${798 + i * 42}" r="14" fill="${accent}" fill-opacity="${0.25 + i * 0.15}"/><text x="416" y="${804 + i * 42}" font-size="15" font-weight="600" fill="#e4e5ea">${esc(n)}</text><text x="760" y="${804 + i * 42}" font-size="15" fill="#868999">${esc(p)}</text><text x="1060" y="${804 + i * 42}" font-size="15" font-weight="600" fill="#e4e5ea">${esc(a)}</text><rect x="1380" y="${786 + i * 42}" width="${s === "Paid" ? 64 : 84}" height="26" rx="13" fill="${s === "Paid" ? "#22c55e" : "#f59e0b"}" fill-opacity=".15"/><text x="1394" y="${804 + i * 42}" font-size="13" font-weight="600" fill="${s === "Paid" ? "#4ade80" : "#fbbf24"}">${esc(s)}</text>`).join("")}
</svg>`;
  return svgShot(svg, W, H);
}

/** Phone home screen (finance-style), 440×956. */
export function demoPhoneHome(accent: string): PromoScreenshot {
  const W = 440;
  const H = 956;
  const chart = areaPath([0.3, 0.42, 0.38, 0.55, 0.5, 0.68, 0.62, 0.8, 0.92], 40, 430, 360, 120);
  const tx = [
    ["Design subscription", "Today", "-$24.00"],
    ["Client payment", "Yesterday", "+$1,250.00"],
    ["Coffee & co.", "Mon", "-$6.40"],
    ["Cloud hosting", "Sun", "-$48.00"],
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<defs>
<linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#1b1035"/></linearGradient>
<linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity=".4"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="#0b0c11"/>
<text x="28" y="40" font-size="16" font-weight="600" fill="#fff">9:41</text>
<text x="28" y="112" font-size="16" fill="#8a8d9a">Welcome back</text>
<text x="28" y="146" font-size="30" font-weight="700" fill="#fff">Alex Morgan</text>
<circle cx="398" cy="128" r="22" fill="${accent}" fill-opacity=".3"/>
<rect x="24" y="180" width="392" height="210" rx="28" fill="url(#c)"/>
<circle cx="380" cy="200" r="90" fill="#fff" fill-opacity=".07"/>
<text x="52" y="230" font-size="15" fill="#fff" fill-opacity=".75">Total balance</text>
<text x="52" y="282" font-size="44" font-weight="800" fill="#fff">$24,560</text>
<text x="52" y="352" font-size="15" fill="#fff" fill-opacity=".75">•••• 4821</text>
<rect x="300" y="330" width="88" height="34" rx="17" fill="#fff" fill-opacity=".2"/>
<text x="318" y="352" font-size="14" font-weight="700" fill="#fff">+12.4%</text>
<path d="${chart.area}" fill="url(#a)"/>
<path d="${chart.line}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
<text x="28" y="600" font-size="19" font-weight="700" fill="#fff">Recent activity</text>
${tx.map(([n, d, a], i) => `<rect x="24" y="${622 + i * 66}" width="392" height="56" rx="16" fill="#13141d"/><rect x="38" y="${634 + i * 66}" width="32" height="32" rx="10" fill="${accent}" fill-opacity="${0.2 + i * 0.12}"/><text x="84" y="${648 + i * 66}" font-size="15" font-weight="600" fill="#eceef3">${esc(n)}</text><text x="84" y="${668 + i * 66}" font-size="13" fill="#7d8090">${esc(d)}</text><text x="402" y="${656 + i * 66}" font-size="15" font-weight="700" text-anchor="end" fill="${a.startsWith("+") ? "#4ade80" : "#eceef3"}">${esc(a)}</text>`).join("")}
<rect x="24" y="${H - 86}" width="392" height="64" rx="32" fill="#161722"/>
${[0, 1, 2, 3].map((i) => `<circle cx="${80 + i * 94}" cy="${H - 54}" r="${i === 0 ? 18 : 10}" fill="${i === 0 ? accent : "#3a3d4a"}"/>`).join("")}
</svg>`;
  return svgShot(svg, W, H);
}

/** Phone stats screen (activity rings + progress), 440×956. */
export function demoPhoneStats(accent: string): PromoScreenshot {
  const W = 440;
  const H = 956;
  const ring = (r: number, p: number, color: string, width: number) => {
    const c = 2 * Math.PI * r;
    return `<circle cx="220" cy="320" r="${r}" fill="none" stroke="${color}" stroke-opacity=".15" stroke-width="${width}"/><circle cx="220" cy="320" r="${r}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 220 320)"/>`;
  };
  const goals = [
    ["Focus time", "4h 20m", 0.82],
    ["Tasks done", "18 / 22", 0.72],
    ["Streak", "12 days", 0.95],
  ] as const;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<rect width="${W}" height="${H}" fill="#0b0c11"/>
<text x="28" y="40" font-size="16" font-weight="600" fill="#fff">9:41</text>
<text x="28" y="120" font-size="30" font-weight="700" fill="#fff">Today</text>
<text x="28" y="150" font-size="16" fill="#8a8d9a">You are ahead of your goal</text>
${ring(140, 0.78, accent, 26)}
${ring(106, 0.62, "#22d3ee", 26)}
${ring(72, 0.9, "#f472b6", 26)}
<text x="220" y="312" font-size="34" font-weight="800" text-anchor="middle" fill="#fff">86%</text>
<text x="220" y="340" font-size="14" text-anchor="middle" fill="#8a8d9a">daily score</text>
${goals.map(([n, v, p], i) => `<rect x="24" y="${510 + i * 104}" width="392" height="88" rx="22" fill="#13141d"/><text x="48" y="${546 + i * 104}" font-size="15" fill="#8a8d9a">${esc(n)}</text><text x="392" y="${546 + i * 104}" font-size="17" font-weight="700" text-anchor="end" fill="#fff">${esc(v)}</text><rect x="48" y="${566 + i * 104}" width="344" height="10" rx="5" fill="#262838"/><rect x="48" y="${566 + i * 104}" width="${344 * p}" height="10" rx="5" fill="${accent}"/>`).join("")}
<rect x="24" y="${H - 86}" width="392" height="64" rx="32" fill="#161722"/>
${[0, 1, 2, 3].map((i) => `<circle cx="${80 + i * 94}" cy="${H - 54}" r="${i === 1 ? 18 : 10}" fill="${i === 1 ? accent : "#3a3d4a"}"/>`).join("")}
</svg>`;
  return svgShot(svg, W, H);
}

/** Templates that place a laptop or tablet next to (or instead of) the phone. */
const MULTI_DEVICE = new Set(["abstract-stack", "everywhere"]);

/**
 * Demo screens suited to a template: phone-only spots get the two phone
 * screens, the desktop hero gets the dashboard, and multi-device spots get all
 * three (each device then picks the screen that fits its shape).
 */
export function demoScreensFor(templateId: string, accent: string): PromoScreenshot[] {
  if (templateId === "desktop-studio") return [demoDashboard(accent)];
  if (MULTI_DEVICE.has(templateId)) return [demoPhoneHome(accent), demoDashboard(accent), demoPhoneStats(accent)];
  return [demoPhoneHome(accent), demoPhoneStats(accent)];
}
