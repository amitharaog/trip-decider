// Google News RSS: no key, no account. Returns the top result or null.
export async function findNews(query) {
  if (!query) return null;
  const url =
    "https://news.google.com/rss/search?" +
    new URLSearchParams({ q: `${query} when:60d`, hl: "en-IN", gl: "IN", ceid: "IN:en" });
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 meera-bot" } });
  if (!res.ok) return null;
  return parseTopItem(await res.text());
}

export function parseTopItem(xml) {
  const item = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1];
  if (!item) return null;
  const tag = (name) => decode(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] || "");
  const source = tag("source");
  let title = tag("title");
  // Google News titles end with " - Publication"
  if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
  const summary = stripHtml(tag("description")).replace(source, "").trim() || title;
  const pub = new Date(tag("pubDate"));
  return {
    title,
    source: source || "Unknown source",
    date: isNaN(pub) ? tag("pubDate") : pub.toISOString().slice(0, 10),
    link: tag("link"),
    summary: summary.length > 240 ? summary.slice(0, 237) + "..." : summary,
  };
}

function stripHtml(s) {
  return decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

// The flag every draft that uses a news item must carry. Not optional:
// Meera is the author of any claim that gets published.
export function verifyBlock(news) {
  const rule = "─────────────────────────────────";
  return [
    rule,
    `NEWS SOURCE: ${news.title}`,
    `FROM: ${news.source} · ${news.date}`,
    `LINK: ${news.link}`,
    "⚠ Check this before publishing — you are the author of this claim",
    rule,
  ].join("\n");
}
