module.exports = {
  context: __dirname + '/src',
	entry: {
    "msxplay-bundle": "./entry.js"
  },
  // devtool: 'source-map',
  output: {
    path: __dirname + "/dist",
    filename: "[name].js",
    library: "MSXPlayUI",
    libraryTarget: "var"
  },
  node: {
    fs: 'empty'
  }
};
