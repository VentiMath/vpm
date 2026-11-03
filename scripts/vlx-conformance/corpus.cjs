'use strict';
// Synthetic cases derived from application feature requirements, not private problems.
module.exports=[
 ['fraction',String.raw`\frac{3}{7}+\sqrt{19}`],
 ['matrix',String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`],
 ['array rule',String.raw`\begin{array}{r}23\\\underline{\times\ 14}\\\hline 92\\230\end{array}`],
 ['framed array',String.raw`\begin{array}{|c|r|}\hline x&y\\\hline 1&2\\\hline\end{array}`],
 ['nested rule',String.raw`\begin{array}{r}2\\\begin{array}{r}7\\\hline 9\end{array}\end{array}`],
 ['dashed rule',String.raw`\begin{array}{c:c}1&2\\\hdashline 3&4\end{array}`],
 ['colored formula',String.raw`\color{red}{\boxed{\frac{a}{b}}}`],
 ['aligned',String.raw`\begin{aligned}x+y&=5\\x-y&=1\end{aligned}`],
 ['limits',String.raw`\sum_{n=1}^{\infty}\frac{1}{n^2}=\frac{\pi^2}{6}`],
 ['text',String.raw`\text{Cost is \$5; use \{x\}.}`],
 ['macro',String.raw`\newcommand{\twice}[1]{2#1}\twice{x}`],
 ['enclosure',String.raw`\enclose{circle}{x}`],
 ['overarc',String.raw`\overarc{AB}`],
];
