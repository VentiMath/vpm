'use strict';
// Synthetic examples only. These extend beyond the KaTeX-accepted inventory.
module.exports=[
 ['slanted roman text',String.raw`\textsl{A slanted paragraph: Agyp} + x`],
 ['crossed-o letters',String.raw`\o+\O+\text{\o\O}`],
 ['array spacing',String.raw`\begin{array}{|r@{\hspace{2em}}l|}\hline\vspace{4pt}a&b\\c&d\\\hline\end{array}`],
 ['array padding',String.raw`\begin{array}{@{}l@{}c@{}}a&b\\c&d\end{array}`],
 ['bare answer',String.raw`\frac{x+1}{y}`],
];
