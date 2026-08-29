#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createSourceyBridge, type SourceyBridge, sourceyMcpEndpoint } from "./bridge.js";

const note = (message: string) => process.stderr.write(`[sourcey-mcp] ${message}\n`);
let bridge: SourceyBridge | undefined;
let shuttingDown = false;

async function shutdown(reason: string, exitCode: number) {
  if (shuttingDown) return;
  shuttingDown = true;
  note(reason);
  await bridge?.close();
  process.exitCode = exitCode;
}

async function main() {
  const endpoint = sourceyMcpEndpoint(process.env);
  bridge = await createSourceyBridge({
    endpoint,
    diagnostic: note,
    onUpstreamClose: () => void shutdown("hosted Sourcey connection closed", 1),
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => void shutdown(`received ${signal}`, 0));
  }
  await bridge.connect(new StdioServerTransport());
  note(`bridging ${endpoint.origin}${endpoint.pathname}`);
}

main().catch((error: unknown) => {
  note(`failed to start: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
