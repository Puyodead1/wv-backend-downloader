import BaseModule from "./BaseModule";

export default class NetflixModule extends BaseModule {
  constructor() {
    super("netflix", "Netflix");
  }

  public download(payload: NetflixPayload) {
    return new Promise((resolve, reject) => {
      /**
       * A netflix payload is an object with the following properties:
       * metadata: object
       * manifest: object
       * keys: [{kid: string, key: string}]
       */
    });
  }

  public extract(...args: any[]) {}
}
