'use strict';
module.exports=[...require('./corpus.cjs'),...require('./production-corpus.cjs'),...require('./extended-corpus.cjs'),
 ...require('./picture-corpus.cjs').roots,
 ['empty formula',''],['escaped text',String.raw`\text{<b> \& "quoted" 'text'}`],
 ['nested phantom',String.raw`\frac{\vphantom{x^2}y}{\hphantom{abc}z}`],
 ['small caps and matrices',String.raw`\textsc{Abc}+\begin{smallmatrix}x&y\\z&w\end{smallmatrix}`],
];
