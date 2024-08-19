const chalk = require("chalk");
const {
  handleProxyServerPid,
  handleCurrentResolveConfig,
} = require("../utils/index");

const checkStatusHandler = async () => {
  const config = await handleCurrentResolveConfig();
  const defaultProxyTarget = config["defaultProxyTarget"];
  const defaultProxyTargetInfo = config[defaultProxyTarget];
  const pid = await handleProxyServerPid(defaultProxyTargetInfo?.proxyPort);
  if (pid) {
    console.log(
      chalk.green.bold(
        `代理服务已启用，代理地址：${chalk.yellow.bold(
          `http://localhost:${defaultProxyTargetInfo.proxyPort}`
        )}`
      )
    );
    return;
  } else {
    console.log(
      chalk.yellow.bold(
        `代理服务未启动，使用 ${chalk.green.bold("`myproxy start`")} 启动服务`
      )
    );
    if (!defaultProxyTarget) {
      console.log(chalk.green.red("代理服务地址为空，请重新设置"));
      return;
    }
    if (
      !defaultProxyTargetInfo?.login?.username ||
      !defaultProxyTargetInfo?.login?.password
    ) {
      console.log(chalk.green.red("登录账号、密码为空，请重新设置"));
      return;
    }
  }
};

module.exports = checkStatusHandler;
