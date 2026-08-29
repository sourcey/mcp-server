import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const result = spawnSync("npm", ["sbom", "--package-lock-only", "--sbom-format", "cyclonedx"], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
if (result.status !== 0) throw new Error(result.stderr || "npm sbom failed.");
const sbom = JSON.parse(result.stdout);
// npm authors these two optional CycloneDX fields from wall-clock time and
// randomness. They describe the generation run rather than the locked package
// closure, so retaining them makes identical release inputs produce different
// package bytes.
delete sbom.serialNumber;
delete sbom.metadata?.timestamp;
await writeFile(new URL("../SBOM.cdx.json", import.meta.url), `${JSON.stringify(sbom, null, 2)}\n`);
