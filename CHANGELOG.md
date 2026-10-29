# Changelog

## 1.0.1

- The package joins Sourcey's single official MCP Registry entry, `com.sourcey/sourcey`, as the local stdio alternative to the hosted endpoint. It replaces the separate `io.github.sourcey/mcp-server` entry.
- This repository no longer publishes its own registry record; Sourcey's hosted release lists the package.
- No bridge runtime or tool change.

## 1.0.0

- Initial public stdio bridge to Sourcey's hosted MCP server.
- Dynamic hosted tool discovery with bounded connect, list, call, and shutdown behavior.
- Complete npm, MCP Registry, Glama, container, SBOM, and provenance metadata.
