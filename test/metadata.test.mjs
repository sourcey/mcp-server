import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { bridgeDistribution, bridgeImplementation, bridgePackage } from "../dist/metadata.js";

test("package, registry, runtime, icon, and x402 metadata close over one distribution", async () => {
  const icon = await readFile(new URL(`../${bridgeDistribution.icon.local_path}`, import.meta.url));
  assert.equal(bridgePackage.mcpName, "com.sourcey/sourcey");
  assert.equal(bridgePackage.mcpName, bridgeDistribution.registry_name);
  assert.equal(bridgeImplementation.version, bridgePackage.version);
  assert.equal(bridgeImplementation.name, bridgeDistribution.implementation_name);
  assert.equal(bridgeDistribution.x402_discovery_url, "https://api.sourcey.com/.well-known/x402");
  assert.equal(createHash("sha256").update(icon).digest("hex"), bridgeDistribution.icon.sha256);
});
