const chalk = require("chalk");
const inquirer = require("inquirer");
const { handleProxyServerPid } = require("../utils/index");
const ConfigHandler = require("../utils/config");

const checkStatusHandler = async (target) => {
  let currentTargetInfo,
    currentTarget = target;
  if (target) {
    currentTargetInfo = ConfigHandler.instance.get(target);
  } else {
    const { target } = await inquirer.prompt([
      {
        type: "list",
        name: "target",
        message: "请选择要查看的代理服务：",
        choices: ConfigHandler.instance.getKeys(),
      },
    ]);
    currentTarget = target;
    currentTargetInfo = ConfigHandler.instance.get(target);
  }
  const pid = await handleProxyServerPid(currentTargetInfo.proxyPort);
  if (pid == currentTargetInfo.pid) {
    console.log(
      chalk.green.bold(
        `代理服务已启用，代理地址：${chalk.yellow.bold(
          currentTarget
        )}，服务地址：${chalk.yellow.bold(
          `http://localhost:${currentTargetInfo.proxyPort}`
        )}`
      )
    );
  } else {
    console.log(
      chalk.yellow.bold(
        `代理服务未启动，使用 ${chalk.green.bold("`myproxy start`")} 启动服务`
      )
    );
    if (!currentTarget) {
      console.log(chalk.green.red("代理服务地址为空，请重新设置"));
      return;
    }
    if (!currentTargetInfo.username || !currentTargetInfo.password) {
      console.log(chalk.green.red("登录账号、密码为空，请重新设置"));
      return;
    }
  }
};

module.exports = checkStatusHandler;
