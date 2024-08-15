const execa = require("execa");
const chalk = require("chalk");
const path = require("path");
const ora = require("ora");
const inquirer = require("inquirer");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const {
  handleResolveEnv,
  handleProxyServerPid,
  handleStopPid,
} = require("../utils/index");

const cwdPath = path.resolve(__dirname, "../");
const envFile = path.resolve(__dirname, "../.env.local");
const captchaImage = path.resolve(__dirname, "../tmp/captcha.png");

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
    fs.writeFileSync(captchaImage, resp.data, "binary");
    execa("open", [captchaImage]);
    spinner.succeed();
    return result;
  } catch (error) {
    console.log(chalk.redBright("异常信息：", error?.message));
    console.log(chalk.redBright("获取验证码异常：请检查代理地址是否正常！"));
    return Promise.reject();
  }
};

const handleLogin = async ({ cookie, target, username, password }) => {
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
        username,
        password,
        captcha,
      }),
      httpsAgent,
    });
    // 删除缓存的验证码
    if (fs.existsSync(captchaImage)) {
      fs.rmSync(captchaImage);
    }
    const setCookies = resp.headers.get("set-cookie") || [];
    const result = setCookies.map((x) => x.split(";")[0].trim()).join("; ");
    return result;
  } catch (error) {
    console.log(chalk.redBright("异常信息：", error?.message));
    console.log(
      chalk.redBright("登录异常：请检查代理地址、账号、密码是否正常！")
    );
    return Promise.reject();
  }
};

// TODO:
const handleSaveEnv = (params) => {
  const result = Object.entries({ ...params, port: 3333 })
    .map(([key, value]) => `${key.toUpperCase()}=${value}`)
    .join("\n");
  // 输出到env文件中
  const b = Buffer.from(result, "utf-8").toString("binary");
  fs.writeFileSync(envFile, b, "binary");
};

const handleStop = async ({ port }) => {
  // 找到之前端口对应的PID
  const pid = await handleProxyServerPid(port);
  if (pid) {
    await handleStopPid(pid);
  }
};

const createStartHandler = async (target, username, password) => {
  const env = await handleResolveEnv({ target, username, password });
  await handleStop(env);
  const defaultCookie = await handleDownloadCaptcha(env.target);
  const nextCookie = await handleLogin({
    cookie: defaultCookie,
    ...env,
  });
  handleSaveEnv({ cookie: `'${nextCookie}'`, ...env });
  const { isStart } = await inquirer.prompt([
    {
      type: "confirm",
      name: "isStart",
      message: "是否启动代理服务：",
    },
  ]);
  if (isStart) {
    const spinner = ora("代理服务正在启动...").start();
    execa("node", ["app.js"], {
      cwd: cwdPath,
      detached: true,
    });
    setTimeout(() => {
      spinner.succeed();
      console.log(
        chalk.green.bold(`代理服务启动成功，地址：http://localhost:${env.port}`)
      );
      process.exit();
    }, 4000);
  } else {
    console.log(
      chalk.red.bold(`cookie为：${chalk.green(nextCookie)} ，请谨慎使用`)
    );
  }
};

module.exports = createStartHandler;