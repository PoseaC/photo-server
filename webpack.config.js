const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: './index.tsx',
  context: path.resolve(__dirname, 'src'),
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "*.css", to: "[name].css" },
        { from: "*.html", to: "[name].html" },
        { from: "../node_modules/react/umd/react.production.min.js", to: "vendor/react.production.min.js" },
        { from: "../node_modules/react-dom/umd/react-dom.production.min.js", to: "vendor/react-dom.production.min.js" },
      ],
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