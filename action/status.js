const { handleResolveEnv, handleProxyServerPid } = require("../utils/index");
const chalk = require("chalk");

const checkStatusHandler = async () => {
  const env = await handleResolveEnv({});
  const pid = await handleProxyServerPid(env.port);

  if (pid) {
    console.log(
      chalk.green.bold(`代理服务已启用，地址：http://localhost:${env.port}`)
    );
    return;
  } else {
    console.log(
      chalk.yellow.bold(
        `代理服务未启动，使用 ${chalk.green.bold("「myproxy start」")} 启动服务`
      )
    );
    if (!env.target) {
      console.log(chalk.green.red("代理服务地址为空，请重新设置"));
      return;
    }
    if (!env.username || !env.password) {
      console.log(chalk.green.red("登录账号、密码为空，请重新设置"));
      return;
    }
  }
};

module.exports = checkStatusHandler;
