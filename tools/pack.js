// Packages extension/ into dist/adkalkan-<version>.zip for Chrome Web Store
// upload. manifest.json must sit at the archive root.
import { readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "extension");
const DIST = path.join(ROOT, "dist");
const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));

if (!existsSync(path.join(EXT, "manifest.json"))) {
  console.error("extension/manifest.json missing - run `npm run build` first.");
  process.exit(1);
}

mkdirSync(DIST, { recursive: true });
const zip = path.join(DIST, `adkalkan-${pkg.version}.zip`);
rmSync(zip, { force: true });

// Compress-Archive with -Path extension/* keeps manifest.json at the archive root.
const ps = spawnSync(
  "powershell",
  ["-NoProfile", "-Command", `Compress-Archive -Path "${EXT}\\*" -DestinationPath "${zip}" -CompressionLevel Optimal -Force`],
  { stdio: "inherit" }
);

if (ps.status !== 0 || !existsSync(zip)) {
  console.error("packaging failed");
  process.exit(1);
}

console.log(`packaged: dist/adkalkan-${pkg.version}.zip (extension/ contents, manifest.json at root)`);
