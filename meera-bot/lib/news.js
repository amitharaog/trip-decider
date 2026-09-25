// Google News RSS: no key, no account. Returns the top result or null.
// Starts narrow and recent, then widens, so most notes end up with something.
export async function findNews(query, fallbackTerms = []) {
  if (!query) return null;
  const words = query.split(/\s+/).filter(Boolean);
  const attempts = [
    `${query} when:30d`,
    query,
    words.slice(0, 2).join(" "),
    ...fallbackTerms.slice(0, 2),
  ].filter((q, i, all) => q && all.indexOf(q) === i);
  for (const q of attempts) {
    const item = await searchOnce(q);
    if (item) return { ...item, searchedFor: q };
  }
  console.warn("no news for", attempts);
  return null;
}

async function searchOnce(q) {
  const url = "https://news.google.com/rss/search?" + new URLSearchParams({ q, hl: "en-IN", gl: "IN", ceid: "IN:en" });
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 meera-bot" } });
    if (!res.ok) {
      console.warn(`Google News ${res.status} for "${q}"`);
      return null;
    }
    return parseTopItem(await res.text());
  } catch (err) {
    console.warn(`Google News failed for "${q}"`, err.message);
    return null;
  }
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
  const rule = "────────────────";
  return [
    rule,
    `NEWS SOURCE: ${news.title}`,
    `FROM: ${news.source} · ${news.date}`,
    `LINK: ${news.link}`,
    "⚠ Check this before publishing — you are the author of this claim",
    rule,
  ].join("\n");
}

// Shown when a news item was found but the draft didn't use it.
export function relatedBlock(news) {
  const rule = "────────────────";
  return [
    rule,
    `RELATED NEWS (not used in this draft): ${news.title}`,
    `FROM: ${news.source} · ${news.date}`,
    `LINK: ${news.link}`,
    "Add it yourself if it fits — and check it first.",
    rule,
  ].join("\n");
}
