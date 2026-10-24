import { readdir, readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

// The installable Claude folder contains only the hosted connection and skill.
// Keep each shared file byte-identical to its existing source at repository root.
export const claudePluginPath = "plugins/sourcey/";
const sharedFiles = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/icon.png",
  ".mcp.json",
  "skills/sourcey-research/SKILL.md",
  "LICENSE",
];

export async function claudePluginFiles(root) {
  return new Map(
    await Promise.all(sharedFiles.map(async (name) => [name, await readFile(new URL(name, root))])),
  );
}

export async function checkClaudePlugin(root) {
  const expected = await claudePluginFiles(root);
  for (const [name, bytes] of expected) {
    const actual = await readFile(new URL(`${claudePluginPath}${name}`, root));
    if (!actual.equals(bytes)) {
      throw new Error(`${claudePluginPath}${name} has drifted; run npm run generate:metadata.`);
    }
  }
  const entries = await readdir(new URL(claudePluginPath, root), {
    recursive: true,
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    const parent = entry.parentPath ?? entry.path;
    const base = fileURLToPath(new URL(claudePluginPath, root));
    const name = relative(base, `${parent}/${entry.name}`).replaceAll("\\", "/");
    if (!entry.isFile() || (!expected.has(name) && name !== "README.md")) {
      throw new Error(`Unexpected file in Claude plugin: ${name}`);
    }
  }
  const readme = await readFile(new URL(`${claudePluginPath}README.md`, root), "utf8");
  if (readme.split(/\s+/).length < 40) throw new Error("Claude plugin README is too short.");
}
