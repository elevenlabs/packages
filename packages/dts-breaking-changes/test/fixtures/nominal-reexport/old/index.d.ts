export declare class Conn {
  protected q: number;
}
export interface Opts {
  conn: Conn;
}
export declare function configure(options: Opts): void;
export { Impl } from "./impl.js";
export type { Impl as ImplType } from "./impl.js";
