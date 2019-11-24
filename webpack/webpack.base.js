const { EnvironmentPlugin } = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const paths = require('./paths')

const bundleName = 'Animated_GIF'

module.exports = {
  entry: paths.main,
  output: {
    path: paths.dist,
    filename: `${bundleName}.js`,
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: { inline: true, fallback: false },
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
