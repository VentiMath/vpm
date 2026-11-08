import cssjanus, { transform, type Options } from "vcssjanus";
const options: Options = { transformDirInUrl: true, transformEdgeInUrl: false };
const css: string = transform(".x{left:1px}", options);
cssjanus.transform(css, true, false);
// @ts-expect-error CSS input must be a string
transform(5);
// @ts-expect-error URL flags are booleans
transform(css, { transformDirInUrl: 1 });
