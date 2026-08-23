import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Tiny JSON-file store. The venue server is the single source of truth for
 * conferences once it is reachable; the PWA keeps a local copy for offline use.
 */
const FILE = resolve(process.env.LW_DATA_FILE ?? "./data/conferences.json");

function load() {
  try {
    if (!existsSync(FILE)) return [];
    const parsed = JSON.parse(readFileSync(FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let conferences = load();

function persist() {
  try {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(conferences, null, 2));
  } catch (error) {
    console.error("[store] failed to persist:", error.message);
  }
}

export const store = {
  list() {
    return conferences;
  },

  byCode(code) {
    if (!code) return undefined;
    const normalised = String(code).trim().toUpperCase();
    return conferences.find((c) => String(c.code).toUpperCase() === normalised);
  },

  upsert(conference) {
    if (!conference?.id) throw new Error("conference.id is required");
    const index = conferences.findIndex((c) => c.id === conference.id);
    if (index === -1) conferences.push(conference);
    else conferences[index] = { ...conferences[index], ...conference };
    persist();
    return conference;
  },

  replaceAll(list) {
    conferences = Array.isArray(list) ? list : [];
    persist();
    return conferences;
  },

  remove(id) {
    conferences = conferences.filter((c) => c.id !== id);
    persist();
  },
};
