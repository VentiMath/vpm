import { encode, decode, type SourceMapMappings } from "vsourcemap-codec";
const mappings: SourceMapMappings = decode(encode([[[0, 1, 2, 3]]] as const));
void mappings;
// @ts-expect-error A mapped segment also needs its original position.
encode([[[0, 1]]]);
