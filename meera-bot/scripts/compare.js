// Same note, same news item, drafted by Gemini and by Claude, side by side.
//   npm run compare -- notes/02-layering-order.txt
import fs from "node:fs";
import { newsFor, writeDraft } from "../lib/pipeline.js";

const text = fs.readFileSync(process.argv[2], "utf8");
const { query, news } = await newsFor(text);
console.log(`News search: "${query}" -> ${news ? `${news.title} (${news.source})` : "nothing found"}\n`);
for (const model of ["gemini", "claude"]) {
  const d = await writeDraft(text, news, { model });
  console.log(`===== ${model.toUpperCase()} (${d.post.split(/\s+/).length} words, news used: ${d.usedNews}) =====\n`);
  console.log(d.post, "\n");
}
