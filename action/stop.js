const chalk = require("chalk");
const {
  handleProxyServerPid,
  handleStopPid,
  handleCurrentResolveConfig,
} = require("../utils/index");

const stopHandler = async (target) => {
  const config = await handleCurrentResolveConfig();
  const defaultProxyTarget = config["defaultProxyTarget"];
  const defaultProxyTargetInfo = config[defaultProxyTarget];
  const pid = await handleProxyServerPid(defaultProxyTargetInfo?.proxyPort);
  if (pid) {
    await handleStopPid(pid);
    console.log(
      chalk.green.bold(
        `${chalk.yellow.bold(defaultProxyTarget)} 代理服务已停止！`
      )
    );
  }
};

module.exports = stopHandler;
