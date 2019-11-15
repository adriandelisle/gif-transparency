var NeuQuant = require('./lib/NeuQuant')
var Dithering = require('node-dithering')

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

function dataToRGB(data, width, height, unusedColor) {
  var i = 0
  var length = width * height * 4
  var rgb = []

  const unusedColorR = (unusedColor & 0xff0000) >> 16
  const unusedColorG = (unusedColor & 0x00ff00) >> 8
  const unusedColorB = unusedColor & 0x0000ff

  while (i < length) {
    const r = data[i++]
    const g = data[i++]
    const b = data[i++]
    const a = data[i++]

    if (unusedColor && !a) {
      rgb.push(unusedColorR)
      rgb.push(unusedColorG)
      rgb.push(unusedColorB)
    } else {
      rgb.push(r)
      rgb.push(g)
      rgb.push(b)
    }
  }

  return rgb
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

// This is the "traditional" Animated_GIF style of going from RGBA to indexed color frames
function processFrameWithQuantizer(
  imageData,
  width,
  height,
  sampleInterval,
  searchForTransparency
) {
  var unusedColor
  if (searchForTransparency) {
    unusedColor = searchForUnusedColor(imageData, width, height)
  }
  var rgbComponents = dataToRGB(imageData, width, height, unusedColor)
  var nq = new NeuQuant(rgbComponents, rgbComponents.length, sampleInterval)
  var paletteRGB = nq.process()
  var paletteArray = new Uint32Array(componentizedPaletteToArray(paletteRGB))

  var numberPixels = width * height
  var indexedPixels = new Uint8Array(numberPixels)

  var k = 0
  for (var i = 0; i < numberPixels; i++) {
    r = rgbComponents[k++]
    g = rgbComponents[k++]
    b = rgbComponents[k++]
    indexedPixels[i] = nq.map(r, g, b)
  }

  const data = {
    pixels: indexedPixels,
    palette: paletteArray,
  }

  if (searchForTransparency) {
    // Try and get the index of the transparent color in the palette
    for (let i = 0; i < paletteArray.length; i++) {
      if (paletteArray[i] === unusedColor) {
        data.transparencyIndex = i
        break
      }
    }
  }

  return data
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
  var rgbComponents = dataToRGB(imageData, width, height)

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
  var width = frame.width
  var height = frame.height
  var imageData = frame.data
  var dithering = frame.dithering
  var palette = frame.palette
  var sampleInterval = frame.sampleInterval
  var searchForTransparency = frame.searchForTransparency

  if (dithering) {
    return processFrameWithDithering(
      imageData,
      width,
      height,
      dithering,
      palette
    )
  } else {
    return processFrameWithQuantizer(
      imageData,
      width,
      height,
      sampleInterval,
      searchForTransparency
    )
  }
}

self.onmessage = function(ev) {
  var data = ev.data
  var response = run(data)
  postMessage(response)
}
