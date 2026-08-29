export function metadataDocuments(packageManifest, distribution) {
  assertMetadata(packageManifest, distribution);
  return {
    "server.json": {
      $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
      name: distribution.registry_name,
      title: distribution.title,
      description: distribution.registry_description,
      version: packageManifest.version,
      websiteUrl: distribution.website_url,
      icons: [
        {
          src: distribution.icon.src,
          mimeType: distribution.icon.mime_type,
          sizes: distribution.icon.sizes,
        },
      ],
      repository: { url: distribution.repository, source: "github" },
      packages: [
        {
          registryType: "npm",
          identifier: packageManifest.name,
          version: packageManifest.version,
          transport: { type: "stdio" },
        },
      ],
    },
    "glama.json": {
      $schema: "https://glama.ai/mcp/schemas/server.json",
      maintainers: distribution.glama_maintainers,
    },
  };
}

export function jsonBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertMetadata(packageManifest, distribution) {
  if (packageManifest.mcpName !== distribution.registry_name) {
    throw new Error("package mcpName must equal the package registry identity.");
  }
  if (distribution.registry_description.length > 100) {
    throw new Error("Official MCP registry descriptions must not exceed 100 characters.");
  }
  if (packageManifest.repository?.url !== `git+${distribution.repository}.git`) {
    throw new Error("Package and distribution repository identities differ.");
  }
  if (distribution.default_endpoint !== "https://mcp.sourcey.com/mcp") {
    throw new Error("The bridge default must remain the canonical hosted Sourcey endpoint.");
  }
}
