const chalk = require("chalk");
const path = require("path");
const execa = require("execa");

const handleResolveEnv = ({ target, username, password }) => {
  return new Promise((resolve, reject) => {
    const env = {
      target: process.env.TARGET || target,
      username: process.env.USERNAME || username,
      password: process.env.PASSWORD || password,
      port: process.env.PORT || 3333,
    };

    if (!env.target) {
      console.log(
        chalk.red.bold(
          "代理地址为空，无法获取必要信息，请重新输入或设置后再启动服务！"
        )
      );
      reject();
    }
    if (!env.username || !env.password) {
      console.log(
        chalk.red.bold("账号或密码为空，请重新输入或设置后再启动服务！")
      );
      reject();
    }
    resolve(env);
  });
};

const handleProxyServerPid = async (port) => {
  const portFile = path.resolve(__dirname, "../scripts/port.sh");
  // 找到之前端口对应的PID
  const { stdout } = await execa("bash", [portFile, port]);
  return stdout;
};

const handleStopPid = async (pid) => {
  // kill PID
  await execa("kill", ["-9", pid]);
  console.log(chalk.yellow.bold("代理服务已停止！"));
};

module.exports = {
  handleResolveEnv,
  handleProxyServerPid,
  handleStopPid,
};
