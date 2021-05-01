import DownloaderAPI from "./DownloaderAPI";
import Path from "path";

const downloaderapi = new DownloaderAPI(Path.join(__dirname, "modules"));
(async () => {
  /**
   * Load all the site modules
   */
  downloaderapi.logger.info("[Modules] Loading modules...");
  await downloaderapi.loadModules();
  downloaderapi.logger.info(
    `[Modules] Loaded ${downloaderapi.modules.size} module(s).`
  );
})();
