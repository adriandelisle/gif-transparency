const path = require('path')

const appDir = process.cwd()
const getPath = relativePath => path.resolve(appDir, relativePath)
const paths = {
  main: getPath('src/Animated_GIF.js'),
  dist: getPath('dist/'),
  devContent: getPath('public/'),
  devDist: getPath('public/dist/'),
}

module.exports = paths
