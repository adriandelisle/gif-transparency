// A library/utility for generating GIF files
// Uses Dean McNamee's omggif library
// and image-q's RGBQuant quantizer
//
// @author sole / http://soledadpenades.com
// Updated by Adrian De Lisle to support transparency & slight modernization
function Animated_GIF(globalOptions) {
  'use strict'

  globalOptions = globalOptions || {}

  const GifWriter = require('omggif').GifWriter

  let globalWidth = globalOptions.width || 160
  let globalHeight = globalOptions.height || 120
  const globalDithering = globalOptions.dithering || undefined
  const globalPalette = globalOptions.palette || null
  const globalDisposal = globalOptions.disposal || 0
  const globalTransparencyCutOff = globalOptions.transparencyCutOff || 0.7 // used for normalizing pixels to be full transparent or opaque
  let canvas = null,
    ctx = null,
    repeat = 0,
    delay = 250
  const frames = []
  let numRenderedFrames = 0
  let onRenderCompleteCallback = function() {}
  let onRenderProgressCallback = function() {}
  let workers = [],
    availableWorkers = [],
    numWorkers
  let generatingGIF = false

  // We'll try to be a little lenient with the palette so as to make the library easy to use
  // The only thing we can't cope with is having a non-array so we'll bail on that one.
  if (globalPalette) {
    if (!(globalPalette instanceof Array)) {
      throw ('Palette MUST be an array but it is: ', globalPalette)
    } else {
      // Now there are other two constraints that we will warn about
      // and silently fix them... somehow:

      // a) Must contain between 2 and 256 colours
      if (globalPalette.length < 2 || globalPalette.length > 256) {
        console.error('Palette must hold only between 2 and 256 colours')

        while (globalPalette.length < 2) {
          globalPalette.push(0x000000)
        }

        if (globalPalette.length > 256) {
          globalPalette = globalPalette.slice(0, 256)
        }
      }

      // b) Must be power of 2
      if (!powerOfTwo(globalPalette.length)) {
        console.error('Palette must have a power of two number of colours')

        while (!powerOfTwo(globalPalette.length)) {
          globalPalette.splice(globalPalette.length - 1, 1)
        }
      }
    }
  }

  globalOptions = globalOptions || {}
  numWorkers = globalOptions.numWorkers || 2

  for (let i = 0; i < numWorkers; i++) {
    const w = new Worker('./Animated_GIF.worker')
    workers.push(w)
    availableWorkers.push(w)
  }

  // ---

  // Return a worker for processing a frame
  function getWorker() {
    if (availableWorkers.length === 0) {
      throw 'No workers left!'
    }

    return availableWorkers.pop()
  }

  // Restore a worker to the pool
  function freeWorker(worker) {
    availableWorkers.push(worker)
  }

  // Faster/closurized bufferToString function
  // (caching the String.fromCharCode values)
  const bufferToString = (function() {
    let byteMap = []
    for (let i = 0; i < 256; i++) {
      byteMap[i] = String.fromCharCode(i)
    }

    return function(buffer) {
      const numberValues = buffer.length
      let str = ''

      for (let i = 0; i < numberValues; i++) {
        str += byteMap[buffer[i]]
      }

      return str
    }
  })()

  function startRendering(completeCallback) {
    onRenderCompleteCallback = completeCallback

    for (let i = 0; i < numWorkers && i < frames.length; i++) {
      processFrame(i)
    }
  }

  function processFrame(position) {
    let frame
    let worker

    frame = frames[position]

    if (frame.beingProcessed || frame.done) {
      console.error('Frame already being processed or done!', frame.position)
      onFrameFinished()
      return
    }

    frame.beingProcessed = true

    worker = getWorker()

    worker.onmessage = function(ev) {
      const data = ev.data

      // Delete original data, and free memory
      delete frame.data

      // TODO grrr... HACK for object -> Array
      frame.pixels = Array.prototype.slice.call(data.pixels)
      frame.palette = Array.prototype.slice.call(data.palette)
      frame.transparencyIndex = data.transparencyIndex
      frame.done = true
      frame.beingProcessed = false

      freeWorker(worker)

      onFrameFinished()
    }

    worker.postMessage(frame)
  }

  function processNextFrame() {
    let position = -1

    for (let i = 0; i < frames.length; i++) {
      var frame = frames[i]
      if (!frame.done && !frame.beingProcessed) {
        position = i
        break
      }
    }

    if (position >= 0) {
      processFrame(position)
    }
  }

  function onFrameFinished() {
    // ~~~ taskFinished

    // The GIF is not written until we're done with all the frames
    // because they might not be processed in the same order
    const allDone = frames.every(function(frame) {
      return !frame.beingProcessed && frame.done
    })

    numRenderedFrames++
    onRenderProgressCallback((numRenderedFrames * 0.75) / frames.length)

    if (allDone) {
      if (!generatingGIF) {
        generateGIF(frames, onRenderCompleteCallback)
      }
    } else {
      setTimeout(processNextFrame, 1)
    }
  }

  // Takes the already processed data in frames and feeds it to a new
  // GifWriter instance in order to get the binary GIF file
  function generateGIF(frames, callback) {
    // TODO: Weird: using a simple JS array instead of a typed array,
    // the files are WAY smaller o_o. Patches/explanations welcome!
    const buffer = [] // new Uint8Array(width * height * frames.length * 5);
    const gifOptions = { loop: repeat }

    // Using global palette but only if we're also using dithering
    if (globalDithering !== null && globalPalette !== null) {
      gifOptions.palette = globalPalette
    }

    const gifWriter = new GifWriter(
      buffer,
      globalWidth,
      globalHeight,
      gifOptions
    )

    generatingGIF = true

    frames.forEach(function(frame) {
      let framePalette = globalPalette ? globalPalette : frame.palette

      onRenderProgressCallback(
        0.75 + (0.25 * frame.position * 1.0) / frames.length
      )

      gifWriter.addFrame(0, 0, globalWidth, globalHeight, frame.pixels, {
        palette: framePalette,
        delay: delay,
        transparent: frame.transparencyIndex,
        disposal: frame.disposal,
      })
    })

    gifWriter.end()
    onRenderProgressCallback(1.0)

    frames = []
    generatingGIF = false

    callback(buffer)
  }

  function powerOfTwo(value) {
    return value !== 0 && (value & (value - 1)) === 0
  }

  // ---

  this.setSize = function(w, h) {
    globalWidth = w
    globalHeight = h
    canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    ctx = canvas.getContext('2d')
  }

  // Internally, GIF uses tenths of seconds to store the delay
  this.setDelay = function(seconds) {
    delay = seconds * 0.1
  }

  // From GIF: 0 = loop forever, null = not looping, n > 0 = loop n times and stop
  this.setRepeat = function(r) {
    repeat = r
  }

  this.addFrame = function(element, options = {}) {
    if (ctx === null) {
      this.setSize(globalWidth, globalHeight)
    }
    // clear the canvas because drawing over other frames breaks transparency
    ctx.clearRect(0, 0, globalWidth, globalHeight)
    ctx.drawImage(element, 0, 0, globalWidth, globalHeight)
    const imageData = ctx.getImageData(0, 0, globalWidth, globalHeight)

    this.addFrameImageData(imageData, options)
  }

  this.addFrameImageData = function(imageData, options = {}) {
    const imageDataArray = new Uint8Array(imageData.data)

    frames.push({
      data: imageDataArray,
      width: imageData.width,
      height: imageData.height,
      palette: options.palette || globalPalette,
      dithering: options.dithering || globalDithering,
      disposal: options.disposal || globalDisposal,
      transparencyCutOff:
        options.transparencyCutOff || globalTransparencyCutOff,
      done: false,
      beingProcessed: false,
      position: frames.length,
    })
  }

  this.onRenderProgress = function(callback) {
    onRenderProgressCallback = callback
  }

  this.isRendering = function() {
    return generatingGIF
  }

  this.getBase64GIF = function(completeCallback) {
    const onRenderComplete = function(buffer) {
      const str = bufferToString(buffer)
      const gif = 'data:image/gif;base64,' + btoa(str)
      completeCallback(gif)
    }

    startRendering(onRenderComplete)
  }

  this.getBlobGIF = function(completeCallback) {
    const onRenderComplete = function(buffer) {
      const array = new Uint8Array(buffer)
      const blob = new Blob([array], { type: 'image/gif' })
      completeCallback(blob)
    }

    startRendering(onRenderComplete)
  }

  // Once this function is called, the object becomes unusable
  // and you'll need to create a new one.
  this.destroy = function() {
    // Explicitly ask web workers to die so they are explicitly GC'ed
    workers.forEach(function(w) {
      w.terminate()
    })
  }
}

// Not using the full blown exporter because this is supposed to be built
// into dist/Animated_GIF.js using a build step with browserify
module.exports = Animated_GIF
