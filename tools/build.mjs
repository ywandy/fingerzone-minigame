import { access, copyFile, cp, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const copies = [
  ["src/game.js", "dist/game.js"],
  ["src/upgrades.js", "dist/upgrades.js"],
  ["src/web/index.html", "dist/index.html"],
  ["src/web/style.css", "dist/style.css"],
  ["src/web/mobile.css", "dist/mobile.css"],
];

const assetCopies = [
  ["assets/art.webp", "dist/art.webp", "file"],
  ["assets/sprites", "dist/sprites", "directory"],
];

const requiredRuntime = [
  "dist/vendor/laya-loader.js",
  "dist/vendor/laya.core.part-0",
  "dist/vendor/laya.core.part-1",
];

for (const [source, target] of copies) {
  const from = path.join(root, source);
  const to = path.join(root, target);
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
}

for (const [source, target, type] of assetCopies) {
  const from = path.join(root, source);
  const to = path.join(root, target);
  await access(from, constants.R_OK);
  await mkdir(path.dirname(to), { recursive: true });
  if (type === "directory") {
    await cp(from, to, { recursive: true, force: true });
  } else {
    await copyFile(from, to);
  }
}

for (const file of requiredRuntime) {
  await access(path.join(root, file), constants.R_OK);
}

console.log(`Built ${copies.length} source files and ${assetCopies.length} asset groups into dist/.`);
