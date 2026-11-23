# VentiLaTeX on Three.js surfaces

A working study of VLX math on an open book and curved parchment, using public
synthetic formulas. It uses the existing VLX `renderMath` output and adds no
Three.js dependency to the VLX package. It is not a published scene component
or a change to VentiMath's live immersive scenes.

## Rendering approach

VLX emits its own glyph outlines in SVG. `surface.mjs` decodes these outlines
into a page canvas alongside prose, then `main.mjs` maps that canvas onto a
subdivided mesh. Curving the mesh preserves its UV coordinates, so the math
curves with the paper. No DOM screenshot, external font, MathJax, or KaTeX is
involved. Source TeX and formula hit regions stay separate from the pixels.

The [CanvasTexture](https://threejs.org/docs/pages/CanvasTexture.html) uses sRGB
color annotation, mipmaps, and up to 8× anisotropic filtering. These follow
Three.js's [texture documentation](https://threejs.org/docs/pages/Texture.html)
and [color management guidance](https://threejs.org/manual/pages/color-management.html).
Changing resolution replaces and disposes the texture instead of resizing an
uploaded image. Renders happen on changes, not on an idle animation loop.

The default three pages use about 21.3 MiB of RGBA texture storage including
mipmaps, before driver overhead. Light (512 px) uses about 5.3 MiB; Fine
(2048 px) about 85.3 MiB. Thus a library should load visible pages on demand,
keep a texture budget, and release distant or closed books.

This is our recommended first integration path for reading-distance surfaces.
Text remains rasterized on the GPU: extreme zoom and grazing angles cannot
preserve unlimited detail. The controls expose these limits rather than hiding
them. Vector meshes through [SVGLoader](https://threejs.org/docs/pages/SVGLoader.html)
are another option for extreme close-ups, at the cost of tessellation and
geometry management; they are not implemented or benchmarked here.

## Interaction and accessibility

A raycast maps the clicked UV coordinate to its source formula and focuses the
same formula in an ordinary reading view. The reader retains VLX's MathML,
keyboard scrolling, text selection and partial TeX copying. Its toolbar button
also works without clicking the canvas. If WebGL cannot initialize, the reader
opens automatically. A canvas texture itself does not expose readable math to
assistive technology.

A live consumer should put this reader in its existing book/reading UI and
connect its existing interaction lifecycle. This study is deliberately not
that consumer integration. Actual mobile GPU quality, VR input, screen-reader
speech and Safari/Firefox acceptance remain unverified.

## Run and verify

```sh
npm --prefix scripts/vlx-three-conformance ci --ignore-scripts
node scripts/vlx-three-conformance/build.cjs /tmp/vlx-three.html
VLX_THREE_OUTPUT=/tmp/vlx-three-checks node scripts/vlx-three-conformance/browser.cjs /tmp/vlx-three.html 187
node scripts/vlx-three-conformance/build.cjs /tmp/vlx-three-app.html three-app
node scripts/vlx-three-conformance/browser.cjs /tmp/vlx-three-app.html 184
```

Open the built HTML directly; it is self-contained and includes Three.js and
font license notices. The fixture pins Three.js 0.187.0 and the app's 0.184.0.
The isolated Chrome/SwiftShader checks cover all 12 formulas having visible
texture ink, correct dimensions/color space, raycast focus, MathML, `$n^6$`
partial copying, mobile-width reflow, asynchronous resolution replacement,
texture cleanup and the no-WebGL fallback. Screenshots capture desk, close and
grazing views. Software-renderer setup timing is diagnostic, not a prediction
of app frame rates or mobile performance.
