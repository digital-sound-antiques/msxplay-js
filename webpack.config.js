import path from "path";
import WorkerUrlPlugin from "worker-url/plugin.js";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import WorkboxPlugin from "workbox-webpack-plugin";
import crypto from "crypto";
import { globSync } from "glob";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const outputPath = path.resolve(__dirname, "public");
const cacheId = "msxplay";

const getRevision = (file) => crypto.createHash("md5").update(Buffer.from(file)).digest("hex");
const getManifestEntry = (file) => {
  return {
    url: path.relative(outputPath, file),
    revision: getRevision(file),
  };
};

const additionalManifestEntries = [
  "https://cdnjs.cloudflare.com/ajax/libs/ace/1.31.2/ace.min.js",
  path.resolve(outputPath, "editor.html"),
  path.resolve(outputPath, "demo/blank.mml"),
  path.resolve(outputPath, "demo/grider.mml"),
  path.resolve(outputPath, "demo/grider.mgs"),
  ...globSync(path.resolve(outputPath, "css/*.css")),
  ...globSync(path.resolve(outputPath, "js/*.js")),
].map((file) => {
  if (file.startsWith("https:")) {
    return { url: file, revision: null };
  }
  return getManifestEntry(file);
});

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
    //publicPath: "/dist/",
    path: outputPath,
    filename: "dist/[name].js",
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
  optimization: {
    splitChunks: {
      minChunks: 9999, // prevent to split chunk
    },
  },
  plugins: [
    new WorkerUrlPlugin(),
    new WorkboxPlugin.GenerateSW({
      cacheId: cacheId,
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      swDest: path.resolve(outputPath, "sw.js"),
      additionalManifestEntries,
      runtimeCaching: [
        {
          handler: "NetworkFirst",
          urlPattern: /\.(jpe?g|png|mml)$/,
          options: {
            cacheName: cacheId + "-asset-cache",
          },
        },
      ],
    }),
    /*, new BundleAnalyzerPlugin()*/
  ],
  stats: {
    modules: false,
    children: false,
    entrypoints: false,
  },
};
