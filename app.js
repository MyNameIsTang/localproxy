const express = require("express");
const https = require("https");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config({
  path: ".env.local",
});

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

app.listen(process.env.PORT, () => {
  console.log(
    `Proxy server is running on http://localhost:${process.env.PORT}`
  );
});
