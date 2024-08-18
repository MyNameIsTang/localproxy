const { handleResolveEnv, handleProxyServerPid, handleStopPid } = require("../utils/index");

const stopHandler = async (target) => {
  const env = await handleResolveEnv({});
  const pid = await handleProxyServerPid(env.port);
  if (pid) {
    await handleStopPid(pid);
  }
};

module.exports = stopHandler;
