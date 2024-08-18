const createStartHandler = require("../action/start");
const checkStatusHandler = require("../action/status");
const stopHandler = require("../action/stop");

const initCommander = (program) => {
  program
    .command("start [target] [restart]")
    .description("Start a node proxy server")
    .action(createStartHandler);
  // TODO:
  program
    .command("stop")
    .description("Stop node proxy server")
    .action(stopHandler);
  program
    .command("config set <key>=<value> [other...]")
    .description("Setting environment variables")
    .action(createStartHandler);
  program
    .command("status")
    .description("Check whether the proxy service exists")
    .action(checkStatusHandler);
};

module.exports = initCommander;
