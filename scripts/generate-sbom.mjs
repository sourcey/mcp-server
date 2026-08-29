import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const result = spawnSync("npm", ["sbom", "--package-lock-only", "--sbom-format", "cyclonedx"], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
if (result.status !== 0) throw new Error(result.stderr || "npm sbom failed.");
JSON.parse(result.stdout);
await writeFile(new URL("../SBOM.cdx.json", import.meta.url), `${result.stdout.trim()}\n`);
