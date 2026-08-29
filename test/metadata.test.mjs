import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { bridgeDistribution, bridgeImplementation, bridgePackage } from "../dist/metadata.js";

test("package, registry, runtime, icon, and x402 metadata close over one distribution", async () => {
  const server = JSON.parse(await readFile(new URL("../server.json", import.meta.url), "utf8"));
  const icon = await readFile(new URL(`../${bridgeDistribution.icon.local_path}`, import.meta.url));
  assert.equal(server.name, bridgePackage.mcpName);
  assert.equal(server.version, bridgePackage.version);
  assert.equal(server.packages[0].identifier, bridgePackage.name);
  assert.equal(server.packages[0].version, bridgePackage.version);
  assert.equal(bridgeImplementation.version, bridgePackage.version);
  assert.equal(bridgeImplementation.name, bridgeDistribution.implementation_name);
  assert.equal(bridgeDistribution.x402_discovery_url, "https://api.sourcey.com/.well-known/x402");
  assert.equal(createHash("sha256").update(icon).digest("hex"), bridgeDistribution.icon.sha256);
});
