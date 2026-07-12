"use client";

/**
 * Fetch a real GitHub contribution graph by username (PostSpark's
 * /github-contributions parity). Uses the public CORS-enabled
 * github-contributions API (GitHub's own GraphQL requires auth).
 * Returns the fields to merge into a GithubDoc: painted `cells` (53×7
 * column-major, levels 0–4) + the formatted contribution total.
 */

interface ApiDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const COLS = 53;
const ROWS = 7;

export async function fetchGithubContributions(
  username: string
): Promise<{ cells: number[]; contributions: string; login: string }> {
  const user = username.trim().replace(/^@/, "");
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(user)) throw new Error("Enter a valid GitHub username");

  const r = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`);
  if (r.status === 404) throw new Error(`No GitHub user "${user}"`);
  if (!r.ok) throw new Error("GitHub fetch failed — try again");
  const data = (await r.json()) as { total?: Record<string, number>; contributions?: ApiDay[] };
  const days = data.contributions ?? [];
  if (!days.length) throw new Error("No contribution data found");

  // column-major 53×7 grid; align the first day to its real weekday row
  const cells = new Array<number>(COLS * ROWS).fill(0);
  const offset = new Date(days[0].date + "T12:00:00Z").getUTCDay(); // 0 = Sunday = row 0
  for (let i = 0; i < days.length; i++) {
    const idx = offset + i;
    if (idx >= COLS * ROWS) break;
    const col = Math.floor(idx / ROWS);
    const row = idx % ROWS;
    cells[col * ROWS + row] = days[i].level;
  }

  const total = data.total?.lastYear ?? days.reduce((n, d) => n + d.count, 0);
  return { cells, contributions: total.toLocaleString("en-US"), login: user };
}
