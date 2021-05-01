import BaseModule from "./BaseModule";

export default class AmazonModule extends BaseModule {
  constructor() {
    super("amazon", "Amazon");
  }

  public download(payload: AmazonPayload) {
    return new Promise((resolve, reject) => {
      /**
       * An amazon payload is an object with the following properties:
       * metadata: object
       * manifest: object
       * keys: [{kid: string, key: string}]
       */
    });
  }

  public extract(...args: any[]) {}
}
