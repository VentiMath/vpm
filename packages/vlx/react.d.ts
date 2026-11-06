import type {CSSProperties,ReactNode,ReactElement} from 'react';
import type {VlxError,DocumentOptions} from './index';
export interface MathProps {
 fontSize?:number;
 className?:string;
 style?:CSSProperties & {'--vlx-scale'?:number|string;'--vlx-display-margin'?:string};
 scrollLabel?:string;
 fallback?:ReactNode|((error:VlxError,source:string)=>ReactNode);
 loadingFallback?:ReactNode;
}
/** One inline expression. The renderer loads on first use. */
export declare function InlineMath(props:MathProps&{tex:string}):ReactElement;
/** One centered display expression, with local scrolling when oversized. */
export declare function DisplayMath(props:MathProps&{tex:string}):ReactElement;
/** Mixed prose and delimited math; one failed formula preserves its siblings. */
export declare function MathText(props:MathProps&{source:string}):ReactElement;
/** Optional eager load, for route prefetch or server rendering. */
export declare function preloadMath():Promise<void>;
/** Shared defaults. Nested providers inherit omitted settings; component props win. */
export interface MathProviderProps {children?:ReactNode;scrollLabel?:string;loadingFallback?:ReactNode}
export declare function MathProvider(props:MathProviderProps):ReactElement;

/** One self-contained source with automatic equation numbers and references.
 * React supplies an SSR-stable ID prefix when omitted. Labels never leak between documents.
 */
export declare function MathDocument(props:MathProps&Pick<DocumentOptions,'numbering'|'startNumber'|'idPrefix'>&{source:string}):ReactElement;
