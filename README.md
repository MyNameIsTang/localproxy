## localproxy

用于测试环境代理服务
测试环境中需要用到验证码、用户登录，且使用 restFul API

1. 验证码获取接口：/api/noauth/captcha?[时间戳]
2. 登录接口：/api/login

### Usage

1. 下载指令：

```
  npm i @fckname/localproxy -g
```

1. 指令

   - start [options] [target] 启动一个 node 代理服务，配置项如下:
     - -p, --port <VALUE> 代理端口
     - -e, --expired <VALUE> 过期时间（秒） (default: 3 _ 24 _ 60 \* 60)
     - -r, --retry 是否重启 (default: false)
   - stop [target] 停止 node 代理服务
   - config [options] [target] 设置 node 服务的环境变量，配置项如下：
     - -e, --edit 开启编辑模式 (default: true)
     - -g, --get 获取 value: name [value-regex]
   - status [target] 检查 node 服务的使用状态
