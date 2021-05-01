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
  }

  /**
   * Loads all site modules
   * @returns The number of modules that failed to load
   */
  loadModules(): Promise<number> {
    return new Promise((resolve, _) => {
      let failedCount = 0;

      const moduleFiles = fs
        .readdirSync(this.moduleDirPath)
        .filter((file) => file.endsWith(".module.js"));

      for (const file of moduleFiles) {
        try {
          const m = require(`./modules/${file}`).default;
          const module = new m();
          this.modules.set(module.id, module);
          this.logger.verbose(
            `[Module Loader] Loaded module '${module.name}'.`
          );
        } catch (err) {
          failedCount++;
          this.logger.error(
            `[Module Loader] Failed to load module '${file}': ${err}`
          );
        }
      }

      resolve(failedCount);
    });
  }
}

module.exports = DownloaderAPI;
