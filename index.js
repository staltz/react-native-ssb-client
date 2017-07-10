var RNFS = require("react-native-fs");
module.exports = global.process = {
  version: "7.1.0", // pretend like we have Node v7.0
  umask: () => 18,
  cwd: () => "",
  nextTick: setImmediate,
  env: {
    // used by os-homedir and transitively by ssb-config
    HOME: RNFS.DocumentDirectoryPath
  },
  argv: ["react-native", "run-android", "your-app"],
  versions: {}
};
