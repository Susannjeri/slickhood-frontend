import { cpSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const standalone = ".next/standalone/server.js";
const useStandalone = existsSync(standalone);
if (useStandalone) {
  mkdirSync(".next/standalone/.next", { recursive: true });
  cpSync(".next/static", ".next/standalone/.next/static", { recursive: true, force: true });
  if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true, force: true });
}
const command = process.execPath;
const args = useStandalone ? [standalone] : [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3100"];
const child = spawn(command, args, {
  stdio: "inherit",
  shell: false,
  env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: "3100" },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", code => process.exit(code ?? 1));
