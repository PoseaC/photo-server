const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");
require('dotenv').config();

// Only true while running `webpack serve` (npm start). The dev-server proxy
// below uses it as the Immich target for /api calls.
const isDevServer = process.env.WEBPACK_SERVE === "true";
const immichBaseUrl = process.env.IMMICH_BASE_URL || "";
// API calls always use a relative path ("/api/...") so they hit a same-origin
// proxy and avoid cross-origin CORS: the webpack dev-server proxy in
// development, and the container's nginx "/api -> Immich" proxy in production.
// The absolute immichBaseUrl is still baked in for the "Vezi Galeria" link.
const immichApiBase = "";
void isDevServer;

module.exports = {
  entry: './index.tsx',
  context: path.resolve(__dirname, 'src'),
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "style.css", to: "[name].css" },
        { from: "index.html", to: "[name].html" },
        { from: "img/*", to: "img/[name][ext]" },
        { from: "../node_modules/react/umd/react.production.min.js", to: "vendor/react.production.min.js" },
        { from: "../node_modules/react-dom/umd/react-dom.production.min.js", to: "vendor/react-dom.production.min.js" },
      ],
    }),
    new webpack.DefinePlugin({
      __IMMICH_BASE_URL__: JSON.stringify(immichBaseUrl),
      __IMMICH_SHARE_SLUG__: JSON.stringify(process.env.IMMICH_SHARE_SLUG || ""),
      __IMMICH_API_BASE__: JSON.stringify(immichApiBase),
    }),
  ],
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'bin'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  devServer: {
    // Forward Immich API calls to the real server (server-to-server, no CORS).
    proxy: [
      {
        context: ['/api'],
        target: immichBaseUrl,
        changeOrigin: true,
        secure: true,
        // Allow long, large uploads through the dev proxy (dev-only).
        timeout: 1800000,        // incoming (browser -> dev server)
        proxyTimeout: 1800000,   // outgoing (dev server -> Immich)
      },
    ],
    // Node's HTTP server defaults to a 300s requestTimeout, which aborts very
    // large uploads mid-stream during local development. Disable it here so the
    // dev proxy can stream multi-GB files. This only affects `npm start`.
    onListening: (devServer) => {
      const server = devServer.server;
      if (server) {
        server.requestTimeout = 0;
        server.headersTimeout = 0;
        server.timeout = 0;
      }
    },
  },
};