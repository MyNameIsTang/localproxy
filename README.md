## localproxy

用于测试环境代理服务

### Usage

1. 创建软连接

   ```
     npm link
   ```

2. 指令
   - start [target] 启用服务，传值为目标测试环境地址
     ```
        localproxy start https://www.test.com
     ```
   - stop [target] 停止服务，传值为目标测试环境地址
     ```
       localproxy stop
     ```
   - status 状态预览，是否启用服务，配置项等
     ```
       localproxy status
     ```
