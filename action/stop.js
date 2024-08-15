const { handleResolveEnv, handleProxyServerPid } = require("../utils/index");

const stopHandler = async () => {
  const env = await handleResolveEnv({});
  const pid = await handleProxyServerPid(env.port);
  if (pid) {
    await handleStopPid(pid);
  }
};

module.exports = stopHandler;
