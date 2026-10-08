import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { networkInterfaces } from "node:os";

import selfsigned from "selfsigned";

/**
 * Phones only allow the microphone on secure (https) pages, so the venue
 * server also listens on HTTPS with a certificate it creates for itself on
 * first start (kept in data/ so phones only need to accept it once).
 */
export async function loadOrCreateCertificate(file) {
  try {
    const saved = JSON.parse(await readFile(file, "utf8"));
    if (saved.key && saved.cert) return saved;
  } catch {
    // create a new one below
  }
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4")
    .map((i) => ({ type: 7, ip: i.address }));
  const pems = selfsigned.generate([{ name: "commonName", value: "lw-translator.local" }], {
    keySize: 2048,
    days: 3650,
    algorithm: "sha256",
    extensions: [
      { name: "basicConstraints", cA: false },
      {
        name: "subjectAltName",
        altNames: [{ type: 2, value: "lw-translator.local" }, { type: 2, value: "localhost" }, ...ips],
      },
    ],
  });
  const result = { key: pems.private, cert: pems.cert };
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(result));
  return result;
}
