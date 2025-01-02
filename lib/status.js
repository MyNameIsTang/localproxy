const chalk = require("chalk");
const inquirer = require("inquirer");
const { handleProxyServerPid, handleResolveTime } = require("./utils/index");
const ConfigHandler = require("./utils/config");

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
        `代理服务已启用!
${chalk.red.bold("账号")}：${chalk.green.bold(currentTargetInfo.username)}
${chalk.red.bold("代理地址")}：${chalk.green.bold(currentTarget)}
${chalk.red.bold("服务地址")}：${chalk.green.bold(
          `http://localhost:${currentTargetInfo.proxyPort}`
        )}
${chalk.red.bold("过期时间")}：${chalk.green.bold(
          handleResolveTime(currentTargetInfo.expired)
        )}
        `
      )
    );
  } else {
    console.log(
      chalk.yellow.bold(
        `代理服务未启动，使用 ${chalk.green.bold("`lp start`")} 启动服务`
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
