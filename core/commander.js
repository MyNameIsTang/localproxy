const createStartHandler = require("../action/start");

const initCommander = (program) => {
  program
    .command("start [target] [username] [password]")
    .description("start a node proxy server")
    .action(createStartHandler);
  // TODO:
  program
    .command("stop")
    .description("stop node proxy server")
    .action(createStartHandler);
  program
    .command("config set <key>=<value> [other...]")
    .description("setting environment variables")
    .action(createStartHandler);
};

module.exports = initCommander;
