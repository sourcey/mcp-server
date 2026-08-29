import type { Implementation } from "@modelcontextprotocol/server";
import distribution from "../distribution.json" with { type: "json" };
import packageManifest from "../package.json" with { type: "json" };

export const bridgeDistribution = distribution;
export const bridgePackage = packageManifest;

export const bridgeImplementation: Implementation = {
  name: distribution.implementation_name,
  title: distribution.title,
  version: packageManifest.version,
  description: distribution.registry_description,
  icons: [
    {
      src: distribution.icon.src,
      mimeType: distribution.icon.mime_type,
      sizes: distribution.icon.sizes,
    },
  ],
  websiteUrl: distribution.website_url,
};
