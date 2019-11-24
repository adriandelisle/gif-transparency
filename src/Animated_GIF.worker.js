import { applyPaletteSync, buildPaletteSync, utils } from 'image-q'

/**
 * Searches for an unused colour in the image data so it can be used as a unique colour
 * for transparent pixels. Builds up a set of all known colours then searches from
 * 0x000000 to 0xFFFFFF for a colour not in the set. They're is probably a much more effecient
 * way of doing this. There is also a possibilty all colours are used, but that's probably
 * just a test image.
 * @param {*} data
 * @param {*} width
 * @param {*} height
 */
function searchForUnusedColour(data, width, height) {
  let i = 0
  const length = width * height * 4
  const knownColours = new Set()

  while (i < length) {
    const r = data[i++]
    const g = data[i++]
    const b = data[i++]
    i++ // don't track the transparency here just the rgb values
    const pixelColour = (r << 16) | (g << 8) | b
    knownColours.add(pixelColour)
  }

  let unusedColour = 0x00
  while (unusedColour < 0xffffff) {
    if (!knownColours.has(unusedColour)) break
    unusedColour++
  }

  return unusedColour
}

function dataToRGBANormalized(
  data,
  width,
  height,
  unusedColour,
  transparencyCutOff = 0.7
) {
  let i = 0
  const length = width * height * 4
  const rgba = []
  const transparencyCutOffValue = Math.trunc(255 * transparencyCutOff)
  let hasTransparency = false

  const unusedColourR = (unusedColour & 0xff0000) >> 16
  const unusedColourG = (unusedColour & 0x00ff00) >> 8
  const unusedColourB = unusedColour & 0x0000ff

  while (i < length) {
    const r = data[i++]
    const g = data[i++]
    const b = data[i++]
    let a = data[i++]
    a = a >= transparencyCutOffValue ? 0xff : 0x00

    if (unusedColour !== undefined && a === 0) {
      rgba.push(unusedColourR)
      rgba.push(unusedColourG)
      rgba.push(unusedColourB)
      rgba.push(0x00)
      hasTransparency = true
    } else {
      rgba.push(r)
      rgba.push(g)
      rgba.push(b)
      rgba.push(0xff)
    }
  }

  return { rgba, hasTransparency }
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

function processFrameWithQuantizer(
  imageData,
  width,
  height,
  transparencyCutOff,
  dithering
) {
  const unusedColour = searchForUnusedColour(imageData, width, height)
  const { rgba, hasTransparency } = dataToRGBANormalized(
    imageData,
    width,
    height,
    unusedColour,
    transparencyCutOff
  )

  const pointContainer = utils.PointContainer.fromUint8Array(
    new Uint8Array(rgba),
    width,
    height
  )
  const palette = buildPaletteSync([pointContainer], {
    paletteQuantization: 'rgbquant',
    colors: hasTransparency && unusedColour ? 255 : 256, // leave one for transparency
  })
  if (hasTransparency && unusedColour) {
    palette.add(utils.Point.createByUint32(unusedColour))
  }
  const outPointContainer = applyPaletteSync(pointContainer, palette, {
    imageQuantization: dithering,
  })
  const paletteRgbArray = pointsToRgb(
    palette.getPointContainer().getPointArray()
  )
  paletteRgbArray.sort((a, b) => a - b)
  const transparencyIndex = paletteRgbArray.indexOf(unusedColour)

  const indexedPixels = indexPixelsWithPalette(
    pointsToRgb(outPointContainer.getPointArray()),
    paletteRgbArray
  )

  return {
    pixels: indexedPixels,
    palette: Array.from(paletteRgbArray),
    transparencyIndex: transparencyIndex > -1 ? transparencyIndex : undefined,
  }
}

// ~~~

function run(frame) {
  const { width, height, data, dithering, transparencyCutOff } = frame

  return processFrameWithQuantizer(
    data,
    width,
    height,
    transparencyCutOff,
    dithering
  )
}

self.onmessage = function(ev) {
  var data = ev.data
  var response = run(data)
  postMessage(response)
}
