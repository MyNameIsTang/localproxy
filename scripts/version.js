const fs = require("fs");
const pkg = require("../package.json");

const [_, v2, __] = pkg.version.split(".");

const now = new Date();
const today =
  now.getFullYear() +
  String(now.getMonth() + 1).padStart(2, "0") +
  String(now.getDate()).padStart(2, "0");

pkg.version = `0.${Number(v2) + 1}.${today}`;

fs.writeFileSync("./package.json", JSON.stringify(pkg, null, 2));
