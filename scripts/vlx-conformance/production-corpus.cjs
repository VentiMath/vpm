'use strict';
// New synthetic expressions exercising syntax found by the private production
// audit. No production statements, answers, document paths or IDs are copied.
module.exports=[
 ['explicit math lines',String.raw`a+2\\b+3\\c+4`],
 ['binary wrappers',String.raw`a\mathbin{\yen}b+u\mathrel{\diamond}v`],
 ['product and shape operators',String.raw`\odot\star\diamond\bigtriangleup\otimes\oplus\wedge\vee\square\diamondsuit\heartsuit\blacklozenge\boxdot\bigcirc\bigstar`],
 ['delimiter aliases',String.raw`\left\lbrace\frac{x}{y}\right\rbrace+\left\lVert A\right\rVert+\lbrack z\rbrack`],
 ['continued fraction and choose',String.raw`\cfrac{2}{3+\cfrac{4}{5}}+{n\choose 3}`],
 ['operators with annotations',String.raw`A\stackrel{*}{\sim}B+\overset{\frown}{CD}+\underset{n}{x}`],
 ['font declarations',String.raw`{\cal F}+\Bbb Q+\boldsymbol{\textit{value}}`],
 ['circled text and cancellation',String.raw`a\textcircled{T}b+\frac{1\cancel8}{\cancel82}`],
 ['dimensions and rules',String.raw`a\hspace{2 mm}\rule{0.4cm}{0.2mm}b`],
 ['text tokens and escapes',String.raw`\text t+\textit{\(q\)-term}+\text{\char"00A2}`],
 ['extended text glyphs','\\text{¥ ¢ ă Ă ‑}\\quad 20◦'],
 ['named operators and large symbols',String.raw`\dim\ker A+\arg z+\Im z+\bigoplus_i X_i+\bigotimes_j Y_j\dotsb`],
 ['arrow and musical symbols',String.raw`x\longmapsto y\longrightarrow z,\quad\natural\sharp\flat\downarrow`],
 ['unbraced array specification',String.raw`\begin{array}c x+1\\y+2\end{array}`],
];
