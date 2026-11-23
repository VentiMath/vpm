declare function expand(pattern: string, options?: expand.BraceExpansionOptions): string[];
declare namespace expand {
 interface BraceExpansionOptions { max?: number; maxLength?: number; maxDepth?: number; maxRewrites?: number; maxSteps?: number; }
 function expand(pattern: string, options?: BraceExpansionOptions): string[];
 const EXPANSION_MAX: 100000;
 const EXPANSION_MAX_LENGTH: 4000000;
 const EXPANSION_MAX_DEPTH: 1000;
 const EXPANSION_MAX_REWRITES: 1000;
 const EXPANSION_MAX_STEPS: 20000000;
}
export = expand;
