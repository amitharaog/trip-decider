import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const VOICE_FILE = path.join(here, "..", "voice-skill.txt");

// The voice profile Gemini/Claude get on every draft. An active row in the
// Supabase voice_skill table overrides the file, so it can be tuned without a redeploy.
export async function loadVoice(store) {
  const fromDb = store ? await store.activeVoice() : null;
  if (fromDb) return fromDb;
  return fs.readFileSync(VOICE_FILE, "utf8");
}
