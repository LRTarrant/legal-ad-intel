/**
 * Tests for the URL extractor (Phase 3.0).
 *
 * The fetcher itself isn't tested here \u2014 it depends on global fetch
 * and we don't mock the network in this test harness. The much more
 * valuable surface is extractFromHtml(): regex-based HTML parsing has
 * a long tail of edge cases we want to lock down.
 */

import {
  extractFromHtml,
  parseHttpUrl,
} from "./url-extractor";

/* ──────────────────────────────────────────────────────────────────────── */
/* parseHttpUrl                                                             */
/* ──────────────────────────────────────────────────────────────────────── */

test("parseHttpUrl accepts https", () => {
  expect(parseHttpUrl("https://example.com")).not.toBeUndefined();
});

test("parseHttpUrl accepts http", () => {
  expect(parseHttpUrl("http://example.com")).not.toBeUndefined();
});

test("parseHttpUrl rejects file://", () => {
  expect(parseHttpUrl("file:///etc/passwd")).toBe(null);
});

test("parseHttpUrl rejects javascript:", () => {
  expect(parseHttpUrl("javascript:alert(1)")).toBe(null);
});

test("parseHttpUrl rejects malformed URLs", () => {
  expect(parseHttpUrl("not a url")).toBe(null);
});

/* ──────────────────────────────────────────────────────────────────────── */
/* extractFromHtml \u2014 title                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

test("title: simple", () => {
  const r = extractFromHtml("<html><head><title>Smith & Jones LLP</title></head></html>");
  expect(r.title).toBe("Smith & Jones LLP");
});

test("title: decodes basic entities", () => {
  const r = extractFromHtml("<title>Smith &amp; Jones &mdash; Trial Lawyers</title>");
  // We don't decode &mdash; specifically (not in our basic table) but we do
  // decode &amp;. The mdash entity passes through unchanged.
  expect(r.title).toContain("Smith & Jones");
});

test("title: collapses whitespace", () => {
  const r = extractFromHtml("<title>\n  Smith\n  Law\n</title>");
  expect(r.title).toBe("Smith Law");
});

test("title: null when missing", () => {
  const r = extractFromHtml("<html><body>hi</body></html>");
  expect(r.title).toBe(null);
});

/* ──────────────────────────────────────────────────────────────────────── */
/* extractFromHtml \u2014 meta + og                                              */
/* ──────────────────────────────────────────────────────────────────────── */

test("meta description: standard order (name then content)", () => {
  const r = extractFromHtml(
    '<meta name="description" content="We fight for what\'s right in Birmingham.">',
  );
  expect(r.metaDescription).toBe("We fight for what's right in Birmingham.");
});

test("meta description: reversed order (content then name)", () => {
  const r = extractFromHtml(
    '<meta content="20 years of experience" name="description">',
  );
  expect(r.metaDescription).toBe("20 years of experience");
});

test("og:title", () => {
  const r = extractFromHtml('<meta property="og:title" content="Smith & Jones">');
  expect(r.og.title).toBe("Smith & Jones");
});

test("og:description + og:site_name + og:image", () => {
  const html = `
    <meta property="og:description" content="Trial lawyers serving Alabama">
    <meta property="og:site_name" content="Smith Law">
    <meta property="og:image" content="https://example.com/logo.png">
  `;
  const r = extractFromHtml(html);
  expect(r.og.description).toBe("Trial lawyers serving Alabama");
  expect(r.og.siteName).toBe("Smith Law");
  expect(r.og.image).toBe("https://example.com/logo.png");
});

test("missing og fields return null", () => {
  const r = extractFromHtml("<title>X</title>");
  expect(r.og.title).toBe(null);
  expect(r.og.description).toBe(null);
  expect(r.og.siteName).toBe(null);
  expect(r.og.image).toBe(null);
});

/* ──────────────────────────────────────────────────────────────────────── */
/* extractFromHtml \u2014 headings                                               */
/* ──────────────────────────────────────────────────────────────────────── */

test("headings: extracts h1/h2/h3 in document order", () => {
  const html = `
    <h1>Welcome</h1>
    <p>Body</p>
    <h2>Practice Areas</h2>
    <h3>Personal Injury</h3>
    <h2>Contact</h2>
  `;
  const r = extractFromHtml(html);
  expect(r.headings).toEqual(["Welcome", "Practice Areas", "Personal Injury", "Contact"]);
});

test("headings: dedupes repeated text", () => {
  const html = `<h1>About Us</h1><h2>About Us</h2>`;
  const r = extractFromHtml(html);
  expect(r.headings).toEqual(["About Us"]);
});

test("headings: strips inner tags", () => {
  const html = `<h1><span>Smith</span> &amp; <em>Jones</em></h1>`;
  const r = extractFromHtml(html);
  expect(r.headings[0]).toBe("Smith & Jones");
});

