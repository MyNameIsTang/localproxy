const path = require("path");
const execa = require("execa");

const handleProxyServerPid = async (port) => {
  const portFile = path.resolve(__dirname, "../scripts/port.sh");
  // 找到之前端口对应的PID
  const { stdout } = await execa("bash", [portFile, port]);
  return stdout;
};

const handleStopPid = async (pid) => {
  // kill PID
  await execa("kill", ["-9", pid]);
};

module.exports = {
  handleProxyServerPid,
  handleStopPid,
};
