const chalk = require("chalk");
const inquirer = require("inquirer");
const {
  handleProxyServerPid,
  handleResolveTime,
  getRunningTargetChoices,
} = require("./utils/index");
const ConfigHandler = require("./utils/config");
const CreateStartHandler = require("./start");
const stopHandler = require("./stop");

const checkStatusHandler = async (target) => {
  let currentTargetInfo,
    currentTarget = target;
  if (target) {
    currentTargetInfo = ConfigHandler.instance.get(target);
  } else {
    const choices = await getRunningTargetChoices();
    if (choices.length === 0) {
      console.log(
        chalk.yellow.bold("暂无正在运行的代理服务，使用 `lp start` 启动服务")
      );
      return;
    }
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "target",
        message: "请选择要查看的代理服务：",
        choices,
      },
    ]);
    currentTarget = answer.target;
    currentTargetInfo = ConfigHandler.instance.get(currentTarget);
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

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "请选择操作：",
        choices: [
          { name: "重启代理服务", value: "restart" },
          { name: "关闭代理服务", value: "stop" },
          { name: "不做任何操作", value: "none" },
        ],
      },
    ]);

    if (action === "restart") {
      await CreateStartHandler.instance.init(currentTarget, { retry: true });
    } else if (action === "stop") {
      await stopHandler(currentTarget);
    }

    return;
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
