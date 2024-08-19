const chalk = require("chalk");
const path = require("path");
const execa = require("execa");
const jsyaml = require("js-yaml");
const fs = require("fs");

const configPath = path.resolve(__dirname, "../config.yaml");

const handleCurrentResolveConfig = () => {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(configPath)) {
        resolve({});
        return;
      }
      const data = fs.readFileSync(configPath, { encoding: "utf8" });
      const config = jsyaml.load(data) || {};
      resolve(config);
    } catch (error) {
      console.log(chalk.red.bold("读取配置文件失败，请检查配置是否正确！"));
      reject();
    }
  });
};

const handleSaveConfig = (config) => {
  return new Promise((resolve, reject) => {
    try {
      const result = jsyaml.dump(config);
      fs.writeFileSync(configPath, result);
      resolve();
    } catch (error) {
      reject();
    }
  });
};

const handleProxyServerPid = async (port) => {
  try {
    const portFile = path.resolve(__dirname, "../scripts/port.sh");
    // 找到之前端口对应的PID
    const { stdout } = await execa("bash", [portFile, port]);
    return stdout;
  } catch (error) {
    return;
  }
};

const handleStopPid = async (pid) => {
  // kill PID
  await execa("kill", ["-9", pid]);
};

module.exports = {
  handleProxyServerPid,
  handleStopPid,
  handleCurrentResolveConfig,
  handleSaveConfig,
};
