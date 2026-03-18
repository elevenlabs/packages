import { PACKAGE_VERSION } from "./version";

export interface Client {
  name: string;
  version: string;
}

export let client: Client = {
  name: "js_sdk",
  version: PACKAGE_VERSION,
};

export function setClient(value: Client): void {
  client = value;
}
