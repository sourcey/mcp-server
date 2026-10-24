import { mkdir, readFile, writeFile } from "node:fs/promises";
import { claudePluginFiles, claudePluginPath } from "./claude-plugin.mjs";
import { jsonBytes, metadataDocuments } from "./metadata.mjs";

const root = new URL("../", import.meta.url);
const packageManifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const distribution = JSON.parse(await readFile(new URL("distribution.json", root), "utf8"));
for (const [name, value] of Object.entries(metadataDocuments(packageManifest, distribution))) {
  await writeFile(new URL(name, root), jsonBytes(value));
}
for (const [name, bytes] of await claudePluginFiles(root)) {
  const target = new URL(`${claudePluginPath}${name}`, root);
  await mkdir(new URL("./", target), { recursive: true });
  await writeFile(target, bytes);
}
