const pull = require('pull-stream');
const nodejs = require('nodejs-mobile-react-native');
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

function syncToAsync(str: string): string {
  return str === 'sync' ? 'async' : str;
}

function applyPlugins<T = any>(client: T, plugins: Array<any>): T {
  for (const plugin of plugins) {
    (client as any)[plugin.name] = plugin.init(client);
  }
  return client;
}

export interface SSBClient {
  (cb: Callback<any>): void;
  use(plugin: any): SSBClient;
  callPromise(): Promise<any>;
}

export default function ssbClient(keys: any, manifest: any): SSBClient {
  const sanitizedManifest = objMapDeep(manifest, syncToAsync);

  const plugins: Array<any> = [];

  function builder(cb: Callback<any>) {
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
        const client = muxrpc(sanitizedManifest, null)();
        pull(stream, client.createStream(), stream);
        const clientPlusPlugins = applyPlugins(client, plugins);
        cb(null, clientPlusPlugins);
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
