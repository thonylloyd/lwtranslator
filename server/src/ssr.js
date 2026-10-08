import { stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Readable } from "node:stream";

/**
 * Renders the LW Translator pages on the venue machine.
 *
 * The app is server-rendered, so its build has no index.html. `npm run bundle`
 * copies the app's server build into `server/app-server`; this module loads it
 * and answers page requests (/, /join, /listen/ABC123 …) fully offline.
 */
export function createPageRenderer(entryFile) {
  let handlerPromise = null;

  async function load() {
    try {
      await stat(entryFile);
    } catch {
      return null;
    }
    const mod = await import(pathToFileURL(entryFile).href);
    const handler = mod.default ?? mod;
    return typeof handler?.fetch === "function" ? handler : null;
  }

  async function available() {
    handlerPromise ??= load().catch((error) => {
      console.error("Could not load the app pages:", error);
      return null;
    });
    return Boolean(await handlerPromise);
  }

  /** Returns true when the request was answered with an app page. */
  async function render(req, res, url) {
    if (req.method !== "GET" && req.method !== "HEAD") return false;
    if (!(await available())) return false;
    const handler = await handlerPromise;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(", "));
    }
    const request = new Request(url.href, { method: req.method, headers });
    const response = await handler.fetch(request, {}, { waitUntil() {}, passThroughOnException() {} });

    const outHeaders = {};
    response.headers.forEach((value, key) => {
      outHeaders[key] = value;
    });
    res.writeHead(response.status, outHeaders);
    if (req.method === "HEAD" || !response.body) {
      res.end();
      return true;
    }
    Readable.fromWeb(response.body).pipe(res);
    return true;
  }

  return { available, render };
}
