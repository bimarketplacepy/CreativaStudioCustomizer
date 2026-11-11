// pnpm --filter @workspace/api-server test — corre src/**/*.test.ts con node --test.
// Cada prueba se empaqueta antes con esbuild: el código del server importa sin
// extensión ("./odoo"), algo que Node no resuelve solo. Sin red ni base.
import { build } from "esbuild";
import { readdirSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tests = readdirSync(join(root, "src/lib")).filter(f => f.endsWith(".test.ts")).map(f => join(root, "src/lib", f));
// Dentro del paquete: los imports externos (pino, drizzle…) se resuelven desde su node_modules.
mkdirSync(join(root, "node_modules/.cache"), { recursive: true });
const out = mkdtempSync(join(root, "node_modules/.cache/api-tests-"));
try {
  await build({
    entryPoints: tests, outdir: out, bundle: true, platform: "node", format: "esm", outExtension: { ".js": ".mjs" },
    packages: "external", logLevel: "warning", sourcemap: "inline",
    banner: { js: 'import{createRequire}from"module";const require=createRequire(import.meta.url);' },
  });
  const files = readdirSync(out).filter(f => f.endsWith(".mjs")).map(f => join(out, f));
  const r = spawnSync(process.execPath, ["--enable-source-maps", "--test", ...files], { stdio: "inherit", cwd: root, env: { ...process.env, LOG_LEVEL: "silent" } });
  process.exitCode = r.status ?? 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
