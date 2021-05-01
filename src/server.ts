import express from "express";
import expressWinston from "express-winston";
import { body, validationResult } from "express-validator";
import DownloaderAPI from "./DownloaderAPI";

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
    // use bodyparser
    this.app.use(express.json());

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
      (req, res) => {
        // check for errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          // FIXME: maybe we should remove the errors from the response in a production env?
          // return res.status(400).json({ errors: errors.array() });
          return res.status(400).json({ error: "Malformed Request Body" });
        }

        // destructure some variables
        const { platform } = req.body;

        // check if the platform is supported
        if (!this.api.modules.has(platform.toLowerCase())) {
          return res.status(400).json({ error: "Invalid Platform" });
        }

        // FIXME:
        // for now, just echo back the request
        return res.json(req.body);
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
