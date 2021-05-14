import fs from "fs";
import logger from "./logger";
import Server from "./server";
import Utils from "./utils";
import Queue from "queue";
import { Logger } from "winston";
import BaseModule from "./modules/BaseModule";
import { join } from "path";
interface DownloaderAPIOptions {
  server: { port: number };
  downloads: { output: string; temp: string };
}

export default class DownloaderAPI {
  public options: DownloaderAPIOptions;
  public logger: Logger;
  public moduleDirPath: string;
  public modules: Map<String, BaseModule>;
  public utils: Utils;
  public queue: Queue;
  public server: Server;

  constructor(
    moduleDirPath: string,
    options: DownloaderAPIOptions = {
      server: { port: 5000 },
      downloads: {
        output: join(
          "C:\\Users\\23562\\Documents\\Code\\wv ripping projects\\downloader-api-v2",
          "out"
        ),
        temp: join(
          "C:\\Users\\23562\\Documents\\Code\\wv ripping projects\\downloader-api-v2",
          "temp"
        ),
      },
    }
  ) {
    //
    this.options = options;
    this.logger = logger;
    this.moduleDirPath = moduleDirPath;
    this.modules = new Map();
    this.utils = new Utils(logger);
    this.queue = new Queue({ autostart: true, concurrency: 1 });
    this.server = new Server(this, this.options.server.port);
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
          const module = new m(this);
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
