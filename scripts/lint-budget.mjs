import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const warningBudget = Number.parseInt(process.env.ESLINT_WARNING_BUDGET ?? "478", 10);
if (!Number.isInteger(warningBudget) || warningBudget < 0) {
  throw new Error("ESLINT_WARNING_BUDGET must be a non-negative integer");
}

const require = createRequire(import.meta.url);
const eslintCli = resolve(dirname(require.resolve("eslint/package.json")), "bin", "eslint.js");
const result = spawnSync(process.execPath, [eslintCli, ".", "--format", "json"], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
  shell: process.platform === "win32",
});
if (result.error) throw result.error;

let report;
try {
  report = JSON.parse(result.stdout || "[]");
} catch {
  process.stderr.write(result.stderr || result.stdout);
  throw new Error("ESLint did not return a valid JSON report");
}

const totals = report.reduce(
  (sum, file) => ({ errors: sum.errors + file.errorCount, warnings: sum.warnings + file.warningCount }),
  { errors: 0, warnings: 0 },
);
console.log(`ESLint: ${totals.errors} errors, ${totals.warnings}/${warningBudget} warning budget`);
if (totals.errors > 0 || totals.warnings > warningBudget) process.exit(1);
