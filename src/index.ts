const pull = require('pull-stream');
const nodejs = require('nodejs-mobile-react-native');
const rnChannelPlugin = require('multiserver-rn-channel');
const MultiServer = require('multiserver');
const muxrpc = require('muxrpc');

export type Callback<T> = (err: any, value?: T) => void;

export type AnyFunction = (...args: Array<any>) => any;

export type ClientAPI<M> = {id: string} & {
  [key in keyof M]: M[key] extends string
    ? AnyFunction
    : {
        [key2 in keyof M[key]]: AnyFunction;
      };
};

export type Plugin<N, I extends (...args: any) => any> = {
  name: N;
  init: I;
};

export interface SSBClient<M> {
  (cb: Callback<ClientAPI<M>>): void;
  use<N extends keyof any, I extends (...args: any) => any>(
    plugin: Plugin<N, I>,
  ): SSBClient<
    M &
      {
        [NN in N]: {
          [P in keyof ReturnType<I>]: string;
        };
      }
  >;
  callPromise(): Promise<ClientAPI<M>>;
}

// Forked from multiserver/plugins/noauth because client-side we don't need
// to pass the public key to this plugin, only server-side we need to
function noAuthPlugin() {
  return {
    name: 'noauth',
    create() {
      return (stream: any, cb: Callback<Record<string, any>>) => {
        cb(null, {
          remote: '',
          auth: {allow: null, deny: null},
          source: stream.source,
          sink: stream.sink,
          address: 'noauth',
        });
      };
    },
    parse(str: string) {
      if (str === 'noauth') return {};
      else return undefined;
    },
    stringify() {
      return 'noauth';
    },
  };
}

function objMapDeep(origin: any, transform: (s: string) => string): any {
  return Object.keys(origin).reduce((acc, key) => {
    if (typeof origin[key] === 'object') {
      acc[key] = objMapDeep(origin[key], transform);
    } else {
      acc[key] = transform(origin[key]);
    }
    return acc;
  }, {} as any);
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

function hackId(client: any, cb: Callback<any>) {
  client.whoami((err: any, val: any) => {
    if (err) return cb(err);

    client.id = val.id;
    cb(null, client);
  });
}

export default function ssbClient<M>(manifest: M): SSBClient<M> {
  const manifestOk = objMapDeep(manifest, syncToAsync);

  const plugins: Array<any> = [];

  function builder(cb: Callback<any>) {
    const ms = MultiServer([[rnChannelPlugin(nodejs.channel), noAuthPlugin()]]);

    const address = 'channel~noauth';

    ms.client(address, (err: any, stream: any) => {
      if (err) return cb(err);

      const client = applyPlugins(muxrpc(manifestOk, null)(), plugins);
      pull(stream, client.createStream(), stream);
      hackId(client, cb);
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
