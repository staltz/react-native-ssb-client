// Install globals
(global as any).__dirname = "/";
(global as any).__filename = "";
require("process");
(global as any).Buffer = require("buffer").Buffer;
// imports
const lowerSSBClient = require("ssb-client");
const ssbKeys = require("ssb-keys");
const RNFS = require("react-native-fs");
const path = require("path");
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

const manifest = {
  auth: "async",
  address: "sync",
  manifest: "sync",
  get: "async",
  createFeedStream: "source",
  createLogStream: "source",
  messagesByType: "source",
  createHistoryStream: "source",
  createUserStream: "source",
  links: "source",
  relatedMessages: "async",
  add: "async",
  publish: "async",
  getAddress: "sync",
  getLatest: "async",
  latest: "source",
  latestSequence: "async",
  whoami: "sync",
  usage: "sync",
  plugins: {
    install: "source",
    uninstall: "source",
    enable: "async",
    disable: "async"
  },
  gossip: {
    peers: "sync",
    add: "sync",
    remove: "sync",
    ping: "duplex",
    connect: "async",
    changes: "source",
    reconnect: "sync"
  },
  friends: {
    get: "async",
    createFriendStream: "source",
    hops: "async"
  },
  replicate: {
    changes: "source",
    upto: "source"
  },
  blobs: {
    get: "source",
    getSlice: "source",
    add: "sink",
    rm: "async",
    ls: "source",
    has: "async",
    size: "async",
    meta: "async",
    want: "async",
    push: "async",
    changes: "source",
    createWants: "source"
  },
  backlinks: {
    read: "source"
  },
  about: {
    stream: "source",
    get: "async"
  },
  contacts: {
    stream: "source",
    get: "async"
  },
  query: {
    read: "source"
  },
  invite: {
    create: "async",
    accept: "async",
    use: "async"
  },
  block: {
    isBlocked: "sync"
  },
  private: {
    publish: "async",
    unbox: "sync",
    read: "source"
  }
};

function fetchKeys(config: { path: string }): Promise<any> {
  const keysPath = path.join(config.path, "secret");
  return RNFS.exists(keysPath).then((exists: boolean) => {
    if (exists) {
      return RNFS.readFile(keysPath, "ascii").then((fileContents: any) =>
        JSON.parse(fileContents)
      );
    } else {
      const generatedKeys = ssbKeys.generate();
      const fileContents = JSON.stringify(generatedKeys, null, 2);
      return RNFS.writeFile(keysPath, fileContents, "ascii").then(
        () => generatedKeys
      );
    }
  });
}

export type SSBClientFunction = {
  (cb: Callback<SBot>): void;
  (opts: object, cb: Callback<SBot>): void;
  (keys?: object | null, opts?: object | null, cb?: Callback<SBot>): void;
  fetchKeys(config: { path: string }): Promise<any>;
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

  config.manifest = manifest;
  const keysPromise = keys ? Promise.resolve(keys) : fetchKeys(config);

  keysPromise.then((actualKeys: object) => {
    lowerSSBClient(actualKeys, config, cb);
  });
}

(ssbClient as SSBClientFunction).fetchKeys = fetchKeys;

module.exports = ssbClient as SSBClientFunction;
