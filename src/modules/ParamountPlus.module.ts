import BaseModule from "./BaseModule";

export default class ParamountPlusModule extends BaseModule {
  constructor() {
    super("paramountplus", "Paramount Plus");
  }

  public download(payload: ParamountPlusPayload) {
    return new Promise((resolve, reject) => {
      /**
       * A Paramount Plus payload is an object with the following properties:
       * metadata: object
       * manifest: object
       * keys: [{kid: string, key: string}]
       */
    });
  }

  public extract(...args: any[]) {}
}
