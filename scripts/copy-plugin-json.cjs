const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "openclaw.plugin.json");
const dest = path.join(__dirname, "..", "dist", "openclaw.plugin.json");

const distDir = path.dirname(dest);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.copyFileSync(src, dest);
