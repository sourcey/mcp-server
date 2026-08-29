import {
  type CallToolResult,
  Client,
  type ListToolsResult,
  StreamableHTTPClientTransport,
  type Tool,
  type Transport,
} from "@modelcontextprotocol/client";
import { Server } from "@modelcontextprotocol/server";
import { bridgeDistribution, bridgeImplementation } from "./metadata.js";

export interface BridgeTimeouts {
  readonly connectMs: number;
  readonly listMs: number;
  readonly callMs: number;
  readonly closeMs: number;
}

export const defaultBridgeTimeouts: BridgeTimeouts = {
  connectMs: 15_000,
  listMs: 15_000,
  callMs: 60_000,
  closeMs: 5_000,
};

export interface SourceyBridgeInput {
  readonly endpoint: URL;
  readonly timeouts?: BridgeTimeouts;
  readonly diagnostic?: (message: string) => void;
  readonly onUpstreamClose?: () => void;
}

export interface SourceyBridge {
  readonly endpoint: URL;
  readonly hostedImplementation: ReturnType<Client["getServerVersion"]>;
  readonly tools: readonly Tool[];
  connect(transport: Transport): Promise<void>;
  close(): Promise<void>;
}

export async function createSourceyBridge(input: SourceyBridgeInput): Promise<SourceyBridge> {
  const timeouts = input.timeouts ?? defaultBridgeTimeouts;
  const upstream = new Client(bridgeImplementation, {
    capabilities: {},
    enforceStrictCapabilities: true,
    versionNegotiation: { mode: "legacy" },
  });
  const upstreamTransport = new StreamableHTTPClientTransport(input.endpoint);
  let closing = false;

  upstream.onerror = (error) => input.diagnostic?.(`upstream error: ${error.message}`);
  upstream.onclose = () => {
    if (!closing) input.onUpstreamClose?.();
  };

  await upstream.connect(upstreamTransport, requestOptions(timeouts.connectMs));
  const listed = await upstream.listTools(undefined, {
    ...requestOptions(timeouts.listMs),
    cacheMode: "refresh",
  });
  if (listed.tools.length === 0) {
    await upstream.close();
    throw new Error("The hosted Sourcey MCP server returned no tools.");
  }
  const tools = Object.freeze([...listed.tools]);
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const hosted = upstream.getServerVersion();
  const hostedIdentity = hosted ? `${hosted.name}@${hosted.version}` : input.endpoint.origin;
  const upstreamInstructions = upstream.getInstructions();
  const server = new Server(bridgeImplementation, {
    capabilities: { tools: { listChanged: false } },
    instructions: [
      `This installed stdio process is ${bridgeImplementation.name}@${bridgeImplementation.version}.`,
      `It relays the live hosted Sourcey server ${hostedIdentity}.`,
      upstreamInstructions,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" "),
  });

  server.setRequestHandler("tools/list", (): ListToolsResult => ({ tools: [...tools] }));
  server.setRequestHandler("tools/call", async (request): Promise<CallToolResult> => {
    const tool = toolsByName.get(request.params.name);
    if (!tool) throw new Error(`Unknown Sourcey tool: ${request.params.name}.`);
    const result = await upstream.callTool(request.params, {
      ...requestOptions(timeouts.callMs),
      toolDefinition: tool,
    });
    return server.projectCallToolResult(result, tool.outputSchema);
  });

  return {
    endpoint: input.endpoint,
    hostedImplementation: hosted,
    tools,
    connect: (transport) => server.connect(transport),
    close: async () => {
      if (closing) return;
      closing = true;
      await Promise.allSettled([
        boundedClose("local MCP server", () => server.close(), timeouts.closeMs),
        boundedClose("hosted MCP client", () => upstream.close(), timeouts.closeMs),
      ]);
    },
  };
}

export function sourceyMcpEndpoint(environment: NodeJS.ProcessEnv): URL {
  const endpoint = new URL(environment.SOURCEY_MCP_URL ?? bridgeDistribution.default_endpoint);
  if (endpoint.username || endpoint.password || endpoint.hash) {
    throw new Error("SOURCEY_MCP_URL must not contain credentials or a fragment.");
  }
  if (
    endpoint.protocol !== "https:" &&
    !(
      endpoint.protocol === "http:" && ["127.0.0.1", "::1", "localhost"].includes(endpoint.hostname)
    )
  ) {
    throw new Error("SOURCEY_MCP_URL must use HTTPS, except for a loopback test endpoint.");
  }
  return endpoint;
}

function requestOptions(timeout: number) {
  return { timeout, maxTotalTimeout: timeout } as const;
}

async function boundedClose(label: string, close: () => Promise<void>, timeout: number) {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      close(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} did not close within ${timeout}ms.`)),
          timeout,
        );
        timer.unref();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
