import express from "express";
import expressWinston from "express-winston";
import { body, validationResult } from "express-validator";
import DownloaderAPI from "./DownloaderAPI";

export default class Server {
  public downloader: DownloaderAPI;
  public port: number;
  public app: express.Application;

  constructor(downloader: DownloaderAPI, port: number) {
    this.downloader = downloader;
    this.port = port;
    this.app = express();
  }

  initalize() {
    // use bodyparser
    this.app.use(express.json());

    // create logger for express http requests
    this.app.use(
      expressWinston.logger({
        winstonInstance: this.downloader.logger,
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
          return res.status(400).json({ error: "malformed request body" });
        }

        // destructure some variables
        const { platform } = req.body;

        // check if the platform is supported
        if (!this.downloader.modules.has(platform.toLowerCase())) {
          return res
            .status(400)
            .json({ error: "platform is invalid or unsupported" });
        }

        // FIXME:
        // for now, just echo back the request
        return res.json(req.body);
      }
    );

    // create logger for express errors
    this.app.use(
      expressWinston.errorLogger({
        winstonInstance: this.downloader.logger,
      })
    );

    // start the server
    this.app.listen(this.port, () => {
      this.downloader.logger.info(
        `[Server] Server listening on port ${this.port}`
      );
    });
  }
}

module.exports = Server;
