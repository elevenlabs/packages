export interface Options {
  a: string;
}
export declare class Client {
  send(o: Options): { id: string };
}
export declare function connect(): Client;
export declare function legacy(): void;
