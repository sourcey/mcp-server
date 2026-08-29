import { createServer } from "node:http";

createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  if (body.length === 0) {
    response.statusCode = 405;
    response.setHeader("allow", "POST");
    response.end();
    return;
  }
  const message = JSON.parse(body.toString("utf8"));
  response.setHeader("mcp-protocol-version", "2025-11-25");
  if (message.id === undefined) {
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
          serverInfo: { name: "sourcey", version: "1.2.0" },
          instructions: "Every result is evidence-bound.",
        }
      : message.method === "tools/list"
        ? {
            tools: [
              {
                name: "search_offers",
                description: "Search current startup credits and deals.",
                inputSchema: {
                  type: "object",
                  properties: { query: { type: "string" } },
                  required: ["query"],
                },
                outputSchema: {
                  type: "object",
                  properties: { query: { type: "string" } },
                  required: ["query"],
                },
              },
            ],
          }
        : message.method === "tools/call"
          ? {
              content: [{ type: "text", text: JSON.stringify(message.params.arguments) }],
              structuredContent: message.params.arguments,
            }
          : undefined;
  response.end(
    JSON.stringify(
      result
        ? { jsonrpc: "2.0", id: message.id, result }
        : {
            jsonrpc: "2.0",
            id: message.id,
            error: { code: -32601, message: "Method not found" },
          },
    ),
  );
}).listen(4310, "127.0.0.1");
