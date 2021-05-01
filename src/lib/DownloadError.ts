export default class DownloadError extends Error {
  constructor(msg?: string) {
    super(msg);

    this.name = this.constructor.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DownloadError);
    }
  }
}
