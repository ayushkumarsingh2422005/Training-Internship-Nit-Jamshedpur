const fs = require("node:fs");
const path = require("node:path");

const version = `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`;
const target = path.join(__dirname, "..", "public", "app-version.json");

fs.writeFileSync(target, `${JSON.stringify({ version }, null, 2)}\n`, "utf8");
console.log(`Wrote app version: ${version}`);
