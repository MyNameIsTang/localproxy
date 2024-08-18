const execa = require("execa");
const chalk = require("chalk");
const path = require("path");
const ora = require("ora");
const inquirer = require("inquirer");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const {
  handleProxyServerPid,
  handleStopPid,
  handleCurrentResolveConfig,
  handleSaveConfig,
} = require("../utils/index");

const cwdPath = path.resolve(__dirname, "../");
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

const handleCacheCookie = async ({ target, cookie }) => {
  const { isCache } = await inquirer.prompt([
    {
      type: "confirm",
      name: "isCache",
      message: "是否缓存Cookie？",
    },
  ]);
  if (isCache) {
    const config = await handleCurrentResolveConfig();
    config[target]["login"]["cookie"] = cookie;
    await handleSaveConfig(config);
    console.log(chalk.green.bold("Cookie 缓存成功"));
  }
};

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
        username: config.login.username,
        password: config.login.password,
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

    await handleCacheCookie({ target, cookie: result });

    return result;
  } catch (error) {
    console.log(chalk.redBright("异常信息：", error?.message));
    console.log(
      chalk.redBright("登录异常：请检查代理地址、账号、密码是否正常！")
    );
    return Promise.reject();
  }
};

const handleStop = async ({ proxyPort }) => {
  // 找到之前端口对应的PID
  const pid = await handleProxyServerPid(proxyPort);
  if (pid) {
    await handleStopPid(pid);
  }
};

const handleResolveConfig = async ({ target }) => {
  const config = await handleCurrentResolveConfig();
  try {
    const preLogin = config[target];
    if (preLogin) {
      return preLogin;
    } else {
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
        proxyPort: 3333,
        login: {
          username,
          password,
        },
      };
      if (isSave) {
        await handleSaveConfig({
          ...config,
          [target]: result,
        });
      }
      return result;
    }
  } catch (error) {
    console.log("设置配置文件失败，请检查配置是否正确！", error.message);
  }
};

const createStartHandler = async (target, restart) => {
  let config = await handleResolveConfig({ target });
  if (restart || !config?.login?.cookie) {
    await handleStop(config);
    const defaultCookie = await handleDownloadCaptcha(target);
    config.login["cookie"] = await handleLogin({
      target,
      cookie: defaultCookie,
      config,
    });
  }
  const { isStart } = await inquirer.prompt([
    {
      type: "confirm",
      name: "isStart",
      message: "是否启动代理服务：",
    },
  ]);
  if (isStart) {
    const env = Object.entries({
      target,
      cookie: config.login.cookie,
      port: config.proxyPort,
    }).reduce(
      (pre, [key, value]) => Object.assign(pre, { [key.toUpperCase()]: value }),
      {}
    );
    const spinner = ora("代理服务正在启动...").start();
    execa("node", ["app.js"], {
      cwd: cwdPath,
      detached: true,
      env,
    });
    setTimeout(() => {
      spinner.succeed();
      console.log(
        chalk.green.bold(`代理服务启动成功，地址：http://localhost:${config.proxyPort}`)
      );
      process.exit();
    }, 4000);
  } else {
    console.log(
      chalk.red.bold(
        `cookie为：${chalk.green(config.login.cookie)} ，请谨慎使用`
      )
    );
  }
};

module.exports = createStartHandler;
