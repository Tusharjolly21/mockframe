import { describe, expect, it } from "vitest";
import { extractSiteCopy } from "../extract";

/** Realistic ~40-line landing page: og tags, nav noise, script/style blocks,
 *  an h1, and five paragraphs (one short, one duplicate-in-script, three
 *  qualifying, plus a trailing one that should be dropped by the 3-cap). */
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Wildlist — Track birds, share sightings</title>
<meta name="description" content="Wildlist helps birders log every sighting and build a shareable life list in seconds.">
<meta property="og:site_name" content="Wildlist">
<meta property="og:title" content="Wildlist — Track birds, share sightings">
<meta property="og:description" content="Log sightings and connect with birders.">
<style>
  body { font-family: sans-serif; }
  .hero { background: url(hero.png); }
</style>
<script>
  window.dataLayer = window.dataLayer || [];
  var fakeMarkup = "<p>This fake paragraph lives inside a script tag and must never appear in output.</p>";
</script>
</head>
<body>
<nav>
  <a href="/features">Features</a>
  <a href="/pricing">Pricing</a>
  <a href="/login">Log in</a>
</nav>
<header class="hero">
  <h1>Every sighting tells a story</h1>
  <p>Short intro.</p>
  <p>Wildlist turns every walk into a chance to discover something new in the field.</p>
  <p>Track your favorite species across seasons and compare notes with your community.</p>
  <p>Export your life list any time and keep every sighting backed up in the cloud.</p>
  <p>Get started free today with just one tap.</p>
</header>
<footer>
  <p>&copy; 2026 Wildlist Inc.</p>
</footer>
</body>
</html>`;

describe("extractSiteCopy — realistic landing page", () => {
  it("extracts appName from og:site_name and assembles description from meta desc + h1 + first 3 long paragraphs", () => {
    const result = extractSiteCopy(LANDING_HTML, "https://www.wildlist.app/");
    expect(result.appName).toBe("Wildlist");
    expect(result.description).toBe(
      "Wildlist helps birders log every sighting and build a shareable life list in seconds. " +
        "Every sighting tells a story " +
        "Wildlist turns every walk into a chance to discover something new in the field. " +
        "Track your favorite species across seasons and compare notes with your community. " +
        "Export your life list any time and keep every sighting backed up in the cloud."
    );
    // never leaks script/style content
    expect(result.description).not.toMatch(/fake paragraph|dataLayer|font-family/);
  });
});

describe("extractSiteCopy — appName priority chain", () => {
  it("falls back to og:title (with separator stripped) when og:site_name is absent", () => {
    const html = `<html><head><meta property="og:title" content="Foo App — Do more"></head><body></body></html>`;
    const result = extractSiteCopy(html, "https://foo.example/");
    expect(result.appName).toBe("Foo App");
  });

  it("falls back to <title> when both og:site_name and og:title are absent", () => {
    const html = `<html><head><title>Bar App | Simple tasks</title></head><body></body></html>`;
    const result = extractSiteCopy(html, "https://bar.example/");
    expect(result.appName).toBe("Bar App");
  });

  it("prefers og:site_name over og:title and <title> when all are present", () => {
    const html = `<html><head>
      <title>Title Tag App</title>
      <meta property="og:title" content="OG Title App">
      <meta property="og:site_name" content="Site Name App">
    </head><body></body></html>`;
    const result = extractSiteCopy(html, "https://x.example/");
    expect(result.appName).toBe("Site Name App");
  });

  it("falls back to the URL hostname (no www.) when no name source is present", () => {
    const html = `<html><head></head><body></body></html>`;
    const result = extractSiteCopy(html, "https://www.example.com/some/path");
    expect(result).toEqual({ appName: "example.com", description: "" });
  });
});

describe("extractSiteCopy — appName separator stripping", () => {
  it("strips a trailing em-dash separator", () => {
    const html = `<html><head><title>MyApp — Tagline goes here</title></head><body></body></html>`;
    expect(extractSiteCopy(html, "https://a.example/").appName).toBe("MyApp");
  });

  it("strips a trailing pipe separator", () => {
    const html = `<html><head><title>MyApp | Tagline goes here</title></head><body></body></html>`;
    expect(extractSiteCopy(html, "https://a.example/").appName).toBe("MyApp");
  });

  it("strips a trailing hyphen separator", () => {
    const html = `<html><head><title>MyApp - Tagline goes here</title></head><body></body></html>`;
    expect(extractSiteCopy(html, "https://a.example/").appName).toBe("MyApp");
  });

  it("only strips from the first separator, and leaves hyphenated words alone", () => {
    const html = `<html><head><title>Well-Known App - Tagline - Extra</title></head><body></body></html>`;
    expect(extractSiteCopy(html, "https://a.example/").appName).toBe("Well-Known App");
  });
});

describe("extractSiteCopy — appName decoding, trimming, and capping", () => {
  it("decodes entities and strips separators together, in the right order", () => {
    const html = `<html><head><title>Tom &amp; Jerry — Cartoon App</title></head><body></body></html>`;
    expect(extractSiteCopy(html, "https://a.example/").appName).toBe("Tom & Jerry");
  });

  it("decodes &#39; entities", () => {
    const html = `<html><head><title>Rock &#39;n&#39; Roll</title></head><body></body></html>`;
    expect(extractSiteCopy(html, "https://a.example/").appName).toBe("Rock 'n' Roll");
  });

  it("trims whitespace and caps at 60 chars", () => {
    const longName = "A".repeat(80);
    const html = `<html><head><title>   ${longName}   </title></head><body></body></html>`;
    const result = extractSiteCopy(html, "https://a.example/");
    expect(result.appName).toBe("A".repeat(60));
    expect(result.appName.length).toBe(60);
  });
});

