import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

const mode = process.argv[2];
if (!new Set(["inspect", "wait"]).has(mode)) {
  throw new Error("Usage: node scripts/verify-registry.mjs <inspect|wait>");
}

const expected = JSON.parse(await readFile(new URL("../server.json", import.meta.url), "utf8"));
const endpoint = new URL(
  `https://registry.modelcontextprotocol.io/v0.1/servers/${encodeURIComponent(expected.name)}/versions/${encodeURIComponent(expected.version)}`,
);

const attempts = mode === "wait" ? 12 : 1;
let cause;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`registry returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!isDeepStrictEqual(payload.server, expected)) {
      throw new Error("registry bytes differ from server.json");
    }
    const official = payload._meta?.["io.modelcontextprotocol.registry/official"];
    if (official?.status !== "active") throw new Error("registry record is not active");
    process.stdout.write(`${expected.name}@${expected.version}\n`);
    process.exit(0);
  } catch (error) {
    cause = error;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
  }
}
throw new Error(
  `MCP Registry readback did not converge: ${cause instanceof Error ? cause.message : String(cause)}`,
);
