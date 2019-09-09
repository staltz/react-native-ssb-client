const pull = require('pull-stream');
const nodejs = require('nodejs-mobile-react-native');
const ssbKeys = require('react-native-ssb-client-keys');
const rnChannelPlugin = require('multiserver-rn-channel');
const noAuthPlugin = require('multiserver/plugins/noauth');
const MultiServer = require('multiserver');
const muxrpc = require('muxrpc');

export type Callback<T> = (err: any, value?: T) => void;

function toSodiumKeys(keys: any) {
  if (!keys || !keys.public) return null;
  return {
    publicKey: Buffer.from(keys.public.replace('.ed25519', ''), 'base64'),
    secretKey: Buffer.from(keys.private.replace('.ed25519', ''), 'base64'),
  };
}

function objMapDeep(origin: any, transform: (s: string) => string): any {
  return Object.keys(origin).reduce(
    (acc, key) => {
      if (typeof origin[key] === 'object') {
        acc[key] = objMapDeep(origin[key], transform);
      } else {
        acc[key] = transform(origin[key]);
      }
      return acc;
    },
    {} as any,
  );
}

function pipe(first: any, ...cbs: Array<(x: any) => any>) {
  let res = first;
  for (let i = 0, n = cbs.length; i < n; i++) res = cbs[i](res);
  return res;
}

function syncToAsync(str: string): string {
  return str === 'sync' ? 'async' : str;
}

function applyPlugins<T = any>(client: T, plugins: Array<any>): T {
  for (const plugin of plugins) {
    (client as any)[plugin.name] = plugin.init(client);
  }
  return client;
}

function hackId<T = any>(client: T, keys: any): T {
  (client as any).id = keys.id;
  return client;
}

export interface SSBClient {
  (cb: Callback<any>): void;
  use(plugin: any): SSBClient;
  callPromise(): Promise<any>;
}

export type Keys = {
  id: string;
  public: string;
  private: string;
};

function loadKeys(path: string): Promise<Keys> {
  return new Promise<any>((resolve, reject) => {
    ssbKeys.load(path, (err: any, val: Keys) => {
      if (err) reject(err);
      else resolve(val);
    });
  }).catch(() => loadKeys(path));
}

export default function ssbClient(k: string | Keys, manifest: any): SSBClient {
  const sanitizedManifest = objMapDeep(manifest, syncToAsync);

  const plugins: Array<any> = [];

  async function builder(cb: Callback<any>) {
    const keys = typeof k === 'string' ? await loadKeys(k) : k;

    const ms = MultiServer([
      [
        rnChannelPlugin(nodejs.channel),
        noAuthPlugin({keys: toSodiumKeys(keys)}),
      ],
    ]);

    const address = 'channel~noauth:' + keys.public.replace('.ed25519', '');

    ms.client(address, (err: any, stream: any) => {
      if (err) {
        cb(err);
      } else {
        const client = pipe(
          muxrpc(sanitizedManifest, null)(),
          c => hackId(c, keys),
          c => applyPlugins(c, plugins),
        );
        pull(stream, client.createStream(), stream);
        cb(null, client);
      }
    });
  }

  builder.use = function use(plugin: any) {
    plugins.push(plugin);
    return builder;
  };

  builder.callPromise = function callPromise() {
    return new Promise<any>((resolve, reject) => {
      builder((err: any, val: any) => {
        if (err) reject(err);
        else resolve(val);
      });
    });
  };

  return builder;
}
