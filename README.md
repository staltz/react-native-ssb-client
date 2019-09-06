# SSB Client for React Native apps

Similar to [ssb-client](https://github.com/ssbc/ssb-client), but for React Native apps that run `ssb-server` using **[nodejs-mobile-react-native](https://github.com/janeasystems/nodejs-mobile-react-native)**.

## Install

Prerequisites:

- React Native 0.59 or higher
- [nodejs-mobile-react-native](https://github.com/janeasystems/nodejs-mobile-react-native) as a dependency in your React Native project
- You can provide this API the following arguments:
  - File path to your app's SSB keys
  - Manifest object

```
npm install --save react-native-ssb-client
```

## Use

In your **backend** code (your nodejs-mobile project), make sure that you have ssb-server or secret-stack installed, and add the following configurations set up:

```diff
 const SecretStack = require('secret-stack');
 const ssbKeys = require('ssb-keys');
+const rnBridge = require('rn-bridge');
+const rnChannelPlugin = require('multiserver-rn-channel');
+const NoauthTransformPlugin = require('multiserver/plugins/noauth');

 const config = makeConfig('ssb', {
   connections: {
     incoming: {
       net: [{scope: 'private', transform: 'shs', port: 26831}],
+      channel: [{scope: 'device', transform: 'noauth'}],
     },
     outgoing: {
       net: [{transform: 'shs'}],
     },
   },
 });

+function rnChannelTransport(ssb: any) {
+  ssb.multiserver.transport({
+    name: 'channel',
+    create: () => rnChannelPlugin(rnBridge.channel),
+  });
+}

+function noAuthTransform(ssb: any, cfg: any) {
+  ssb.multiserver.transform({
+    name: 'noauth',
+    create: () =>
+      NoauthTransformPlugin({
+        keys: {publicKey: Buffer.from(cfg.keys.public, 'base64')},
+      }),
+  });
+}

 SecretStack({appKey: require('ssb-caps').shs})
   .use(require('ssb-db'))
+  .use(noAuthTransform)
+  .use(rnChannelTransport)
   .use(require('ssb-master'))
   .use(require('ssb-conn'))
   .use(require('ssb-blobs'))
   .use(require('ssb-ebt'))
   .call(null, config);
```

In your **frontend** code is where you import this library:

```js
import ssbClient from 'react-native-ssb-client'

// ...

ssbClient(keys, manifest)
  .use(somePlugin) // optional
  .call(null, (err, ssb) => {
    // You can now use `ssb` with all the muxrpc APIs from the backend
  })
```

### API

- `ssbClient(keys, manifest)`: this configures your muxrpc client, where `keys` is the path to the user's SSB `secret` file, and `manifest` is an object describing the muxrpc APIs we want
- `.use(plugin)`: call this to attach a client-side `plugin` to your final muxrpc object. Plugins are `{name, init}` objects, where `name` is a string, and `init(ssb): void` is a function; much like secret-stack plugins are
- `.call(null, cb)`: call this to start using the muxrpc, it will be provided to you in the callback `cb`
- `.callPromise()`: as an alternative to the above, you can call this to get a Promise that resolves with the muxrpc `ssb` object

### Plugins

When setting up the client, you can register *plugins*. These look and feel like `ssb-server` or `secret-stack` plugins, in fact, in many cases they are so similar that a plugin intended for ssb-server might work just fine for react-native-ssb-client!

You can use client-side plugins when you are sure you don't want to run this code in the backend. For instance, a client-side plugin is the perfect place to put a light cache, in order to avoid a request to the backend. See e.g. [ssb-cached-about](https://gitlab.com/staltz/ssb-cached-about).

Below is a simple plugin that just publishes a greeting message in the DB:

```js
const greeterPlugin = {
  name: 'greetings',

  init: function (ssb) {
    return {
      greet: (cb) => {
        ssb.publish({type: 'post', text: 'Hello world!'}, cb)
      },
    }
  }
}
```

To install it:

```diff
 ssbClient(keys, manifest)
+  .use(greeterPlugin)
   .call(null, (err, ssb) => {

   })
```

To use it:

```diff
 ssbClient(keys, manifest)
   .use(greeterPlugin)
   .call(null, (err, ssb) => {
+    // Will publish a message on our feed:
+    ssb.greetings.greet((err, val) => { /* ... */ })
   })
```

## License

MIT
