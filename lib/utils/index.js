const execa = require("execa");
const ConfigHandler = require("./config");
const inquirer = require("inquirer");
const chalk = require("chalk");
const path = require("path");
const os = require("os");

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

const getTargetChoices = async () => {
  const keys = ConfigHandler.instance.getKeys();
  const choices = await Promise.all(
    keys.map(async (key) => {
      const config = ConfigHandler.instance.get(key);
      let isRunning = false;
      try {
        isRunning = await checkServiceExistence(config);
      } catch (error) {
        isRunning = false;
      }

      let label = key;
      if (isRunning) {
        if (config && config.proxyPort) {
          label = `${key} ${chalk.green("【启动中:" + config.proxyPort + "】")}`;
        } else {
          label = `${key} ${chalk.green("【启动中】")}`;
        }
      }

      return {
        name: label,
        value: key,
      };
    })
  );
  return choices;
};

const handleChoiceTarget = async () => {
  const choices = await getTargetChoices();
  if (choices.length === 0) {
    throw new Error(chalk.yellow.bold("缺少代理地址，请重新设置后启动！"));
  }

  const { target } = await inquirer.prompt([
    {
      type: "list",
      name: "target",
      message: "请选择要使用的代理地址：",
      choices,
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

function handleConfigPath() {
  const configDir = path.join(os.homedir(), ".proxy-package");
  const configPath = path.join(configDir, "config.yaml");
  return {
    dir: configDir,
    path: configPath,
  };
}

module.exports = {
  handleProxyServerPid,
  handleStopPid,
  checkServiceExistence,
  getTargetChoices,
  handleChoiceTarget,
  handleResolveTime,
  handleConfigPath,
};
