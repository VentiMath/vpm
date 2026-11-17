declare namespace classNames {type Value=string|number|boolean|null|undefined;type Mapping=Record<string,unknown>;type Argument=Value|Mapping|readonly Argument[];}
interface ClassNames {(this: Record<string,string>|undefined, ...values:classNames.Argument[]):string;default:ClassNames}
declare const classNames:ClassNames;
export = classNames;
