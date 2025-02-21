#! /usr/bin/env node

const { program } = require("commander");
const ConfigHandler = require("../lib/utils/config");
const CreateStartHandler = require("../lib/start");
const checkStatusHandler = require("../lib/status");
const stopHandler = require("../lib/stop");
const configChangeHandler = require("../lib/config");
const { handleConfigPath } = require("../lib/utils");

function initCommander(program) {
  program
    .command("start [target]")
    .option("-p, --port <VALUE>", "proxy port")
    .option(
      "-e, --expired <VALUE>",
      "expiration time（seconds）",
      3 * 24 * 60 * 60
    )
    .option("-r, --retry", "Whether to retry", false)
    .description("Start a node proxy server")
    .action(CreateStartHandler.instance.init.bind(CreateStartHandler.instance));
  program
    .command("stop [target]")
    .description("Stop node proxy server")
    .action(stopHandler);
  program
    .command("config [target]")
    .option("-e, --edit", "Open an editor", true)
    .option("-g, --get", "Get value: name [value-regex]")
    .description("Setting environment variables")
    .action(configChangeHandler);
  program
    .command("status [target]")
    .description("Check whether the proxy service exists")
    .action(checkStatusHandler);
}

function initConfig() {
  const { path } = handleConfigPath();
  ConfigHandler.instance.init(path);
}
// 初始化配置
initConfig();
// 初始化命令行
initCommander(program);

program.parse();
