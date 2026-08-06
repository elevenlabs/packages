export interface Options {
  a: string;
}
export interface Result {
  x: number;
}
export declare class Client {
  send(options: Options): Result;
}
