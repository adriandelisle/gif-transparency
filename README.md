# Animated_GIF [![NPM Version][npm-image]][npm-url]

_A Javascript library for creating animated GIFs_

## How to use it?

Include `dist/Animated_GIF.js` in your HTML.

```javascript
var imgs = document.querySelectorAll('img')

var ag = new Animated_GIF()
ag.setSize(320, 240)

for (var i = 0; i < imgs.length; i++) {
  ag.addFrame(imgs[i])
}

var animatedImage = document.createElement('img')

// This is asynchronous, rendered with WebWorkers
ag.getBase64GIF(function(image) {
  animatedImage.src = image
  document.body.appendChild(animatedImage)
})
```

If you instance lots of `Animated_GIF` objects, it's strongly recommended that you call their `destroy` method once you're done rendering the GIFs, as browsers don't seem to be happy otherwise. See the [stress test](tests/stress.html) for an example of this in use!

### Minified versions

There's a minified version in `dist/`: `dist/Animated_GIF.min.js`.

### Using from npm

You can also use this via npm.

To install:

```bash
npm install --save animated_gif
```

To use:

```javascript
var Animated_GIF = require('animated_gif')

// And then the examples are as before
var ag = new Animated_GIF()
ag.setSize(320, 240)

// ... etc
```

## Available options

Pass an object with the desired values when creating an `Animated_GIF` instance:

- `numWorkers (number) {2}`: how many web workers to use. Default is 2.
- `useQuantizer (bool) {true}`: this is `true` by default, and provides the highest quality results, at the cost of slower processing and bigger files. When this is enabled, a neural network quantizer will be used to find the best palette for each frame. No dithering is available in this case, as the colours are chosen with the quantizer too.
- `searchForTransparency (bool) {false}`: if true searches for a colour to set as transparent. Only works when useQuantizer is true.
- `dithering (string) {undefined}`: selects how to best spread the error in colour mapping, to _conceal_ the fact that we're using a palette and not true color. Note that using this option automatically disables the aforementioned quantizer. Best results if you pass in a palette, but if not we'll create one using the colours in the first frame. Possible options:
  - `bayer`: creates a somewhat nice and retro 'x' hatched pattern
  - `floyd`: creates another somewhat retro look where error is spread, using the Floyd-Steinberg algorithm
  - `closest`: actually no dithering, just picks the closest colour from the palette per each pixel
- `palette (Array) {undefined}`: An array of integers containing a palette. E.g. `[ 0xFF0000, 0x00FF00, 0x0000FF, 0x000000 ]` contains red, green, blue and black. The length of a palette must be a power of 2, and contain between 2 and 256 colours.

## Tests and examples

Check the files in the `tests` folder:

- [Basic](http://sole.github.io/Animated_GIF/tests/basic.html)
- [Basic, but using Blobs](http://sole.github.io/Animated_GIF/tests/basic-blob.html)
- [Custom Palettes](http://sole.github.io/Animated_GIF/tests/custom_palette.html)
- [Dithering](http://sole.github.io/Animated_GIF/tests/dithering.html)
- [Stress](http://sole.github.io/Animated_GIF/tests/stress.html)
- [Sample Interval](http://sole.github.io/Animated_GIF/tests/sample_interval.html)

Start the server by running:

```bash
npm run dev
```

Starts a server at `http://127.0.0.1:9966`. So you can now go to `http://127.0.0.1:9966/tests/` and see the available examples.

## Contributing / walkthrough

Here's a quick walkthrough of each of the files in `src/` and what they do:

- `Animated_GIF.js` - definition of the `Animated_GIF` class. Holds the logic for the queueing and rendering of the files, and parsing config options.
- `Animated_GIF.worker.js` - code for the web worker that color-indexes frames in the background, using `node-dithering` and `NeuQuant.js`. This is bundled in `dist/Animated_GIF.js`, using workerify.

### Rebuild `dist` files

If you made changes in the library, you'll need to rebuild the files in `dist/` in order to see the changes working. We have a [node.js](http://nodejs.org/)-based script to regenerate those files.

Once node.js is installed in your system, do:

```
cd Animated_GIF     # or however you cloned the library to
npm install         # this pulls dependencies for building (uglify, browserify)
npm run build       # and this actually builds
```

Once you do the initial two steps you just need to execute `npm run build` whenever you change things and want to rebuild the files in `dist/`. Or you can also use `npm run watch` to have it build the library automatically.

## Credits

We're using these fantastic libraries to do GIF stuff:

- [image-q](https://github.com/ibezkrovnyi/image-quantization) - image quantization library
- [omggif.js](https://github.com/deanm/omggif) - GIF89 encoder/decoder

And then, to build the `dist` files

- node.js
- uglify
- browserify

[npm-image]: https://img.shields.io/npm/v/animated_gif.svg
[npm-url]: https://npmjs.org/package/animated_gif
