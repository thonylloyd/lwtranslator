#!/usr/bin/env node
/**
 * Copies the built PWA into `server/public` so the venue server can host the
 * app itself. Run `npm run build` in the project root first, then
 * `npm run bundle` here. Phones at the venue then only need the local Wi-Fi.
 */
import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..");
const projectRoot = path.resolve(serverRoot, "..");
const target = path.join(serverRoot, "public");

// TanStack Start / Vite output locations, newest layout first.
const candidates = [
  path.join(projectRoot, ".output", "public"),
  path.join(projectRoot, "dist", "client"),
  path.join(projectRoot, "dist"),
];

async function findBuild() {
  for (const dir of candidates) {
    try {
      const info = await stat(dir);
      if (info.isDirectory()) return dir;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const source = await findBuild();
if (!source) {
  console.error(
    "No built app found. Run `npm run build` in the project root first.\nLooked in:\n  " +
      candidates.join("\n  "),
  );
  process.exit(1);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.log(`Bundled app from ${source} -> ${target}`);

// The app is server-rendered, so the build has no index.html. In that case the
// venue server hosts the static assets while the page HTML comes from the app
// build itself (`node dist/server/index.mjs`) or from the published URL.
try {
  await stat(path.join(target, "index.html"));
  console.log("Start the venue server with `npm start` and open http://lw-translator.local:8787/");
} catch {
  console.log(
    "Note: this build is server-rendered (no index.html), so the venue server hosts\n" +
      "assets, the conference API and signaling. Serve the page itself from the app\n" +
      "build (`node dist/server/index.mjs`) on the same machine.",
  );
}
