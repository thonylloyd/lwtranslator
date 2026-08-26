import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

/**
 * Serves the built PWA from the venue machine (Phase 4).
 *
 * The whole point of the local system is that phones need no internet: they
 * connect to the venue Wi-Fi, open `http://<server>:<port>/` and get the app
 * itself from this server. Build the PWA and copy the client output into
 * `server/public` (see server/README.md).
 */

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

async function fileInfo(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? info : null;
  } catch {
    return null;
  }
}

export function createStaticHandler(rootDir) {
  const root = resolve(rootDir);

  /** Returns true when the request was served from disk. */
  return async function serveStatic(req, res, pathname) {
    if (req.method !== "GET" && req.method !== "HEAD") return false;

    const requested = decodeURIComponent(pathname);
    const candidate = normalize(join(root, requested));
    if (candidate !== root && !candidate.startsWith(root + sep)) return false; // traversal

    let target = candidate;
    let info = await fileInfo(target);
    if (!info && !extname(requested)) {
      // Directory index, then SPA fallback so deep links like /listen/LW4827 work.
      target = join(candidate, "index.html");
      info = await fileInfo(target);
      if (!info) {
        target = join(root, "index.html");
        info = await fileInfo(target);
      }
    }
    if (!info) return false;

    const ext = extname(target).toLowerCase();
    const immutable = target.includes(`${sep}assets${sep}`) && ext !== ".html";
    res.writeHead(200, {
      "content-type": TYPES[ext] ?? "application/octet-stream",
      "content-length": info.size,
      "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    });
    if (req.method === "HEAD") {
      res.end();
      return true;
    }
    createReadStream(target).pipe(res);
    return true;
  };
}
