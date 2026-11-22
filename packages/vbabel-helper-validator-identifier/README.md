# vbabel-helper-validator-identifier

Validates ECMAScript identifier names and classifies keywords for Babel. Exposes the eight named predicates used by `@babel/helper-validator-identifier` 7.29.7 and VentiMath’s 7.28.5. The package has zero runtime dependencies.

```js
import {isIdentifierName, isStrictBindReservedWord} from "vbabel-helper-validator-identifier";
isIdentifierName("Δscore"); // true
isStrictBindReservedWord("await", true); // true in a module
```

Identifier syntax, keyword restrictions and strict binding restrictions are separate checks. Names are decoded JavaScript strings. The code-point functions take integers and return false for out-of-range or fractional inputs. Shared Unicode pages are generated from Unicode 17.0.0 so classification stays consistent across runtimes. Tests compare all 1,114,112 code points and run Babel Types’ own name-validation and conversion methods.

[Measurements](bench/results/README.md) · [Data source and generation](../../scripts/source-map-conformance/README.md) · [Unicode data license](UNICODE-LICENSE.txt)
