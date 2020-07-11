import * as path from 'path';
import * as webpack from 'webpack';
import CopyWebpackPlugin = require("copy-webpack-plugin");

const config: webpack.Configuration = {
  entry: "./bootstrap.ts",
  devtool: 'inline-source-map',
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bootstrap.js",
  },
  mode: "development",
  plugins: [
    new CopyWebpackPlugin(['index.html'])
  ],
  resolve: {
    // '.wasm' must come before '.js' for us to find the `memory` reference that the `js` shim does not re-export.
    extensions: ['.tsx', '.ts', '.wasm', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ]
  },
};

export default config;
