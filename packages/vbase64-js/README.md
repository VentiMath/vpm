# vbase64-js

A dependency-free implementation of the three functions in base64-js 1.5.1. VentiMath installs the codec through the browser Buffer implementation and the property-list writer used by Capacitor.

`fromByteArray(bytes)` encodes the visible bytes of a Uint8Array as standard padded Base64. `toByteArray(text)` accepts the standard and URL-safe alphabets. `byteLength(text)` gives the decoded size without allocating a byte array. Both string operations require a multiple of four characters and retain upstream’s permissive treatment of unknown digits. Use a separate validator when input must be canonical.

[Node and Bun measurements](bench/results/README.md)
