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

// The app is server-rendered: also copy its server build so the venue server
// can render pages (/, /join, /listen/…) itself, fully offline.
const serverBuild = path.join(path.dirname(source), "server");
const serverTarget = path.join(serverRoot, "app-server");
await rm(serverTarget, { recursive: true, force: true });
try {
  await stat(path.join(serverBuild, "index.mjs"));
  await cp(serverBuild, serverTarget, { recursive: true });
  console.log(`Bundled app pages from ${serverBuild} -> ${serverTarget}`);
} catch {
  try {
    await stat(path.join(target, "index.html"));
  } catch {
    console.error("No app server build found next to " + source + ". Run `npm run build` again.");
    process.exit(1);
  }
}
console.log("Start the venue server with `npm start` and open http://<this-computer-ip>:8787/");