describe("extractSiteCopy — description source selection", () => {
  it("prefers meta description when it is longer than og:description", () => {
    const html = `<html><head>
      <meta name="description" content="This is a long meta description that definitely wins over the og description.">
      <meta property="og:description" content="Short og desc.">
    </head><body></body></html>`;
    const result = extractSiteCopy(html, "https://a.example/");
    expect(result.description).toBe("This is a long meta description that definitely wins over the og description.");
  });

  it("prefers og:description when it is longer than meta description", () => {
    const html = `<html><head>
      <meta name="description" content="Short meta desc.">
      <meta property="og:description" content="This is a considerably longer open graph description for testing purposes.">
    </head><body></body></html>`;
    const result = extractSiteCopy(html, "https://a.example/");
    expect(result.description).toBe("This is a considerably longer open graph description for testing purposes.");
  });

  it("uses og:description alone when meta description is absent", () => {
    const html = `<html><head><meta property="og:description" content="Only the og description exists here."></head><body></body></html>`;
    expect(extractSiteCopy(html, "https://a.example/").description).toBe("Only the og description exists here.");
  });
});

describe("extractSiteCopy — paragraph collection", () => {
  it("skips paragraphs of 40 chars or fewer and caps at the first 3 qualifying ones", () => {
    const html = `<html><body>
      <p>Too short.</p>
      <p>Alpha paragraph with enough characters to pass the forty character minimum length easily.</p>
      <p>Bravo paragraph with enough characters to pass the forty character minimum length nicely.</p>
      <p>Charlie paragraph with enough characters to pass the forty character minimum length well.</p>
      <p>Delta paragraph with enough characters to pass the forty character minimum length surely.</p>
    </body></html>`;
    const result = extractSiteCopy(html, "https://a.example/");
    expect(result.description).toBe(
      "Alpha paragraph with enough characters to pass the forty character minimum length easily. " +
        "Bravo paragraph with enough characters to pass the forty character minimum length nicely. " +
        "Charlie paragraph with enough characters to pass the forty character minimum length well."
    );
  });

  it("dedupes an exact-duplicate paragraph without consuming a slot in the 3-cap", () => {
    const html = `<html><body>
      <p>Alpha paragraph with enough characters to pass the forty character minimum length easily.</p>
      <p>Alpha paragraph with enough characters to pass the forty character minimum length easily.</p>
      <p>Bravo paragraph with enough characters to pass the forty character minimum length nicely.</p>
      <p>Charlie paragraph with enough characters to pass the forty character minimum length well.</p>
      <p>Delta paragraph with enough characters to pass the forty character minimum length surely.</p>
    </body></html>`;
    const result = extractSiteCopy(html, "https://a.example/");
    expect(result.description).toBe(
      "Alpha paragraph with enough characters to pass the forty character minimum length easily. " +
        "Bravo paragraph with enough characters to pass the forty character minimum length nicely. " +
        "Charlie paragraph with enough characters to pass the forty character minimum length well."
    );
  });

  it("does not append the h1 when it is already a substring of the accumulated text", () => {
    const html = `<html><head>
      <meta name="description" content="Foo App is the fastest way to Manage tasks with ease across distributed teams everywhere.">
    </head><body>
      <h1>Manage tasks with ease</h1>
      <p>Foo App integrates with your calendar, email, and chat tools so nothing falls through the cracks.</p>
    </body></html>`;
    const result = extractSiteCopy(html, "https://a.example/");
    expect(result.description).toBe(
      "Foo App is the fastest way to Manage tasks with ease across distributed teams everywhere. " +
        "Foo App integrates with your calendar, email, and chat tools so nothing falls through the cracks."
    );
  });
});

