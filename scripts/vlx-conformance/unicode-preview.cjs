'use strict';
const fs=require('node:fs'),path=require('node:path'),{Resvg}=require('@resvg/resvg-js'),{renderProblemSvg}=require('./load.cjs')('problem');
const out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
const statement='Fractions: ½ and ¾. Powers: 2² and 3³. Ordinals: 6ᵗʰ and 2ⁿᵈ.\n\nAccented name: Erdős. Temperature: 50˚. Angle: 37º.\n\nCustom symbols: ® Ж ☺ ◉ ¶ ●.\n\nFullwidth punctuation: A，B：C.\n\nUnbroken soft hyphen: co\u00adoperate.\n\n'+require('./unicode-corpus.cjs').map(([,tex])=>'$$'+tex+'$$').join('\n\n');
const result=renderProblemSvg({statement});fs.writeFileSync(path.join(out,'unicode.svg'),result.svg);fs.writeFileSync(path.join(out,'unicode.png'),new Resvg(result.svg,{font:{loadSystemFonts:false}}).render().asPng());console.log(out);
