import BaseModule from "./BaseModule";

export default class SpotifyModule extends BaseModule {
  constructor() {
    super("spotify", "Spotify");
  }

  public download(payload: SpotifyPayload) {
    return new Promise((resolve, reject) => {
      /**
       * A Spotify payload is an object with the following properties:
       * metadata: object
       * manifest: object
       * keys: [{kid: string, key: string}]
       */
    });
  }

  public extract(...args: any[]) {}
}
