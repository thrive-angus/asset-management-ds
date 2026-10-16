import { copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const releaseCheck = spawnSync(process.execPath, [fileURLToPath(new URL('./release.mjs', import.meta.url)), '--check'], {stdio:'inherit'});
if (releaseCheck.error) throw releaseCheck.error;
if (releaseCheck.status !== 0) process.exit(releaseCheck.status ?? 1);

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");
// Keep a stable stylesheet URL available alongside framework-generated assets.
copyFileSync(new URL("../app/globals.css", import.meta.url), new URL("../public/asset-manager.css", import.meta.url));
const managedLinux = readExecutionProfile() === "managed-linux";

if (managedLinux && command === "build") {
  const result = spawnSync("bash", [
    fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args,
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

// Import in this process so the preview owner retains its PID and signals.
const cli = new URL(managedLinux
  ? "../node_modules/vite/bin/vite.js"
  : "../node_modules/vinext/dist/cli.js", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), command,
  ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []), ...args];
await import(cli.href);
