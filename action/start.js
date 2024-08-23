const execa = require("execa");
const chalk = require("chalk");
const path = require("path");
const ora = require("ora");
const inquirer = require("inquirer");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const { fork } = require("child_process");
const { handleProxyServerPid } = require("../utils/index");
const ConfigHandler = require("../utils/config");

const captchaPath = path.resolve(__dirname, "../tmp/captcha.png");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // 注意：这会使你的应用容易受到MITM攻击
});
const handleDownloadCaptcha = async (target) => {
  try {
    console.log(
      chalk.green.bold(`获取 ${chalk.yellowBright(target)} 登录验证码:`)
    );
    const spinner = ora("正在下载验证码...").start();
    const currentTime = new Date().getTime();
    const resp = await axios({
      method: "GET",
      url: `${target}/api/noauth/captcha?${currentTime}`,
      headers: {
        accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        referer: `${target}/auth`,
      },
      responseType: "arraybuffer",
      httpsAgent,
    });
    const setCookies = resp.headers.get("set-cookie") || [];
    const result = setCookies.map((x) => x.split(";")[0].trim()).join(";");
    const tmpPath = path.resolve(__dirname, "../tmp");
    if (!fs.existsSync(tmpPath)) {
      fs.mkdirSync(tmpPath);
    }
    fs.writeFileSync(captchaPath, resp.data, "binary");
    execa("open", [captchaPath]);
    spinner.succeed();
    return result;
  } catch (error) {
    console.log(chalk.redBright("异常信息：", error?.message));
    console.log(chalk.redBright("获取验证码异常：请检查代理地址是否正常！"));
    return Promise.reject();
  }
};

const handleCacheCookie = async ({ cookie, target }) => {
  const { isCache } = await inquirer.prompt([
    {
      type: "confirm",
      name: "isCache",
      message: "是否缓存Cookie？",
    },
  ]);
  if (isCache) {
    ConfigHandler.instance.setPartialValue(target, { cookie });
  }
};

const handleLogin = async ({ cookie, config }) => {
  const { captcha } = await inquirer.prompt([
    {
      type: "input",
      name: "captcha",
      message: "请输入验证码：",
    },
  ]);
  try {
    const resp = await axios({
      method: "POST",
      url: `${config.target}/api/login`,
      headers: {
        "content-type": "text/plain;charset=UTF-8",
        referer: `${config.target}/auth`,
        "x-request-path": "api",
        cookie,
      },
      data: JSON.stringify({
        username: config.targetInfo.username,
        password: config.targetInfo.password,
        captcha,
      }),
      httpsAgent,
    });
    // 删除缓存的验证码
    if (fs.existsSync(captchaPath)) {
      fs.rmSync(captchaPath);
    }
    const setCookies = resp.headers.get("set-cookie") || [];
    const result = setCookies.map((x) => x.split(";")[0].trim()).join("; ");

    await handleCacheCookie({ cookie: result, target: config.target });

    return result;
  } catch (error) {
    console.log(chalk.redBright("异常信息：", error?.message));
    console.log(
      chalk.redBright("登录异常：请检查代理地址、账号、密码是否正常！")
    );
    return Promise.reject();
  }
};

const handleResolveTarget = async ({ target, port }) => {
  const targetInfo = ConfigHandler.instance.get(target);
  try {
    if (!target) {
      console.log(
        chalk.red.bold("未设置代理服务器地址，无法启动服务，请检查配置！")
      );
      return Promise.reject();
    }
    if (!targetInfo || !targetInfo.username || !targetInfo.password) {
      const { username, password, isSave } = await inquirer.prompt([
        {
          type: "input",
          name: "username",
          message: "请输入账号：",
        },
        {
          type: "input",
          name: "password",
          message: "请输入密码：",
        },
        {
          type: "confirm",
          name: "isSave",
          message: "是否缓存用户登录信息？",
        },
      ]);
      const result = {
        proxyPort: port,
        username,
        password,
      };
      ConfigHandler.instance.set(
        target,
        isSave
          ? result
          : {
              proxyPort: port,
            }
      );
      return {
        target,
        targetInfo: result,
      };
    } else {
      return {
        target,
        targetInfo,
      };
    }
  } catch (error) {
    console.log("设置配置文件失败，请检查配置是否正确！", error.message);
    return Promise.reject();
  }
};

