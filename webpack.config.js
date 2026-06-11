const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");
require('dotenv').config();

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
      __GOOGLE_PHOTOS_SHARE_LINK__: JSON.stringify(process.env.GOOGLE_PHOTOS_SHARE_LINK || ""),
      __GOOGLE_OAUTH_CLIENT_ID__: JSON.stringify(process.env.GOOGLE_OAUTH_CLIENT_ID || ""),
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
};