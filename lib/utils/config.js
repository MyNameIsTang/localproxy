const jsyaml = require("js-yaml");
const chalk = require("chalk");
const fs = require("fs");
const pathUtil = require("path");

class ConfigHandler {
  path;
  data;
  _instance;

  init(path) {
    this.path = path;
    this.data = this.#getConfig(path);
  }

  #getConfig(path) {
    try {
      if (!fs.existsSync(path)) {
        return {};
      }
      const data = fs.readFileSync(path, { encoding: "utf8" });
      const config = jsyaml.load(data) || {};
      return config;
    } catch (error) {
      console.log(chalk.red.bold("读取配置文件失败，请检查配置是否正确！"));
      return {};
    }
  }

  #saveConfig(path, data) {
    return new Promise((resolve, reject) => {
      try {
        const result = jsyaml.dump(data);
        // 如果不存在文件，则需要先创建目录
        if (!fs.existsSync(path)) {
          const parentPath = pathUtil.resolve(path, "..");
          fs.mkdirSync(parentPath, { recursive: true });
        }
        fs.writeFileSync(path, result);
        resolve();
      } catch (error) {
        reject();
      }
    });
  }

  get(key) {
    return this.data[key];
  }
  set(key, value) {
    this.data[key] = value;
  }
  setPartialValue(key, obj) {
    const item = this.get(key);
    this.set(key, {
      ...item,
      ...obj,
    });
  }
  getKeys() {
    return Object.keys(this.data);
  }
  flush() {
    return this.#saveConfig(this.path, this.data);
  }
  // TODO
  destory() {
    this.data = null;
  }
  static get instance() {
    return this._instance || (this._instance = new ConfigHandler());
  }
}

module.exports = ConfigHandler;
