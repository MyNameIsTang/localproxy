const {
  handleChoiceTarget,
  checkServiceExistence,
  handleStopPid,
} = require("./utils/index");
const ora = require("ora");
const inquirer = require("inquirer");
const ConfigHandler = require("./utils/config");
const CreateStartHandler = require("./start");
const chalk = require("chalk");

const handleResolveTime = (time) => {
  if (time) {
    const date = new Date(time);
    return `${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDay()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  }
  return null;
};

const configChangeHandler = async (target, options) => {
  let currentTargetInfo,
    currentTarget = target;
  if (target) {
    currentTargetInfo = ConfigHandler.instance.get(target);
  } else {
    currentTarget = await handleChoiceTarget();
    currentTargetInfo = ConfigHandler.instance.get(currentTarget);
  }
  if (options.get) {
    console.log(`${chalk.red.bold("代理地址")}：${chalk.green.bold(
      currentTarget
    )}
${chalk.red.bold("账号")}：${chalk.green.bold(currentTargetInfo.username)}
${chalk.red.bold("密码")}：${chalk.green.bold(currentTargetInfo.password)}
${chalk.red.bold("端口号")}：${chalk.green.bold(currentTargetInfo.proxyPort)}
${chalk.red.bold("过期时间")}：${chalk.green.bold(
      handleResolveTime(currentTargetInfo.expired)
    )}
${chalk.red.bold("Cookie")}：${chalk.green.bold(currentTargetInfo.cookie)}
    `);
    return;
  }
  const computedTime = handleResolveTime(currentTargetInfo.expired);
  // 更新用户名、密码，代理端口、过期时间
  let { username, password, proxyPort, expired } = await inquirer.prompt([
    {
      type: "input",
      name: "username",
      message: "请输入账号：",
      default: currentTargetInfo.username,
    },
    {
      type: "input",
      name: "password",
      message: "请输入密码：",
      default: currentTargetInfo.password,
    },
    {
      type: "number",
      name: "proxyPort",
      message: "请输入代理端口：",
      default: currentTargetInfo.proxyPort,
    },
    {
      type: "input",
      name: "expired",
      message: "请输入过期时间(秒)：",
      default: computedTime,
    },
  ]);
  // 转换过期时间
  expired = expired === computedTime ? undefined : expired;
  const preValues = [
    currentTargetInfo.username,
    currentTargetInfo.password,
    currentTargetInfo.proxyPort,
  ];
  if (
    [username, password, proxyPort, expired].some((x, i) => {
      const item = preValues[i];
      return x !== item;
    })
  ) {
    ConfigHandler.instance.setPartialValue(currentTarget, {
      username,
      password,
      proxyPort,
      cookie: null,
    });
    const isServiceExist = await checkServiceExistence(currentTargetInfo);
    if (isServiceExist) {
      const spinner = ora("配置项已更新，正在停止原代理服务...").start();
      await handleStopPid(currentTargetInfo.pid);
      spinner.succeed();
      await CreateStartHandler.instance.handleStartServer(currentTarget, {
        expired,
      });
    }
  }
};

module.exports = configChangeHandler;
