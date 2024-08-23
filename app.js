const express = require("express");
const https = require("https");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // 注意：这会使你的应用容易受到MITM攻击
});

app.use(
  "/",
  createProxyMiddleware({
    target: process.env.TARGET,
    changeOrigin: true,
    agent: httpsAgent,
    on: {
      proxyReq: (proxyReq, req, res) => {
        if (process.env.COOKIE) {
          proxyReq.setHeader("cookie", process.env.COOKIE);
        }
      },
      error: (err, req, res) => {
        console.log(err);
      },
    },
  })
);

app
  .listen(process.env.PORT, () => {
    process.send({ code: "SUCCESS" });
  })
  .on("error", (err) => {
    // 这里的 error 事件处理器会捕获服务启动时的错误
    if (err.code === "EADDRINUSE") {
      // 端口已被占用的错误处理
      process.send({ code: "EADDRINUSE" });
    } else {
      // 其他类型的错误处理
      process.send({ code: "ERROR", message: err.message });
    }
  });
