const createStartHandler = require("../action/start");
const checkStatusHandler = require("../action/status");
const stopHandler = require("../action/stop");
const configChangeHandler = require("../action/config");

const initCommander = (program) => {
  program
    .command("start [target]")
    .option("-p, --port <VALUE>", "proxy port", 3000)
    .option(
      "-e, --expired <VALUE>",
      "expiration time（seconds）",
      3 * 24 * 60 * 60
    )
    .description("Start a node proxy server")
    .action(createStartHandler);
  program
    .command("stop [target]")
    .description("Stop node proxy server")
    .action(stopHandler);
  program
    .command("config set <key>=<value> [other...]")
    .description("Setting environment variables")
    .action(configChangeHandler);
  program
    .command("status [target]")
    .description("Check whether the proxy service exists")
    .action(checkStatusHandler);
};

module.exports = initCommander;
