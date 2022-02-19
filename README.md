# gif-transparency [![NPM Version][npm-image]][npm-url]

_A Javascript library for creating animated GIFs with transparency_

**Based off of [Animated_GIF](https://github.com/sole/Animated_GIF) by [sole](https://github.com/sole)**

(I modified a bit too much in my fork)

## How to use it?

Include `dist/Animated_GIF.js` in your HTML.

```javascript
var imgs = document.querySelectorAll('img')

var ag = new Animated_GIF.default()
ag.setSize(320, 240)

for (var i = 0; i < imgs.length; i++) {
  ag.addFrame(imgs[i])
}

var animatedImage = document.createElement('img')

// This is asynchronous, rendered with WebWorkers
ag.getBase64GIF(function (image) {
  animatedImage.src = image
  document.body.appendChild(animatedImage)
})
```

If you instance lots of `Animated_GIF` objects, it's strongly recommended that you call their `destroy` method once you're done rendering the GIFs, as browsers don't seem to be happy otherwise. See the [stress test](tests/stress.html) for an example of this in use!

### Using from npm

You can also use this via npm.

To install:

```bash
npm install --save gif-transparency
```

To use:

```javascript
var Animated_GIF = require('gif-transparency')

// And then the examples are as before
var ag = new Animated_GIF()
ag.setSize(320, 240)

// ... etc
```

## Available options

Pass an object with the desired values when creating an `Animated_GIF` instance:

- `numWorkers (number) {2}`: how many web workers to use. Default is 2.
- `dithering (string) {undefined}`: selects how to best spread the error in colour mapping, to _conceal_ the fact that we're using a palette and not true color. Note that using this option automatically disables the aforementioned quantizer. Best results if you pass in a palette, but if not we'll create one using the colours in the first frame. Possible options:
  - 'nearest'
  - 'riemersma'
  - 'floyd-steinberg'
  - 'false-floyd-steinberg'
  - 'stucki'
  - 'atkinson'
  - 'jarvis'
  - 'burkes'
  - 'sierra'
  - 'two-sierra'
  - 'sierra-lite'
- `palette (Array) {undefined}`: An array of integers containing a palette. E.g. `[ 0xFF0000, 0x00FF00, 0x0000FF, 0x000000 ]` contains red, green, blue and black. The length of a palette must be a power of 2, and contain between 2 and 256 colours.

## Tests and examples

Check the files in the `tests` folder:

- [Basic](https://adriandelisle.github.io/gif-transparency/tests/basic.html)
- [Basic, but using Blobs](https://adriandelisle.github.io/gif-transparency/tests/basic-blob.html)
- [Custom Palettes](https://adriandelisle.github.io/gif-transparency/tests/custom_palette.html)
- [Dithering](https://adriandelisle.github.io/gif-transparency/tests/dithering.html)
- [Stress](https://adriandelisle.github.io/gif-transparency/tests/stress.html)
- [Transparent](https://adriandelisle.github.io/gif-transparency/tests/transparent.html)

## Contributing / walkthrough

Here's a quick walkthrough of each of the files in `src/` and what they do:

- `Animated_GIF.js` - definition of the `Animated_GIF` class. Holds the logic for the queueing and rendering of the files, and parsing config options.
- `Animated_GIF.worker.js` - code for the web worker that color-indexes frames in the background, using `image-q`. This is bundled in `dist/Animated_GIF.js`, using worker-loader.

### Development

Start the server by running:

```bash
npm run development
```

Starts a server at `http://localhost:9000/`. It watchs for changes in the source files and rebuilds/reloads automatically.

### Rebuild `dist` files

If you made changes in the library, you'll need to rebuild the files in `dist/` and `docs/dist` in order to see the changes working on master.

Once node.js is installed in your system, do:

```
cd gif-transparency     # or however you cloned the library to
npm install         # this pulls dependencies for building
npm run build       # builds dist/
npm run development # started the dev environment (watch task) and builds docs/dist (a development version of the library)
```

Once you do the initial two steps you just need to execute `npm run build` whenever you change things and want to rebuild the files in `dist/`.

### Breaking Changes

#### 2.0.0

- Removed window export of Animated_GIF

## Credits

We're using these fantastic libraries to do GIF stuff:

- Based off of [Animated_GIF](https://github.com/sole/Animated_GIF) by [sole](https://github.com/sole)
- [image-q](https://github.com/ibezkrovnyi/image-quantization) - image quantization library
- [omggif.js](https://github.com/deanm/omggif) - GIF89 encoder/decoder

[npm-image]: https://img.shields.io/npm/v/animated_gif.svg
[npm-url]: https://www.npmjs.com/package/gif-transparency
