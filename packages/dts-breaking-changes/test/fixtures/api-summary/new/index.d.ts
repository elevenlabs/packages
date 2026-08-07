export interface Options {
  a: string;
}
export declare class Client {
  send(o: Options): { id: string; traceId: string };
  cancel(id: string): void;
}
export declare function connect(): Client;
export declare function compose(): Client;

export declare const meta: typeof import("./meta");
