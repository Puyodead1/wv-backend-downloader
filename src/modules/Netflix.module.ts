import DownloaderAPI from "../DownloaderAPI";
import Sanitize from "../Sanitize";
import BaseModule from "./BaseModule";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";

export default class NetflixModule extends BaseModule {
  private api: DownloaderAPI;
  manifest!: NetflixManifest;
  metadata!: NetflixMetadata;
  keys!: ContentKeyPair[];
  audioStream!: NetflixAudioStream;
  videoStream!: NetflixVideoStream;
  cleanTitle!: string;
  type!: string;
  audioId!: string;
  videoId!: string;
  audioUrl!: string;
  videoUrl!: string;
  audioFileName!: string;
  videoFileName!: string;
  outputFilePath!: string;
  tempDirectoryPath!: string;
  outputFileName!: string;
  outputDirectoryPath!: string;

  constructor(api: DownloaderAPI) {
    super("netflix", "Netflix");
    this.api = api;
  }

  private async processMovie() {}

  private async processEpisode() {
    const season = this.metadata.video.seasons?.find((season) =>
      season.episodes.find(
        (episode) => episode.id === this.metadata.video.currentEpisode
      )
    );
    if (!season) throw new Error(`[Netflix] Unable to extract season!`);
    const episode = season.episodes.find(
      (episode) => episode.id === this.metadata.video.currentEpisode
    );
    if (!episode) throw new Error(`[Netflix] Unable to extract episode!`);
    const episodeTitleClean = Sanitize(episode.title);

    const seasonShortname =
      season?.seq.toString().length == 1
        ? `S0${season.seq}`
        : `S${season?.seq}`;

    this.tempDirectoryPath = join(
      this.api.options.downloads.temp,
      this.cleanTitle,
      seasonShortname,
      episodeTitleClean
    );

    this.outputDirectoryPath = join(
      this.api.options.downloads.output,
      this.cleanTitle,
      seasonShortname,
      episodeTitleClean
    );

    this.outputFilePath = join(this.outputDirectoryPath, this.outputFileName);

    const audioFilePath = join(this.tempDirectoryPath, this.audioFileName);
    const videoFilePath = join(this.tempDirectoryPath, this.videoFileName);

    const decryptedVideoFilePath = join(
      this.tempDirectoryPath,
      `${this.videoFileName}.decrypted`
    );

    await mkdir(this.tempDirectoryPath, { recursive: true })
      .then(() =>
        this.api.logger.debug(`[Netflix] Temporary directory created.`)
      )
      .catch((e) => {
        throw e;
      });
    await mkdir(this.outputDirectoryPath, { recursive: true })
      .then(() => this.api.logger.debug(`[Netflix] Output directory created.`))
      .catch((e) => {
        throw e;
      });

    const tempData = `Output Path: ${
      this.outputFilePath
    }\nKeys: ${JSON.stringify(this.keys)}`;
    await writeFile(join(this.tempDirectoryPath, "info.txt"), tempData)
      .then(() => this.api.logger.debug(`[Netflix] Media info file written.`))
      .catch((e) => {
        throw e;
      });

    this.api.logger.debug(`[Netflix] Output Path: ${this.outputFilePath}`);
    this.api.logger.debug(
      `[Netflix] Temporary Path: ${this.tempDirectoryPath}`
    );

    // Download audio
    await this.api.utils
      .downloadAria(this.audioUrl, this.tempDirectoryPath, this.audioFileName)
      .then(() => this.api.logger.debug(`[Netflix] Audio download complete.`))
      .catch((e) => {
        throw e;
      });

    await this.api.utils
      .downloadAria(this.videoUrl, this.tempDirectoryPath, this.videoFileName)
      .then(() => this.api.logger.debug(`[Netflix] Video download complete.`))
      .catch((e) => {
        throw e;
      });
  }

  public async process(payload: NetflixPayload) {
    /**
     * A netflix payload is an object with the following properties:
     * metadata: object
     * manifest: object
     * keys: [{kid: string, key: string}]
     */

    // inital data
    this.metadata = payload.metadata;
    this.manifest = payload.manifest;
    this.keys = payload.keys;
    this.outputFileName = payload.outputFileName;

    this.audioStream = this.manifest.audioStream;
    this.videoStream = this.manifest.videoStream;

    this.cleanTitle = Sanitize(this.metadata.video.title, {
      replaceSpaces: false,
    });
    this.type = this.metadata.video.type;
    this.audioId = this.audioStream.downloadable_id;
    this.videoId = this.videoStream.downloadable_id;

    // there are 3 CDNs, the first one should be the fastest
    this.audioUrl = this.audioStream.urls[0].url;
    this.videoUrl = this.videoStream.urls[0].url;

    this.audioFileName = `${this.audioId}_audio`;
    this.videoFileName = `${this.videoId}_video`;

    if (this.metadata.video.type === "movie") await this.processMovie();
    else await this.processEpisode();
  }
}
