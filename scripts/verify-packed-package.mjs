import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { exerciseBridge, startFakeSourcey } from "../test/harness.mjs";

const root = new URL("../", import.meta.url);
const arguments_ = process.argv.slice(2);
const explicit = flag(arguments_, "--tar");
const temporary = await mkdtemp(join(tmpdir(), "sourcey-mcp-package-"));
const tarball = explicit ? resolve(explicit) : await pack(temporary);
assertPackageContents(tarball);

const consumer = join(temporary, "consumer");
await mkdir(consumer);
await writeFile(join(consumer, "package.json"), '{"private":true,"type":"module"}\n');
const install = spawnSync(
  "npm",
  ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", consumer, tarball],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
if (install.status !== 0) throw new Error(install.stderr || "Packed package install failed.");
const installed = JSON.parse(
  await readFile(join(consumer, "node_modules", "@sourcey", "mcp-server", "package.json"), "utf8"),
);
const upstream = await startFakeSourcey();
try {
  const child = spawn(
    process.execPath,
    [join(consumer, "node_modules", "@sourcey", "mcp-server", "dist", "index.js")],
    {
      env: { ...process.env, SOURCEY_MCP_URL: upstream.url },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  await exerciseBridge(child, installed.version);
} finally {
  await upstream.close();
}
process.stdout.write(
  `${JSON.stringify({ package: installed.name, version: installed.version, tarball: basename(tarball) })}\n`,
);

async function pack(destination) {
  const result = spawnSync("npm", ["pack", "--json", "--pack-destination", destination], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr || "npm pack failed.");
  const records = JSON.parse(result.stdout);
  if (records.length !== 1 || !records[0]?.filename)
    throw new Error("npm pack returned no exact tarball.");
  return join(destination, records[0].filename);
}

function assertPackageContents(tarball) {
  const result = spawnSync("tar", ["-tzf", tarball], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "Packed tarball is unreadable.");
  const names = result.stdout.trim().split("\n").filter(Boolean);
  const forbidden = names.filter((name) => /package\/(?:src|test|scripts|\.github)\//u.test(name));
  if (forbidden.length > 0)
    throw new Error(`Packed tarball contains source-only files: ${forbidden.join(", ")}`);
  for (const required of [
    "package/package.json",
    "package/dist/index.js",
    "package/dist/bridge.js",
    "package/distribution.json",
    "package/server.json",
    "package/SBOM.cdx.json",
    "package/assets/sourcey-mark.png",
  ]) {
    if (!names.includes(required)) throw new Error(`Packed tarball is missing ${required}.`);
  }
}

function flag(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}
