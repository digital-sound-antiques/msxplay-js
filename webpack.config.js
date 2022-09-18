module.exports = {
  mode: "production",
  context: __dirname + "/src",
  entry: {
    "msxplay-bundle": "./entry.js"
  },
  // devtool: "source-map",
  output: {
    path: __dirname + "/dist",
    filename: "[name].js",
    library: "MSXPlayUI",
    libraryTarget: "var",
    libraryExport: "default"
  },
  resolve: {
    fallback: {
      fs: false,
      path: require.resolve("path-browserify")
    }
  }
};
