export interface BraceExpansionOptions { max?: number; maxLength?: number; maxDepth?: number; maxRewrites?: number; maxSteps?: number; }
export function expand(pattern: string, options?: BraceExpansionOptions): string[];
export const EXPANSION_MAX: 100000;
export const EXPANSION_MAX_LENGTH: 4000000;
export const EXPANSION_MAX_DEPTH: 1000;
export const EXPANSION_MAX_REWRITES: 1000;
export const EXPANSION_MAX_STEPS: 20000000;
export default expand;
