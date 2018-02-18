const lowerSSBClient = require("ssb-client");
const createConfig = require("ssb-config/inject");

export type Callback<T> = (err: any, value: T) => void;
export type SBot = any;
export type Config = {
  path: string;
  caps: string;
  remote: any;
  port: number;
  manifest: any;
  key: string;
};

export type SSBClientFunction = {
  (cb: Callback<SBot>): void;
  (opts: object, cb: Callback<SBot>): void;
  (keys?: object | null, opts?: object | null, cb?: Callback<SBot>): void;
};

function ssbClient(cb: Callback<SBot>): void;
function ssbClient(opts: object, cb: Callback<SBot>): void;
function ssbClient(
  keys?: object | null,
  opts?: object | null,
  cb?: Callback<SBot>
): void {
  if (typeof keys == "function") {
    cb = keys;
    keys = null;
    opts = null;
  } else if (typeof opts == "function") {
    cb = opts;
    opts = keys;
    keys = null;
  }
  let config: Config;
  if (typeof opts === "string" || opts == null || !keys) {
    config = createConfig((typeof opts === "string" ? opts : null) || "ssb");
  } else if (opts && typeof opts === "object") {
    config = opts as Config;
  } else {
    config = {} as Config;
  }
  lowerSSBClient(keys, config, cb);
}

module.exports = ssbClient as SSBClientFunction;
