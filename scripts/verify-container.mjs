import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { exerciseBridge } from "../test/harness.mjs";

const image = process.argv[2];
if (!image) throw new Error("Usage: node scripts/verify-container.mjs <image>");

const fixture = fileURLToPath(new URL("../test/container-upstream.mjs", import.meta.url));
const child = spawn(
  "docker",
  [
    "run",
    "--interactive",
    "--rm",
    "--volume",
    `${fixture}:/tmp/sourcey-upstream.mjs:ro`,
    "--env",
    "SOURCEY_MCP_URL=http://127.0.0.1:4310/mcp",
    "--entrypoint",
    "sh",
    image,
    "-c",
    "node /tmp/sourcey-upstream.mjs & exec node dist/index.js",
  ],
  { stdio: ["pipe", "pipe", "pipe"] },
);
try {
  await exerciseBridge(child);
} finally {
  if (child.exitCode === null) child.kill("SIGKILL");
}
