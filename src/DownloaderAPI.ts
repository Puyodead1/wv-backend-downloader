import fs from "fs";
import logger from "./logger";
import Server from "./server";
import Utils from "./utils";
import Queue from "queue";
import { Logger } from "winston";
import BaseModule from "./modules/BaseModule";

export default class DownloaderAPI {
  public logger: Logger;
  public moduleDirPath: string;
  public modules: Map<String, BaseModule>;
  public utils: Utils;
  public queue: Queue;
  public server: Server;

  constructor(
    moduleDirPath: string,
    opts: { server: { port: number } } = { server: { port: 5000 } }
  ) {
    //
    this.logger = logger;
    this.moduleDirPath = moduleDirPath;
    this.modules = new Map();
    this.utils = new Utils(logger);
    this.queue = new Queue({ autostart: true, concurrency: 1 });
    this.server = new Server(this, opts.server.port);
    this.server.initalize();
  }

  async loadModules() {
    const moduleFiles = fs
      .readdirSync(this.moduleDirPath)
      .filter((file) => file.endsWith(".js") && !file.startsWith("BaseModule"));

    for (const file of moduleFiles) {
      const m = require(`./modules/${file}`).default;
      const module = new m();
      this.modules.set(module.id, module);
    }
  }
}

module.exports = DownloaderAPI;
