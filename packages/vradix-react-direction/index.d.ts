import type {FC, ReactNode} from 'react';
type Direction = 'ltr' | 'rtl';
interface DirectionProviderProps {dir: Direction; children?: ReactNode | undefined;}
export declare const DirectionProvider: FC<DirectionProviderProps>;
export {DirectionProvider as Provider};
export declare function useDirection(localDirection?: Direction): Direction;
