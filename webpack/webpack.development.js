const { merge } = require('webpack-merge')
const baseConfig = require('./webpack.base')
const paths = require('./paths')

module.exports = merge(baseConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    path: paths.devDist,
  },
  devServer: {
    port: 9000,
    compress: true,
    static: {
      directory: paths.devContent,
    },
    devMiddleware: {
      stats: 'minimal',
      writeToDisk: true,
      publicPath: paths.dist,
    },
  },
})
