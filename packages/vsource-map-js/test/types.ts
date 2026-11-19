import {SourceMapConsumer, SourceMapGenerator} from '../index.cjs';
const map = new SourceMapGenerator({ file: 'theme.css' });
map.addMapping({ generated: {line: 1, column: 0}, source: 'contest.css', original: {line: 8, column: 0} });
const source: string | null = new SourceMapConsumer(map.toJSON()).originalPositionFor({line:1, column:0}).source;
