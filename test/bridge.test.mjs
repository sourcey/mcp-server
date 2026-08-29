import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { sourceyMcpEndpoint } from "../dist/bridge.js";
import { exerciseBridge, startFakeSourcey } from "./harness.mjs";

test("the exact built bridge relays hosted tools and exits cleanly", async () => {
  const upstream = await startFakeSourcey();
  try {
    const child = spawn(process.execPath, ["dist/index.js"], {
      cwd: new URL("../", import.meta.url),
      env: { ...process.env, SOURCEY_MCP_URL: upstream.url },
      stdio: ["pipe", "pipe", "pipe"],
    });
    try {
      await exerciseBridge(child);
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)} Upstream requests: ${JSON.stringify(upstream.requests)}`,
      );
    }
    assert.equal(
      upstream.requests.filter((request) => request?.method === "tools/list").length,
      1,
      "tool definitions are discovered once from the live owner, not reimplemented locally",
    );
  } finally {
    await upstream.close();
  }
});

test("endpoint overrides are HTTPS except for bounded loopback proof", () => {
  assert.equal(sourceyMcpEndpoint({}).href, "https://mcp.sourcey.com/mcp");
  assert.equal(
    sourceyMcpEndpoint({ SOURCEY_MCP_URL: "http://127.0.0.1:4310/mcp" }).href,
    "http://127.0.0.1:4310/mcp",
  );
  assert.throws(
    () => sourceyMcpEndpoint({ SOURCEY_MCP_URL: "http://example.com/mcp" }),
    /must use HTTPS/,
  );
  assert.throws(
    () => sourceyMcpEndpoint({ SOURCEY_MCP_URL: "https://user:secret@example.com/mcp" }),
    /must not contain credentials/,
  );
});
