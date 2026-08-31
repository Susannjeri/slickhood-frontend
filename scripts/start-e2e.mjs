import { cpSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";

const standalone = ".next/standalone/server.js";
const useStandalone = existsSync(standalone);
if (useStandalone) {
  mkdirSync(".next/standalone/.next", { recursive: true });
  cpSync(".next/static", ".next/standalone/.next/static", { recursive: true, force: true });
  if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true, force: true });
}
const command = useStandalone ? process.execPath : (process.platform === "win32" ? "npm.cmd" : "npm");
const args = useStandalone ? [standalone] : ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3100"];
const child = spawn(command, args, {
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: "3100" },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", code => process.exit(code ?? 1));
