"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {cursor,erase,scroll,clear,beep}=require(process.env.VPM_ANSI_PACKAGE||"../index.cjs");
test("absolute coordinates distinguish row zero from an omitted row",()=>{
 assert.equal(cursor.to(4),"\x1b[5G");assert.equal(cursor.to(4,0),"\x1b[1;5H");
 assert.equal(cursor.to(0,0),"\x1b[1;1H");assert.equal(cursor.to(4,8),"\x1b[9;5H");
});
test("relative movement retains horizontal-before-vertical terminal order",()=>{
 assert.equal(cursor.move(-3,2),"\x1b[3D\x1b[2B");assert.equal(cursor.move(3,-2),"\x1b[3C\x1b[2A");assert.equal(cursor.move(),"");
 assert.equal(cursor.up(),"\x1b[1A");assert.equal(cursor.up(0),"\x1b[0A");
});
test("clearing retains byte-compatible line and scroll sequences without a receiver",()=>{
 const {lines}=erase;assert.equal(lines(),"");assert.equal(lines(0),"");
 assert.equal(lines(1),"\x1b[2K\x1b[G");assert.equal(lines(3),"\x1b[2K\x1b[1A\x1b[2K\x1b[1A\x1b[2K\x1b[G");
 assert.equal(scroll.down(2),"\x1b[T\x1b[T");assert.equal(cursor.nextLine(2),"\x1b[E\x1b[E");
 assert.equal(clear.screen,"\x1bc");assert.equal(beep,"\x07");
});
test("invalid coordinates and unbounded repeats fail before constructing output",()=>{
 for(const value of [NaN,Infinity,-Infinity,0.5,-1,"2",null,{},Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>cursor.to(value),RangeError);assert.throws(()=>erase.lines(value),RangeError);assert.throws(()=>scroll.up(value),RangeError);
 }
 for(const value of [1000001,Number.MAX_SAFE_INTEGER])assert.throws(()=>erase.lines(value),RangeError);
 assert.throws(()=>cursor.to(Number.MAX_SAFE_INTEGER),RangeError);
 assert.equal(erase.lines(1000000).length,7999999);
});
