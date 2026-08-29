import { readFile } from "node:fs/promises";
import { jsonBytes, metadataDocuments } from "./metadata.mjs";

const root = new URL("../", import.meta.url);
const packageManifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const distribution = JSON.parse(await readFile(new URL("distribution.json", root), "utf8"));
for (const [name, value] of Object.entries(metadataDocuments(packageManifest, distribution))) {
  const actual = await readFile(new URL(name, root), "utf8");
  if (actual !== jsonBytes(value))
    throw new Error(`${name} has drifted; run npm run generate:metadata.`);
}
