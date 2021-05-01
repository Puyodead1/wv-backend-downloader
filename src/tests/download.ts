import Utils from "../utils";
import logger from "../logger";
import path from "path";

const utils = new Utils(logger);

utils
  .downloadMT(
    "http://speedtest.tele2.net/100MB.zip",
    path.join(__dirname, "..", "..", "test.zip")
  )
  .then(() => {
    console.log("ye haw");
  })
  .catch((err) => {
    console.error(":(", err);
  });
