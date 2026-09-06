import { rmSync } from "node:fs";
import { resolve } from "node:path";

const buildOutput = resolve(process.cwd(), ".next");
const expectedOutput = resolve(process.cwd()) + "\\.next";

if (process.platform === "win32" && buildOutput.toLowerCase() !== expectedOutput.toLowerCase()) {
  throw new Error("Refusing to clean an unexpected build-output path.");
}
if (process.platform !== "win32" && buildOutput !== `${resolve(process.cwd())}/.next`) {
  throw new Error("Refusing to clean an unexpected build-output path.");
}

rmSync(buildOutput, { recursive: true, force: true });
