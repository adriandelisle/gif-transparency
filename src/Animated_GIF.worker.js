var Dithering = require('node-dithering')
const { applyPaletteSync, buildPaletteSync, utils } = require('image-q')

function channelizePalette(palette) {
  var channelizedPalette = []

  for (var i = 0; i < palette.length; i++) {
    var color = palette[i]

    var r = (color & 0xff0000) >> 16
    var g = (color & 0x00ff00) >> 8
    var b = color & 0x0000ff

    channelizedPalette.push([r, g, b, color])
  }

  return channelizedPalette
}

/**
 * Searches for an unused color in the image data so it can be used as a unique color
 * for transparent pixels. Builds up a set of all known colors then searches from
 * 0x000000 to 0xFFFFFF for a color not in the set. They're is probably a much more effecient
 * way of doing this. There is also a possibilty all colors are used, but that's probably
 * just a test image.
 * @param {*} data
 * @param {*} width
 * @param {*} height
 */
function searchForUnusedColor(data, width, height) {
  let i = 0
  const length = width * height * 4
  const knownColors = new Set()

  while (i < length) {
    const r = data[i++]
    const g = data[i++]
    const b = data[i++]
    i++ // don't track the transparency here just the rgb values
    const pixelColor = (r << 16) | (g << 8) | b
    knownColors.add(pixelColor)
  }

  let unusedColor = 0x00
  while (unusedColor < 0xffffff) {
    if (!knownColors.has(unusedColor)) break
    unusedColor++
  }

  return unusedColor
}

function dataToRGBANormalized(
  data,
  width,
  height,
  unusedColor,
  transparencyCutOff = 0.7
) {
  var i = 0
  var length = width * height * 4
  var rgba = []
  const transparencyCutOffValue = Math.trunc(255 * transparencyCutOff)

  const unusedColorR = (unusedColor & 0xff0000) >> 16
  const unusedColorG = (unusedColor & 0x00ff00) >> 8
  const unusedColorB = unusedColor & 0x0000ff

  while (i < length) {
    const r = data[i++]
    const g = data[i++]
    const b = data[i++]
    let a = data[i++]
    a = a >= transparencyCutOffValue ? 0xff : 0x00

    if (unusedColor !== undefined && a === 0) {
      rgba.push(unusedColorR)
      rgba.push(unusedColorG)
      rgba.push(unusedColorB)
      rgba.push(0x00)
    } else {
      rgba.push(r)
      rgba.push(g)
      rgba.push(b)
      rgba.push(0xff)
    }
  }

  return rgba
}

function componentizedPaletteToArray(paletteRGB) {
  var paletteArray = []

  for (var i = 0; i < paletteRGB.length; i += 3) {
    var r = paletteRGB[i]
    var g = paletteRGB[i + 1]
    var b = paletteRGB[i + 2]
    paletteArray.push((r << 16) | (g << 8) | b)
  }

  return paletteArray
}

/**
 * Takes an array of points from image-q and converts them to an array of sorted rgb values
 * @param {Array[Points]} points
 * returns {Array}
 */
function pointsToRgb(points) {
  return points.map(point => (point.r << 16) | (point.g << 8) | point.b)
}

/**
 * @param {Uint32Array} pixels
 * @param {Uint32Array} palette
 * @returns {Uint8Array}
 */
function indexPixelsWithPalette(pixels, palette) {
  return Uint8Array.from(pixels.map(pixel => palette.indexOf(pixel)))
}

// This is the "traditional" Animated_GIF style of going from RGBA to indexed color frames
function processFrameWithQuantizer(
  imageData,
  width,
  height,
  sampleInterval,
  searchForTransparency,
  transparencyCutOff
) {
  let unusedColor
  if (searchForTransparency) {
    unusedColor = searchForUnusedColor(imageData, width, height)
  }
  const rgba = dataToRGBANormalized(
    imageData,
    width,
    height,
    unusedColor,
    transparencyCutOff
  )

  const pointContainer = utils.PointContainer.fromUint8Array(
    new Uint8Array(rgba),
    width,
    height
  )
  const palette = buildPaletteSync([pointContainer], {
    paletteQuantization: 'rgbquant',
    colors: 255, // leave one for transparency
  })
  palette.add(utils.Point.createByUint32(unusedColor))
  const outPointContainer = applyPaletteSync(pointContainer, palette)
  const paletteRgbArray = pointsToRgb(
    palette.getPointContainer().getPointArray()
  )
  paletteRgbArray.sort((a, b) => a - b)
  const transparencyIndex = paletteRgbArray.indexOf(unusedColor)

  const indexedPixels = indexPixelsWithPalette(
    pointsToRgb(outPointContainer.getPointArray()),
    paletteRgbArray
  )

  return {
    pixels: indexedPixels,
    palette: Array.from(paletteRgbArray),
    transparencyIndex: unusedColor ? transparencyIndex : undefined,
  }
}

// And this is a version that uses dithering against of quantizing
// It can also use a custom palette if provided, or will build one otherwise
function processFrameWithDithering(
  imageData,
  width,
  height,
  ditheringType,
  palette
) {
  // Extract component values from data
  var rgbComponents = dataToRGBANormalized(imageData, width, height)

  // Build palette if none provided
  if (palette === null) {
    var nq = new NeuQuant(rgbComponents, rgbComponents.length, 16)
    var paletteRGB = nq.process()
    palette = componentizedPaletteToArray(paletteRGB)
  }

  var paletteArray = new Uint32Array(palette)
  var paletteChannels = channelizePalette(palette)

  // Convert RGB image to indexed image
  var ditheringFunction

  if (ditheringType === 'closest') {
    ditheringFunction = Dithering.Closest
  } else if (ditheringType === 'floyd') {
    ditheringFunction = Dithering.FloydSteinberg
  } else {
    ditheringFunction = Dithering.Bayer
  }

  pixels = ditheringFunction(rgbComponents, width, height, paletteChannels)

  return {
    pixels: pixels,
    palette: paletteArray,
  }
}

// ~~~

function run(frame) {
  const {
    width,
    height,
    data,
    dithering,
    palette,
    sampleInterval,
    searchForTransparency,
    transparencyCutOff,
  } = frame

  if (dithering) {
    return processFrameWithDithering(data, width, height, dithering, palette)
  } else {
    return processFrameWithQuantizer(
      data,
      width,
      height,
      sampleInterval,
      searchForTransparency,
      transparencyCutOff
    )
  }
}

self.onmessage = function(ev) {
  var data = ev.data
  var response = run(data)
  postMessage(response)
}
