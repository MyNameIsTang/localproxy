const execa = require("execa");
const chalk = require("chalk");
const path = require("path");
const ora = require("ora");
const inquirer = require("inquirer");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const { fork } = require("child_process");
const { handleProxyServerPid, handleStopPid } = require("../utils/index");
const ConfigHandler = require("../utils/config");

const captchaPath = path.resolve(__dirname, "../tmp/captcha.png");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // 注意：这会使你的应用容易受到MITM攻击
});
/**
 * 处理下载验证码
 *
 * @param {string} target - 目标地址
 * @returns {Promise<string>} - 返回 cookies 字符串
 */
const handleDownloadCaptcha = async (target) => {
  try {
    console.log(
      chalk.green.bold(`获取 ${chalk.yellowBright(target)} 登录验证码:`)
    );
    const spinner = ora("正在下载验证码...").start();
    const captchaData = await downloadCaptcha(target);
    const setCookies = captchaData.cookies;
    const captchaPath = captchaData.captchaPath;
    await openCaptchaImage(captchaPath);
    spinner.succeed();
    return setCookies;
  } catch (error) {
    console.log(chalk.redBright("异常信息：", error?.message));
    console.log(chalk.redBright("获取验证码异常：请检查代理地址是否正常！"));
    return Promise.reject();
  }
};

/**
 * 下载验证码图片并保存到本地
 *
 * @param {string} target - 目标地址
 * @returns {Promise<{cookies: string, captchaPath: string}>} - 返回包含 cookies 和验证码图片路径的对象
 */
const downloadCaptcha = async (target) => {
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
  const captchaPath = path.resolve(tmpPath, "captcha.png");
  fs.writeFileSync(captchaPath, resp.data);
  return { cookies: result, captchaPath };
};

/**
 * 根据平台打开验证码图片
 *
 * @param {string} captchaPath - 验证码图片路径
 * @returns {Promise<void>}
 */
const openCaptchaImage = async (captchaPath) => {
  if (process.platform === "darwin") {
    await execa("open", [captchaPath]);
  } else if (process.platform === "win32") {
    await execa("start", [captchaPath]);
  } else {
    await execa("xdg-open", [captchaPath]);
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

/**
 * 处理登录请求
 *
 * @param param0 登录参数对象
 * @param param0.cookie 当前请求的cookie
 * @param param0.config 登录配置对象
 * @param param0.config.target 目标地址
 * @param param0.config.targetInfo 目标地址相关信息对象
 * @param param0.config.targetInfo.username 用户名
 * @param param0.config.targetInfo.password 密码
 * @returns 登录成功后的cookie字符串，登录失败则返回Promise.reject()
 */
const handleLogin = async ({ cookie, target, config }) => {
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
      url: `${target}/api/login`,
      headers: {
        "content-type": "text/plain;charset=UTF-8",
        referer: `${target}/auth`,
        "x-request-path": "api",
        cookie,
      },
      data: JSON.stringify({
        username: config.username,
        password: config.password,
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
    await handleCacheCookie({ cookie: result, target });
    return result;
  } catch (error) {
    console.log(chalk.redBright("异常信息：", error?.message));
    console.log(
      chalk.redBright("登录异常：请检查代理地址、账号、密码是否正常！")
    );
    return Promise.reject();
  }
};

/**
 * 处理登录账号的函数
 *
 * @returns 返回包含用户名和密码的对象
 */
const handleLoginAccount = async () => {
  const { username, password } = await inquirer.prompt([
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
  ]);
  return { username, password };
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
    const nowTime = Date.now() + params.expired * 1000;
    spinner.succeed();
    ConfigHandler.instance.setPartialValue(params.target, {
      pid: data.pid,
      proxyPort: params.port,
      expired: nowTime,
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

const handleStartServer = async (target, options) => {
  const config = ConfigHandler.instance.get(target);
  let nextCookie = config?.cookie;
  if (!nextCookie) {
    const defaultCookie = await handleDownloadCaptcha(target);
    nextCookie = await handleLogin({
      config,
      target,
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
    target,
    cookie: nextCookie,
    port: config.proxyPort,
    expired: options.expired,
  });
};

const handleChoiceTarget = async () => {
  const keys = ConfigHandler.instance.getKeys();
  if (keys.length === 0) {
    throw new Error(chalk.yellow.bold("缺少代理地址，请重新设置后启动！"));
  }
  const { target } = await inquirer.prompt([
    {
      type: "list",
      name: "target",
      message: "请选择要使用的代理地址：",
      choices: ConfigHandler.instance.getKeys(),
    },
  ]);
  return target;
};

const checkServiceExistence = async (config) => {
  if (!config?.pid) return false;
  try {
    const existPidPath = path.resolve(__dirname, "../scripts/existPid.sh");
    const currentPid = await handleProxyServerPid(config.proxyPort);
    const { stdout } = await execa("bash", [existPidPath, config.pid]);
    return currentPid == config.pid && stdout.includes(currentPid);
  } catch (error) {
    return false;
  }
};

// 检查服务是否可用，是否重启
const checkTargetService = async (target, options) => {
  if (!target) {
    target = await handleChoiceTarget();
  }
  const config = ConfigHandler.instance.get(target);

  // 此时为新增的代理地址
  if (!config) {
    // 重置用户信息
    const info = await handleLoginAccount(target);
    ConfigHandler.instance.setPartialValue(target, info);
    return target;
  }

  const isServiceExist = await checkServiceExistence(config);
  // 时间过期
  if (config.expired < Date.now() || options.retry) {
    if (isServiceExist) {
      const spinner = ora(
        `正在停止 ${chalk.yellow.bold(target)} 代理服务...`
      ).start();
      await handleStopPid(config.pid);
      spinner.succeed();
    }
    const { isNewOne } = await inquirer.prompt([
      {
        type: "confirm",
        name: "isNewOne",
        message: "是否登录新账号：",
      },
    ]);
    if (isNewOne) {
      // 重置用户信息
      const info = await handleLoginAccount(target);
      ConfigHandler.instance.setPartialValue(target, info);
    }
    ConfigHandler.instance.setPartialValue(target, {
      cookie: null,
      expired: null,
    });
  } else if (isServiceExist) {
    throw new Error(
      chalk.yellow.bold(`代理地址：${target} 的代理服务已启用，无需重复开启！`)
    );
  }
  return target;
};

const checkTargetProxyPort = (target, options) => {
  const config = ConfigHandler.instance.get(target);
  if (!config?.proxyPort) {
    ConfigHandler.instance.setPartialValue(target, {
      proxyPort: options.port,
    });
  }
};

const createStartHandler = async (target, options) => {
  try {
    target = await checkTargetService(target, options);
    checkTargetProxyPort(target, options);
    await handleStartServer(target, options);
  } catch (error) {
    console.log(error?.message);
  }
};

module.exports = createStartHandler;
