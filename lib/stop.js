const chalk = require("chalk");
const inquirer = require("inquirer");
const {
  handleProxyServerPid,
  handleStopPid,
  getTargetChoices,
} = require("./utils/index");
const ConfigHandler = require("./utils/config");

const stopHandler = async (target) => {
  let currentTargetInfo,
    currentTarget = target;
  if (target) {
    currentTargetInfo = ConfigHandler.instance.get(target);
  } else {
    const choices = await getTargetChoices();
    if (choices.length === 0) {
      console.log(
        chalk.yellow.bold("缺少代理地址，请重新设置后再停用代理服务！")
      );
      return;
    }
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "target",
        message: "请选择要停用的代理地址：",
        choices,
      },
    ]);
    currentTarget = answer.target;
    currentTargetInfo = ConfigHandler.instance.get(currentTarget);
  }
  const pid = await handleProxyServerPid(currentTargetInfo.proxyPort);
  if (pid == currentTargetInfo.pid) {
    await handleStopPid(pid);
    ConfigHandler.instance.setPartialValue(currentTarget, { pid: undefined });
    console.log(
      chalk.green.bold(
        `代理地址：${chalk.yellow.bold(
          currentTarget
        )} 关联的代理服务：${chalk.yellow.bold(
          `http://localhost:${currentTargetInfo.proxyPort}`
        )} 已停用！`
      )
    );
    ConfigHandler.instance.flush();
  } else {
    console.log(
      chalk.green.bold(
        `代理地址：${chalk.yellow.bold(currentTarget)} 无关联代理服务`
      )
    );
  }
};

module.exports = stopHandler;
