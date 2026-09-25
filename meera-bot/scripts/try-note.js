// Run one note through the pipeline locally, no Telegram, nothing saved.
//   npm run try -- notes/01-batch-fourteen.txt
//   npm run try -- "Remind me to call the courier on Monday"
import fs from "node:fs";
import { processNote, rejectionMessage, draftMessage } from "../lib/pipeline.js";

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npm run try -- <note file or "note text">');
  process.exit(1);
}
const text = fs.existsSync(arg) ? fs.readFileSync(arg, "utf8") : arg;
const result = await processNote(text);
if (result.query) console.log(`[news search: "${result.query}"]\n`);
console.log(result.kind === "rejected" ? rejectionMessage(result) : draftMessage(result));
