const merge = require('webpack-merge')
const baseConfig = require('./webpack.base')
const paths = require('./paths')

module.exports = merge(baseConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    path: paths.devDist,
  },
  devServer: {
    contentBase: paths.devContent,
    publicPath: paths.dist,
    port: 9000,
    compress: true,
    writeToDisk: true,
    publicPath: paths.dist,
    stats: 'minimal',
  },
})
