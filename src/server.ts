import express from "express";
import expressWinston from "express-winston";
import { body, validationResult } from "express-validator";
import DownloaderAPI from "./DownloaderAPI";
import BaseModule from "./modules/BaseModule";
import cors from "cors";

export default class Server {
  public api: DownloaderAPI;
  public port: number;
  public app: express.Application;

  constructor(api: DownloaderAPI, port: number) {
    this.api = api;
    this.port = port;
    this.app = express();
  }

  initalize() {
    // use cors
    this.app.use(
      cors({
        allowedHeaders: "*",
      })
    );
    // use express bodyparser
    this.app.use(express.json({ limit: "100mb" }));

    // create logger for express http requests
    this.app.use(
      expressWinston.logger({
        winstonInstance: this.api.logger,
        meta: false,
        expressFormat: true,
        colorize: true,
      })
    );

    this.app.post(
      "/rip",
      body("platform").isString(),
      body("keys").isArray(),
      async (req, res) => {
        // check for errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          // FIXME: maybe we should remove the errors from the response in a production env?
          // return res.status(400).json({ errors: errors.array() });
          return res.status(400).json({ error: "Malformed Request Body" });
        }

        // destructure some variables
        const platform: string = req.body.platform;

        // check if the platform is supported
        if (!this.api.modules.has(platform.toLowerCase())) {
          return res.status(400).json({ error: "Invalid Platform" });
        }

        const module: BaseModule = this.api.modules.get(
          platform.toLowerCase()
        )!;

        res.sendStatus(204);

        await module.process(req.body);
      }
    );

    // create logger for express errors
    this.app.use(
      expressWinston.errorLogger({
        winstonInstance: this.api.logger,
      })
    );

    // start the server
    this.app.listen(this.port, () => {
      this.api.logger.info(`[Server] Listening on port ${this.port}`);
    });
  }
}

module.exports = Server;
