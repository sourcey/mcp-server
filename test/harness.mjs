import { once } from "node:events";
import { createServer } from "node:http";

export async function startFakeSourcey() {
  const requests = [];
  const server = createServer(async (request, response) => {
    const body = await bodyBytes(request);
    const message = body.length ? JSON.parse(body.toString("utf8")) : null;
    requests.push(message);
    response.setHeader("mcp-protocol-version", "2025-11-25");
    if (message?.id === undefined) {
      response.statusCode = 202;
      response.end();
      return;
    }
    response.setHeader("content-type", "application/json");
    const result =
      message.method === "initialize"
        ? {
            protocolVersion: "2025-11-25",
            capabilities: { tools: { listChanged: false } },
            serverInfo: {
              name: "sourcey",
              title: "Sourcey",
              version: "1.2.0",
              description: "Sourcey fixture",
              websiteUrl: "https://sourcey.com",
            },
            instructions: "Every result is evidence-bound.",
          }
        : message.method === "tools/list"
          ? {
              tools: [
                {
                  name: "search_offers",
                  title: "Search credits and deals",
                  description: "Search current startup credits and deals.",
                  inputSchema: {
                    type: "object",
                    properties: { query: { type: "string" } },
                    required: ["query"],
                    additionalProperties: false,
                  },
                  outputSchema: {
                    type: "object",
                    properties: { query: { type: "string" } },
                    required: ["query"],
                    additionalProperties: false,
                  },
                  annotations: {
                    readOnlyHint: true,
                    destructiveHint: false,
                    idempotentHint: true,
                    openWorldHint: false,
                  },
                },
              ],
            }
          : message.method === "tools/call"
            ? {
                content: [{ type: "text", text: JSON.stringify(message.params.arguments) }],
                structuredContent: message.params.arguments,
              }
            : null;
    if (!result) {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32601, message: "Method not found" },
        }),
      );
      return;
    }
    response.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fake Sourcey address unavailable.");
  return {
    url: `http://127.0.0.1:${address.port}/mcp`,
    requests,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

export async function exerciseBridge(child, expectedVersion = "1.0.0") {
  const stdout = lines(child.stdout);
  const stderr = [];
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString("utf8")));
  send(child, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "sourcey-package-proof", version: "1.0.0" },
    },
  });
  const initialized = await responseFrom(child, stdout, stderr, 1);
  if (initialized.result?.serverInfo?.name !== "sourcey-mcp-bridge") {
    throw new Error("The local handshake does not identify the Sourcey bridge.");
  }
  if (initialized.result.serverInfo.version !== expectedVersion) {
    throw new Error("The local handshake version differs from the package version.");
  }
  send(child, { jsonrpc: "2.0", method: "notifications/initialized" });
  send(child, { jsonrpc: "2.0", id: 2, method: "tools/list" });
  const listed = await responseFrom(child, stdout, stderr, 2);
  if (listed.result?.tools?.[0]?.name !== "search_offers") {
    throw new Error("The bridge did not relay the hosted tool registry.");
  }
  send(child, {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "search_offers", arguments: { query: "database" } },
  });
  const called = await responseFrom(child, stdout, stderr, 3);
  if (called.result?.structuredContent?.query !== "database") {
    throw new Error("The bridge did not relay the hosted tool result.");
  }
  child.kill("SIGTERM");
  const [code, signal] = await Promise.race([
    once(child, "exit"),
    rejectAfter(5_000, "The bridge did not terminate after SIGTERM."),
  ]);
  if (code !== 0 || signal !== null) throw new Error(`Bridge exited with ${code}/${signal}.`);
  if (stdout.nonJson.length > 0) throw new Error("The bridge wrote non-JSON bytes to stdout.");
  if (!stderr.join("").includes("bridging http://127.0.0.1:")) {
    throw new Error("The bridge did not emit its startup diagnostic on stderr.");
  }
}

function lines(stream) {
  let buffered = "";
  const messages = new Map();
  const waiters = new Map();
  const nonJson = [];
  stream.on("data", (chunk) => {
    buffered += chunk.toString("utf8");
    while (buffered.includes("\n")) {
      const index = buffered.indexOf("\n");
      const line = buffered.slice(0, index);
      buffered = buffered.slice(index + 1);
      if (!line) continue;
      try {
        const message = JSON.parse(line);
        messages.set(message.id, message);
        waiters.get(message.id)?.(message);
      } catch {
        nonJson.push(line);
      }
    }
  });
  return {
    nonJson,
    waitFor(id) {
      const existing = messages.get(id);
      if (existing) return Promise.resolve(existing);
      return Promise.race([
        new Promise((resolve) => waiters.set(id, resolve)),
        rejectAfter(10_000, `Timed out waiting for MCP response ${id}.`),
      ]);
    },
  };
}

function send(child, message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

async function responseFrom(child, stdout, stderr, id) {
  try {
    return await Promise.race([
      stdout.waitFor(id),
      once(child, "exit").then(([code, signal]) => {
        throw new Error(`Bridge exited before response ${id} with ${code}/${signal}.`);
      }),
    ]);
  } catch (error) {
    const diagnostics = stderr.join("").trim();
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}${diagnostics ? ` Diagnostics: ${diagnostics}` : ""}`,
    );
  }
}

function rejectAfter(milliseconds, message) {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    timer.unref();
  });
}

async function bodyBytes(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
