import { Logger } from "winston";
import { spawn } from "child_process";
import DownloadError from "./lib/DownloadError";
import MTDownloader from "mt-files-downloader";

export default class Utils {
  public logger: Logger;
  public downloader: any;

  constructor(logger: Logger) {
    this.logger = logger;
    this.downloader = new MTDownloader();
  }

  /**
   * Prints progress to console as an updating line
   * @param progress progress string
   */
  printProgress(progress: string) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(progress);
  }

  /**
   * Downloads a file using aria2c
   * @param url url of the file to download
   * @param dir directory to download file to
   * @param file name to save the file as
   */
  downloadAria(url: string, dir: string, file: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn("aria2c", [
        "--auto-file-renaming=false",
        "-c", // continue partial downloads
        "-j16", // max concurrent downloads - Set the maximum number of parallel downloads for every queue item.
        "-x16", // max connections per server - The maximum number of connections to one server for each download.
        "-s16", // split - Download a file using N connections
        "--summary-interval=0", // suppress download summaries
        "-d", // set output directory
        dir,
        "-o", // output file name
        file,
        url,
      ]);

      child.stdout.on("data", (data) => {
        this.logger.debug(
          `aria2c stdout emitted data, we should investigate how to handle this! ${data.toString()}`
        );
      });
      child.stdout.on("error", (err) => {
        this.logger.error(
          `aria2c stdout emitted an error, we should investigate how to handle this! ${err}`
        );
      });

      child.stderr.on("data", (data) => {
        this.logger.error(
          `aria2c stderr emitted data, we should investigate how to handle this! ${data.toString()}`
        );
      });
      child.stderr.on("error", (err) => {
        this.logger.error(
          `aria2c stderr emitted an error, we should investigate how to handle this! ${err}`
        );
      });

      child.on("message", (msg, _) =>
        this.logger.info(
          `aria2c emitted a message, we should investigate how to handle this! ${msg}`
        )
      );
      child.on("close", (code, _) =>
        this.logger.debug(
          `aria2c closed with code ${code}, how should we handle this?`
        )
      );
      child.on("disconnect", () =>
        this.logger.debug(`aria2c disconnected, how should we handle this?`)
      );
      child.on("error", (err) =>
        this.logger.error(
          `aria2c emitted an error, we should investigate how to handle this! ${err}`
        )
      );
      child.on("exit", (code, _) => {
        if (code !== 0) {
          reject(
            new DownloadError(`aria2c exited with non-zero code: ${code}`)
          );
        }
        resolve();
      });
    });
  }

  download(url: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dl = this.downloader.download(url, outPath);
      dl.setRetryOptions({
        maxRetries: 3, // Default: 5
        retryInterval: 1000, // Default: 2000
      });

      dl.setOptions({
        threadsCount: 16, // Default: 2, Set the total number of download threads
      });

      dl.on("start", () => {
        console.log(
          "Download started with " +
            (dl.meta.threads ? dl.meta.threads.length : 0) +
            " threads."
        );
      });

      dl.on("error", () => {
        console.error(`Downloader errored: ${dl.error}`);
        reject(dl.error);
      });

      dl.on("end", () => {
        console.log("downloader ended");
        if (dl.status === 3) resolve();
        else reject(`Downloader ended with code ${dl.status}`);
      });

      dl.on("stopped", () => {
        console.log("downloader stopped");
        resolve();
      });

      dl.on("destroyed", () => {
        console.log("downloader destroyed");
        resolve();
      });

      dl.on("retry", () => {
        console.log("downloader retrying...");
      });

      dl.start();
    });
  }
}
