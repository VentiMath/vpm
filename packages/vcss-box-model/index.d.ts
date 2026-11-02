export interface Position {x:number; y:number}
export interface Spacing {top:number; right:number; bottom:number; left:number}
export interface Rect extends Spacing {width:number; height:number; x:number; y:number; center:Position}
export interface BoxModel {marginBox:Rect; borderBox:Rect; paddingBox:Rect; contentBox:Rect; margin:Spacing; border:Spacing; padding:Spacing}
export type AnyRectType=ClientRect|DOMRect|Rect|Spacing;
export interface CreateBoxArgs {borderBox:AnyRectType; margin?:Spacing; border?:Spacing; padding?:Spacing}
export function getRect(edges:Spacing):Rect;
export function expand(edges:Spacing, spacing:Spacing):Spacing;
export function shrink(edges:Spacing, spacing:Spacing):Spacing;
export function createBox(options:CreateBoxArgs):BoxModel;
export function offset(box:BoxModel, change:Position):BoxModel;
export function withScroll(box:BoxModel, scroll?:Position):BoxModel;
export function calculateBox(edges:AnyRectType, styles:CSSStyleDeclaration):BoxModel;
export function getBox(element:Element):BoxModel;
