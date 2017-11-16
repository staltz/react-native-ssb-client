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
    hops: "async",
    stream: "source"
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
  config.manifest = manifest;
  lowerSSBClient(keys, config, cb);
}

module.exports = ssbClient as SSBClientFunction;
