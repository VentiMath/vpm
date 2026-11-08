"use strict";
module.exports = [
  ".card{margin:1px 2px 3px 4px;padding-left:12px;border-top-left-radius:8px;text-align:left;direction:ltr}",
  ".menu{position:fixed;left:10px;right:auto;transform:translateX(-100%);box-shadow:-4px 2px 8px #123;float:left}",
  ".avatar{border-radius:1px 2px 3px 4px;margin-inline-start:8px;background-position:20% 40%;cursor:sw-resize}",
  ".row{/*! @noflip */text-align:left;margin-left:5px}.row:dir(rtl){padding-right:3px}",
  "@media(min-width:300px){.row{margin:1px 2px 3px 4px;&:hover{padding-left:20px}}}",
  "@supports(display:grid){.grid{margin-left:10px}}",
  "@keyframes slide{from{left:0;transform:translateX(10px)}to{left:20px;transform:translateX(0px)}}",
  '.safe:before{content:"left;right:{}";background:url("/left-ltr.svg");padding-right:10px}',
  ".gradient{background:radial-gradient(ellipse 150% 100% at 50% 30%,#fff,transparent)}",
];
