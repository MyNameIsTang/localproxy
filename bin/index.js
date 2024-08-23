#! /usr/bin/env node

const { program } = require("commander");
const path = require("path");
const initCommander = require("../core/commander");
const ConfigHandler = require("../utils/config");

function initConfig() {
  const configPath = path.resolve(__dirname, "../config.yaml");
  ConfigHandler.instance.init(configPath);
}

initConfig();
initCommander(program);

program.parse();
