const { EnvironmentPlugin } = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const paths = require('./paths')

const bundleName = 'Animated_GIF'

module.exports = {
  entry: paths.main,
  output: {
    path: paths.dist,
    filename: `${bundleName}.js`,
    library: 'Animated_GIF',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: { inline: 'no-fallback' },
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new EnvironmentPlugin({
      NODE_ENV: process.env.NODE_ENV || 'production',
    }),
  ],
}
