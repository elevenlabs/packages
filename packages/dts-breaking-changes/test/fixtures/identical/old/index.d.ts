export interface Options {
  a: string;
  b?: number;
}
export interface Result {
  x: number;
  nested: { deep: string };
}
export declare class Client {
  constructor(opts: Options);
  send(options: Options): Promise<Result>;
  overloaded(x: string): string;
  overloaded(x: number): number;
}
export declare function helper(n: number): number;
export type Alias = Options | Result;