const handleNodeProcess = (params) => {
  return new Promise((resolve) => {
    const env = Object.entries(params).reduce(
      (pre, [key, value]) => Object.assign(pre, { [key.toUpperCase()]: value }),
      {}
    );
    const appPath = path.resolve(__dirname, "../app.js");
    const child = fork(appPath, {
      env,
    });
    child.on("message", (data) => {
      resolve({ ...data, pid: child.pid });
    });
  });
};

const handleNodeChildProcess = async (params) => {
  const spinner = ora("代理服务正在启动...").start();
  const data = await handleNodeProcess(params);
  if (data.code === "SUCCESS") {
    spinner.succeed();
    ConfigHandler.instance.setPartialValue(params.target, {
      pid: data.pid,
      proxyPort: params.port,
    });
    ConfigHandler.instance.flush();
    console.log(
      chalk.green.bold(
        `代理服务启用成功，地址：${chalk.yellow.bold(
          `http://localhost:${params.port}`
        )}`
      )
    );
    process.exit();
  }
  if (data.code === "EADDRINUSE") {
    spinner.warn();
    const nextPort = params.port + 1;
    const { isContinue } = await inquirer.prompt([
      {
        type: "confirm",
        name: "isContinue",
        message: `端口： ${params.port} 已被占用，是否尝试端口：${nextPort} ?`,
      },
    ]);
    if (!isContinue) {
      return;
    }
    handleNodeChildProcess({ ...params, port: nextPort });
  }
  if (data.code === "ERROR") {
    spinner.fail();
    console.log(chalk.red.bold(`代理服务启用失败，错误原因：${data.message}`));
    return;
  }
};

const handleCheckServicesExist = async (config) => {
  if (!config.targetInfo.pid) return false;
  try {
    const existPidPath = path.resolve(__dirname, "../scripts/existPid.sh");
    const pid = await handleProxyServerPid(config.targetInfo.proxyPort);
    const { stdout } = await execa("bash", [
      existPidPath,
      config.targetInfo.pid,
    ]);
    if (stdout && config.targetInfo.pid == pid) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const handleStartServer = async (config) => {
  const isExist = await handleCheckServicesExist(config);
  if (isExist) {
    console.log(
      chalk.yellow.bold(
        `代理地址：${config.target} 的代理服务已启用，无需重复开启！`
      )
    );
    return;
  }
  let nextCookie = config.targetInfo.cookie;
  if (!nextCookie) {
    const defaultCookie = await handleDownloadCaptcha(config.target);
    nextCookie = await handleLogin({
      config,
      cookie: defaultCookie,
    });
  }
  const { isStart } = await inquirer.prompt([
    {
      type: "confirm",
      name: "isStart",
      message: "是否启用代理服务：",
    },
  ]);
  if (!isStart) {
    console.log(
      chalk.red.bold(`cookie为：${chalk.green(nextCookie)} ，请谨慎使用！`)
    );
    return;
  }
  handleNodeChildProcess({
    target: config.target,
    cookie: nextCookie,
    port: config.targetInfo.proxyPort,
  });
};

const createStartHandler = async (target, options) => {
  try {
    if (target) {
      const config = await handleResolveTarget({ target, ...options });
      await handleStartServer(config);
    } else {
      const keys = ConfigHandler.instance.getKeys();
      if (keys.length === 0) {
        console.log(chalk.yellow.bold("缺少代理地址，请重新设置后启动！"));
        return;
      }
      const { target } = await inquirer.prompt([
        {
          type: "list",
          name: "target",
          message: "请选择要使用的代理地址：",
          choices: ConfigHandler.instance.getKeys(),
        },
      ]);
      const targetInfo = ConfigHandler.instance.get(target);
      const params = {
        target,
        targetInfo: targetInfo,
      };
      await handleStartServer(params);
    }
  } catch (error) {
    console.log("服务异常：", error?.message);
  }
};

module.exports = createStartHandler;
