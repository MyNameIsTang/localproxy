#! /usr/bin/env node

const { program } = require("commander");
const dotenv = require("dotenv");
const path = require("path");

const initCommander = require("../core/commander");

function initEnv() {
  const envFile = path.resolve(__dirname, "../.env.local");
  dotenv.config({ path: envFile });
}

initEnv();
initCommander(program);

program.parse();
