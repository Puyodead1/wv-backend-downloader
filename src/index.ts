import DownloaderAPI from "./DownloaderAPI";
import Path from "path";

(async () => {
  const api = new DownloaderAPI(Path.join(__dirname, "modules"));

  // Load modules
  api.logger.info("[Module Loader] Loading modules...");
  const failedModuleCount = await api.loadModules();
  api.logger.info(
    `[Module Loader] Loaded ${api.modules.size} modules, ${failedModuleCount} module(s) failed to load.`
  );

  // Start the server
  api.server.initalize();
})();
