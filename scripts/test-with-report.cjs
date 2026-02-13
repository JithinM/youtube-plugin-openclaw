const { spawnSync } = require("child_process");

const vitest = spawnSync("npx", ["vitest", "run"], { stdio: "inherit", shell: true });
spawnSync("node", ["scripts/generate-html-report.cjs"], { stdio: "inherit" });
process.exit(vitest.status ?? 1);
