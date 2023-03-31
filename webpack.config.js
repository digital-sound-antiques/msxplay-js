import path from "path";
import WorkerUrlPlugin from "worker-url/plugin.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default {
  mode: "production",
  context: __dirname + "/src",
  entry: {
    "msxplay-bundle": "./entry.js",
  },
  // devtool: "source-map",
  experiments: {
    outputModule: true,
  },
  output: {
    publicPath: "/dist/",
    path: path.resolve(__dirname, "www/dist"),
    filename: "[name].js",
    library: {
      type: "module",
    },
  },
  resolve: {
    fallback: {
      fs: false,
      path: false,
    },
  },
  plugins: [new WorkerUrlPlugin()],
  stats: {
    modules: false,
    children: false,
    entrypoints: false,
  },
};
