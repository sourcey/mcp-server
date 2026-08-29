# Security

Report vulnerabilities privately through GitHub Security Advisories for
`sourcey/mcp-server`. Do not include credentials, wallet material, private Catalog data, or
personal information in a public issue.

The bridge accepts no Sourcey credential. Its only network destination is the canonical hosted
endpoint or the explicit `SOURCEY_MCP_URL` override, which must use HTTPS except on loopback.
