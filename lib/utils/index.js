const execa = require("execa");
const ConfigHandler = require("./config");
const inquirer = require("inquirer");
const chalk = require("chalk");

const handleProxyServerPid = async (port) => {
  // 找到之前端口对应的PID
  const { stdout } = await execa(
    `lsof -i :${port} | grep LISTEN | awk '{print $2}'`,
    [],
    {
      shell: true,
    }
  );
  return stdout;
};

const handleStopPid = async (pid) => {
  // kill PID
  await execa("kill", ["-9", pid]);
};
// 检查服务是否存在
const checkServiceExistence = async (config) => {
  if (!config?.pid) return false;
  try {
    const currentPid = await handleProxyServerPid(config.proxyPort);
    const { stdout } = await execa(
      `ps aux | grep ${config.pid} | grep node`,
      [],
      { shell: true }
    );
    return currentPid == config.pid && stdout.includes(currentPid);
  } catch (error) {
    return false;
  }
};

const handleChoiceTarget = async () => {
  const keys = ConfigHandler.instance.getKeys();
  if (keys.length === 0) {
    throw new Error(chalk.yellow.bold("缺少代理地址，请重新设置后启动！"));
  }
  const { target } = await inquirer.prompt([
    {
      type: "list",
      name: "target",
      message: "请选择要使用的代理地址：",
      choices: ConfigHandler.instance.getKeys(),
    },
  ]);
  return target;
};

const handleResolveTime = (time) => {
  if (time) {
    const date = new Date(time);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${
      date.getDay() + 1
    } ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  }
  return null;
};

module.exports = {
  handleProxyServerPid,
  handleStopPid,
  checkServiceExistence,
  handleChoiceTarget,
  handleResolveTime,
};
