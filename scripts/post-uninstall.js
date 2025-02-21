// scripts/post-uninstall.js
const fs = require("fs");
const { handleConfigPath } = require("../lib/utils");

function init() {
  const { dir } = handleConfigPath();
  if (fs.existsSync(dir)) {
    fs.rmdirSync(dir, { recursive: true });
  }
}

init();
