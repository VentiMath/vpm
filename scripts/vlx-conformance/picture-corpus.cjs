'use strict';
// Synthetic controls for the Discord review; no private problem text ships.
exports.roots=[
 ['indexed root after coefficient',String.raw`10\sqrt[3]{10}`],
 ['indexed root after variable',String.raw`a\sqrt[n]{b}`],
 ['wide root degree',String.raw`2\sqrt[123]{x}`],
 ['root of a fraction',String.raw`3\sqrt[4]{\frac{x+1}{y}}`],
 ['nested indexed root',String.raw`\sqrt[3]{\sqrt[4]{x}}`],
];
exports.pages=[
 ['standalone fraction',{statement:String.raw`Evaluate.

$\frac{1}{2}+\frac{3}{4}$`}],
 ['choice labels and root degree',{statement:'Select an expression.',options:{A:String.raw`10\sqrt[3]{10}`,B:String.raw`10^3\sqrt{10}`,C:String.raw`\frac{1}{2}`}}],
 ['explicit paragraph breaks',{statement:String.raw`First line. $\\$ Second line. $\\$ $\\$ Fourth line.`}],
];