describe("extractSiteCopy — decoding and whitespace collapse in description", () => {
  it("decodes entities inside paragraphs and h1", () => {
    const html = `<html><body><p>Tom &amp; Jerry&#39;s &quot;Great&quot; App &lt;beta&gt;&nbsp;now live for everyone.</p></body></html>`;
    const result = extractSiteCopy(html, "https://a.example/");
    expect(result.description).toBe(`Tom & Jerry's "Great" App <beta> now live for everyone.`);
  });

  it("collapses newlines/tabs and strips nested inline tags with a space, not a join", () => {
    const html = `<html><body><p>This paragraph has\n    a line break and <strong>bold</strong> text embedded right in the middle of it for testing purposes.</p></body></html>`;
    const result = extractSiteCopy(html, "https://a.example/");
    expect(result.description).toBe(
      "This paragraph has a line break and bold text embedded right in the middle of it for testing purposes."
    );
  });
});

describe("extractSiteCopy — 600 char cap", () => {
  it("caps description at 600 chars", () => {
    const longDesc = "x".repeat(700);
    const html = `<html><head><meta name="description" content="${longDesc}"></head><body></body></html>`;
    const result = extractSiteCopy(html, "https://a.example/");
    expect(result.description.length).toBe(600);
    expect(result.description).toBe(longDesc.slice(0, 600));
  });
});

describe("extractSiteCopy — robustness", () => {
  it("handles content attribute appearing before the property attribute", () => {
    const html = `<html><head><meta content="Reordered App" property="og:site_name"></head><body></body></html>`;
    expect(extractSiteCopy(html, "https://a.example/").appName).toBe("Reordered App");
  });

  it("handles single-quoted attributes", () => {
    const html = `<html><head><meta name='description' content='This single quoted description is definitely long enough to use.'></head><body></body></html>`;
    expect(extractSiteCopy(html, "https://a.example/").description).toBe(
      "This single quoted description is definitely long enough to use."
    );
  });

  it("handles uppercase tag and attribute names", () => {
    const html = `<HTML><HEAD><TITLE>Uppercase App</TITLE></HEAD><BODY><H1>Big Heading Text Right Here</H1><P>Uppercase paragraph tag with enough characters to clear the forty char bar.</P></BODY></HTML>`;
    const result = extractSiteCopy(html, "https://a.example/");
    expect(result.appName).toBe("Uppercase App");
    expect(result.description).toBe(
      "Big Heading Text Right Here Uppercase paragraph tag with enough characters to clear the forty char bar."
    );
  });

  it("never throws on malformed/unclosed tags and degrades gracefully", () => {
    const html = `<html><head><title>Broken App</head><body><h1>Oops no closing<p>Paragraph text that is definitely long enough to pass forty chars easily.</p></body></html>`;
    let result: { appName: string; description: string } | undefined;
    expect(() => {
      result = extractSiteCopy(html, "https://broken.example/");
    }).not.toThrow();
    expect(typeof result!.appName).toBe("string");
    expect(typeof result!.description).toBe("string");
    // <title> never closes, so no name source is found -> hostname fallback
    expect(result!.appName).toBe("broken.example");
    // <p> is well-formed even though <h1> isn't, so it's still picked up
    expect(result!.description).toBe("Paragraph text that is definitely long enough to pass forty chars easily.");
  });

  it("never throws on totally garbled markup", () => {
    const html = `<<<>>>not really html<div class=unterminated and weird "quotes' everywhere`;
    let result: { appName: string; description: string } | undefined;
    expect(() => {
      result = extractSiteCopy(html, "https://garbled.example/");
    }).not.toThrow();
    expect(typeof result!.appName).toBe("string");
    expect(typeof result!.description).toBe("string");
  });

  it("returns hostname/empty description for empty html", () => {
    expect(extractSiteCopy("", "https://www.example.com/page")).toEqual({
      appName: "example.com",
      description: "",
    });
  });
});
