export function metadataDocuments(packageManifest, distribution) {
  assertMetadata(packageManifest, distribution);
  return {
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
  // Sourcey's hosted registry record lists this package as its local stdio
  // alternative; the registry admits it only when mcpName names that record.
  if (distribution.registry_name !== "com.sourcey/sourcey") {
    throw new Error("The bridge package must bind to Sourcey's hosted registry record.");
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
