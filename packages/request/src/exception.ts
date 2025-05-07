export class Exception extends Error {
  public readonly status: number | string;
  public readonly timestamp = Date.now();

  constructor(status: number | string, msg?: string) {
    super(msg);
    this.status = status;
  }
}