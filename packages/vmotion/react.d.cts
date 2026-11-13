import type * as React from 'react';
export type Keyframe = number|string|null;
export interface Transition {duration?:number;delay?:number;type?:'spring'|'tween'|false;repeat?:number;repeatType?:'loop'|'reverse'|'mirror';ease?:string|number[]|((value:number)=>number);staggerChildren?:number;delayChildren?:number;staggerDirection?:1|-1;when?:'beforeChildren'|'afterChildren';[key:string]:unknown;}
export type Target = {[key:string]:Keyframe|Keyframe[]|Transition|Record<string,Keyframe>|undefined;transition?:Transition;transitionEnd?:Record<string,Keyframe>};
export type VariantLabels=string|string[];
export type AnimationDefinition=Target|VariantLabels;
export interface AnimationControls {start(definition:AnimationDefinition,transition?:Transition):Promise<void>;stop():void;set(definition:AnimationDefinition):void;}
export interface MotionProps {initial?:AnimationDefinition|false;animate?:AnimationDefinition|AnimationControls|false;variants?:Record<string,Target|((custom:unknown)=>Target)>;transition?:Transition;custom?:unknown;inherit?:boolean;onAnimationStart?:(definition:AnimationDefinition)=>void;onAnimationComplete?:(definition:AnimationDefinition)=>void;style?:React.CSSProperties&{x?:number|string;y?:number|string;z?:number|string;scale?:number;rotate?:number|string;[key:`--${string}`]:string|number};}
export type MotionComponent<T extends React.ElementType>=React.ForwardRefExoticComponent<Omit<React.ComponentPropsWithRef<T>,keyof MotionProps>&MotionProps>;
export type MotionFactory={<T extends React.ElementType>(component:T):MotionComponent<T>;create<T extends React.ElementType>(component:T):MotionComponent<T>}&{[K in keyof React.JSX.IntrinsicElements]:MotionComponent<K>};
export const motion:MotionFactory;
export function useAnimation():AnimationControls;
export const useAnimationControls:typeof useAnimation;
export function MotionConfig(props:{children?:React.ReactNode;reducedMotion?:'never'|'always'|'user';transition?:Transition}):React.JSX.Element;
export function useReducedMotion():boolean|null;
