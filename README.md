# Sourcey MCP Server

Find evidence-backed startup credits and deals, inspect Agent Readiness report cards, and
prepare canonical service declarations from an agent client.

Sourcey is already a hosted Streamable HTTP MCP server:

```text
https://mcp.sourcey.com/mcp
```

Use that URL directly when your client supports remote MCP. This package is the thin stdio
bridge for clients that require a local command:

```bash
npx -y @sourcey/mcp-server
```

```json
{
  "mcpServers": {
    "sourcey": {
      "command": "npx",
      "args": ["-y", "@sourcey/mcp-server"]
    }
  }
}
```

The bridge downloads no offer dataset and contains no tool implementations. At startup it negotiates
with the live Sourcey server, reads the current tool definitions once, and relays tool calls. A
data or tool-description update therefore needs no package release.

## Agent plugins

This repository also packages the **hosted Sourcey connection** for Claude, Cursor, Grok Build and portable ChatGPT/Codex distribution. Host manifests are in `.claude-plugin/`, `.cursor-plugin/` and `.grok-plugin/`; root `plugin.json` carries Agent Plugins metadata for ChatGPT/Codex. Portable `mcp.json` and host-specific `.mcp.json` point directly to `https://mcp.sourcey.com/mcp`. The bundled [Sourcey research skill](skills/sourcey-research/SKILL.md) shows how to check evidence and eligibility before recommending an offer. Marketplace review and live cards are separate from the source package; no ChatGPT/Codex approval is claimed here.

The plugin connects to Sourcey's startup-offer and Agent Readiness data. It does **not** run Sourcey's separate documentation generator or pay for Sourcey's HTTP services. The current square mark is in `assets/sourcey-mark.png`; [privacy](https://sourcey.com/privacy), [terms](https://sourcey.com/terms) and [support](https://sourcey.com/support) are available on the product site.

## What agents can do

- search and compare current startup credits, discounts, free tiers, programs, perks, and deals;
- inspect exact evidence, freshness, eligibility unknowns, and the signed change feed;
- search and inspect Agent Readiness report cards, including visible grades, five-stage findings,
  blockers, remediations, methods, coverage, and freshness;
- prepare canonical Agent Readiness declaration YAML without assigning a grade; and
- discover Sourcey's paid HTTP services and x402 endpoint without paying inside MCP.

Call `tools/list` for the exact live schemas and descriptions. Sourcey's full agent guide is at
[sourcey.com/SKILL.md](https://sourcey.com/SKILL.md), its OpenAPI contract is at
[api.sourcey.com/openapi.yml](https://api.sourcey.com/openapi.yml), and x402 discovery is at
[api.sourcey.com/.well-known/x402](https://api.sourcey.com/.well-known/x402).

## Boundary

This package performs only two actions: MCP over local stdio and MCP over the configured hosted
HTTP endpoint. It has no wallet, payment signer, credentials, telemetry, browser, background
daemon, mutable plugin, Catalog data, Agent Readiness executor, or submission authority. Paid
work remains on Sourcey's canonical HTTP API.

`SOURCEY_MCP_URL` may select another HTTPS Sourcey endpoint. Plain HTTP is accepted only for a
loopback test server. URLs containing credentials or fragments are refused.

## Development

```bash
npm ci
npm run verify
docker build -t sourcey-mcp .
```

The verification path builds from clean output, checks all generated metadata, tests the real
HTTP-to-stdio boundary, creates an SBOM, installs the exact packed tarball into a blank project,
and repeats protocol introspection from those installed bytes.

MIT. See `SECURITY.md` and `SUPPORT.md` for reporting paths.
