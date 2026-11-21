import api from "./index.cjs";
export const {
  TraceMap,
  presortedDecodedMap,
  decodedMappings,
  encodedMappings,
  decodedMap,
  encodedMap,
  traceSegment,
  originalPositionFor,
  generatedPositionFor,
  allGeneratedPositionsFor,
  eachMapping,
  sourceContentFor,
  isIgnored,
  GREATEST_LOWER_BOUND,
  LEAST_UPPER_BOUND,
} = api;