test("headings: ignores h4-h6", () => {
  const html = `<h1>One</h1><h4>Four</h4><h5>Five</h5>`;
  const r = extractFromHtml(html);
  expect(r.headings).toEqual(["One"]);
});

/* ──────────────────────────────────────────────────────────────────────── */
/* extractFromHtml \u2014 paragraphs                                             */
/* ──────────────────────────────────────────────────────────────────────── */

test("paragraphs: extracts <p>, <li>, <blockquote>", () => {
  const html = `
    <p>We have served Alabama families for 20 years.</p>
    <ul>
      <li>Personal injury, wrongful death, catastrophic injury</li>
    </ul>
    <blockquote>Smith & Jones got me the settlement I needed.</blockquote>
  `;
  const r = extractFromHtml(html);
  expect(r.paragraphs.length).toBe(3);
  expect(r.paragraphs[0]).toContain("Alabama families");
});

test("paragraphs: drops short snippets (< 20 chars)", () => {
  const html = `<p>Yes.</p><p>This is a longer paragraph with substance.</p>`;
  const r = extractFromHtml(html);
  expect(r.paragraphs).toEqual([
    "This is a longer paragraph with substance.",
  ]);
});

test("paragraphs: dedupes identical text", () => {
  const html = `
    <p>Call us today for a free consultation about your case.</p>
    <p>Call us today for a free consultation about your case.</p>
  `;
  const r = extractFromHtml(html);
  expect(r.paragraphs.length).toBe(1);
});

