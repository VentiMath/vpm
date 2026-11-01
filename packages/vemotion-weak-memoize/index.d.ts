/** Caches a function's results by object argument, without keeping the arguments alive. */
export default function weakMemoize<Argument extends object, Result>(fn: (argument: Argument) => Result): (argument: Argument) => Result;
