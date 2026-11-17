export type Value=string|number|boolean|null|undefined;
export type Mapping=Record<string,unknown>;
export type Argument=Value|Mapping|readonly Argument[];
interface ClassNames { (this: unknown, ...values:Argument[]):string; default:ClassNames }
declare const classNames:ClassNames;
export default classNames;