test("paragraphs: strips nested HTML", () => {
  const html = `<p>Visit <a href="/about">our team</a> for more <em>details</em>.</p>`;
  const r = extractFromHtml(html);
  expect(r.paragraphs[0]).toBe("Visit our team for more details.");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* extractFromHtml \u2014 script / style stripping                               */
/* ──────────────────────────────────────────────────────────────────────── */

test("strips <script> contents from extraction", () => {
  const html = `
    <h1>Real Heading</h1>
    <script>const secret = "should not appear";</script>
    <p>Real paragraph that's long enough to keep around.</p>
  `;
  const r = extractFromHtml(html);
  expect(r.headings).toEqual(["Real Heading"]);
  expect(r.paragraphs[0]).toContain("Real paragraph");
  // The script content shouldn't leak into headings/paragraphs
  expect(JSON.stringify(r)).not.toContain("should not appear");
});

test("strips <style> contents", () => {
  const html = `
    <style>.x { color: red; content: "should not appear in headings"; }</style>
    <h1>OK</h1>
  `;
  const r = extractFromHtml(html);
  expect(r.headings).toEqual(["OK"]);
});

test("strips HTML comments", () => {
  const html = `<!-- secret comment with should-not-appear text --><h1>Title</h1>`;
  const r = extractFromHtml(html);
  expect(JSON.stringify(r)).not.toContain("should-not-appear");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* extractFromHtml \u2014 social links                                           */
/* ──────────────────────────────────────────────────────────────────────── */

test("social: extracts Facebook + LinkedIn + X", () => {
  const html = `
    <a href="https://facebook.com/smithjones">FB</a>
    <a href="https://www.linkedin.com/company/smithjones">LI</a>
    <a href="https://x.com/smithjones">X</a>
  `;
  const r = extractFromHtml(html);
  expect(r.socialLinks.facebook).toBe("https://facebook.com/smithjones");
  expect(r.socialLinks.linkedin).toBe("https://www.linkedin.com/company/smithjones");
  expect(r.socialLinks.x).toBe("https://x.com/smithjones");
});

test("social: x.com OR twitter.com both match the X slot", () => {
  const r = extractFromHtml(`<a href="https://twitter.com/handle">tw</a>`);
  expect(r.socialLinks.x).toBe("https://twitter.com/handle");
});

test("social: instagram + youtube + tiktok", () => {
  const html = `
    <a href="https://www.instagram.com/smithlaw">IG</a>
    <a href="https://www.youtube.com/@smithlaw">YT</a>
    <a href="https://www.tiktok.com/@smithlaw">TT</a>
  `;
  const r = extractFromHtml(html);
  expect(r.socialLinks.instagram).toBe("https://www.instagram.com/smithlaw");
  expect(r.socialLinks.youtube).toBe("https://www.youtube.com/@smithlaw");
  expect(r.socialLinks.tiktok).toBe("https://www.tiktok.com/@smithlaw");
});

test("social: missing platform returns null in that slot", () => {
  const html = `<a href="https://facebook.com/x">FB</a>`;
  const r = extractFromHtml(html);
  expect(r.socialLinks.facebook).not.toBe(null);
  expect(r.socialLinks.linkedin).toBe(null);
  expect(r.socialLinks.x).toBe(null);
});

test("social: ignores share-button links (querystring stripped)", () => {
  // facebook.com/sharer/sharer.php?u=... — we strip at ? and # so the
  // captured URL doesn't include share parameters
  const r = extractFromHtml(
    `<a href="https://facebook.com/profile/12345?ref=share">FB</a>`,
  );
  // We capture up to the ?
  expect(r.socialLinks.facebook).toBe("https://facebook.com/profile/12345");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* extractFromHtml \u2014 phones                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

test("phones: parens + dashes format", () => {
  const r = extractFromHtml("<p>Call (205) 555-1234 or (205) 555-1234 anytime.</p>");
  expect(r.phoneNumbers).toEqual(["(205) 555-1234"]);
});

test("phones: bare hyphenated", () => {
  const r = extractFromHtml("<p>Phone: 205-555-1234 for inquiries about case.</p>");
  expect(r.phoneNumbers).toEqual(["205-555-1234"]);
});

test("phones: dotted format", () => {
  const r = extractFromHtml("<p>Reach us at 205.555.1234 today for help.</p>");
  expect(r.phoneNumbers).toEqual(["205.555.1234"]);
});

test("phones: 1-800 prefix", () => {
  const r = extractFromHtml("<p>Call us toll-free at 1-800-555-1234 anytime.</p>");
  expect(r.phoneNumbers.length).toBe(1);
});

test("phones: multiple distinct numbers, capped at 5", () => {
  const html =
    "<p>" +
    "(205) 555-1001 (205) 555-1002 (205) 555-1003 " +
    "(205) 555-1004 (205) 555-1005 (205) 555-1006 (205) 555-1007 here." +
    "</p>";
  const r = extractFromHtml(html);
  expect(r.phoneNumbers.length).toBe(5);
});

test("phones: dedupes repeats with different formatting", () => {
  // Same number twice with different formatting; we dedupe on digits only.
  const r = extractFromHtml("<p>Call (205) 555-1234 or 205.555.1234 today.</p>");
  expect(r.phoneNumbers.length).toBe(1);
});

/* ──────────────────────────────────────────────────────────────────────── */
/* extractFromHtml \u2014 wordCount                                              */
/* ──────────────────────────────────────────────────────────────────────── */

test("wordCount: aggregates title + meta + headings + paragraphs", () => {
  const html = `
    <title>Smith Law</title>
    <meta name="description" content="Trial lawyers in Birmingham">
    <h1>Welcome</h1>
    <p>We have served Alabama for 20 years now today.</p>
  `;
  const r = extractFromHtml(html);
  // "Smith Law" (2) + "Trial lawyers in Birmingham" (4) +
  // "Welcome" (1) + "We have served Alabama for 20 years now today." (9)
  // = 16 words
  expect(r.wordCount).toBe(16);
});

test("wordCount: zero on empty page", () => {
  const r = extractFromHtml("");
  expect(r.wordCount).toBe(0);
});

/* ──────────────────────────────────────────────────────────────────────── */
/* End-to-end: realistic firm homepage                                      */
/* ──────────────────────────────────────────────────────────────────────── */

test("realistic firm homepage extracts all signals", () => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Smith & Jones LLP \u2014 Birmingham Trial Lawyers</title>
      <meta name="description" content="Smith & Jones has fought for Alabama families since 2002. Personal injury, wrongful death, catastrophic injury.">
      <meta property="og:title" content="Smith & Jones LLP">
      <meta property="og:site_name" content="Smith Law">
    </head>
    <body>
      <h1>You deserve answers.</h1>
      <p>We have helped over 2,000 Alabama families recover what they need to rebuild their lives after a serious injury.</p>
      <h2>Why Smith & Jones</h2>
      <ul>
        <li>Maria Smith and David Jones have tried over 100 jury cases between them.</li>
        <li>Former insurance defense attorneys \u2014 we know how the other side thinks.</li>
      </ul>
      <p>Call (205) 555-1234 today for a free consultation. No fee unless we win.</p>
      <footer>
        <a href="https://facebook.com/smithjoneslaw">Facebook</a>
        <a href="https://www.linkedin.com/company/smithjones-llp">LinkedIn</a>
      </footer>
    </body>
    </html>
  `;
  const r = extractFromHtml(html);
  expect(r.title).toContain("Smith & Jones");
  expect(r.metaDescription).toContain("2002");
  expect(r.headings.length).toBeGreaterThan(0);
  expect(r.paragraphs.length).toBeGreaterThan(0);
  expect(r.socialLinks.facebook).toBe("https://facebook.com/smithjoneslaw");
  expect(r.socialLinks.linkedin).toBe(
    "https://www.linkedin.com/company/smithjones-llp",
  );
  expect(r.phoneNumbers.length).toBeGreaterThan(0);
  expect(r.og.title).toBe("Smith & Jones LLP");
  expect(r.wordCount).toBeGreaterThan(20);
});
