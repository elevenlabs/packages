export declare class Logger {
  private level: number;
  log(msg: string): void;
}
export interface Options {
  logger: Logger;
}
export declare function configure(options: Options): void;
