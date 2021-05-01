import BaseModule from "./BaseModule";

export default class HuluModule extends BaseModule {
  constructor() {
    super("hulu", "Hulu");
  }

  public download(payload: HuluPayload) {
    return new Promise((resolve, reject) => {
      /**
       * A Hulu payload is an object with the following properties:
       * metadata: object
       * manifest: object
       * keys: [{kid: string, key: string}]
       */
    });
  }

  public extract(...args: any[]) {}
}
