import invariant from 'vtiny-invariant';
declare let value: string | null;
invariant(value);
const text: string = value;
invariant(text, () => 'explanation');
// @ts-expect-error message must be a string or lazy string
invariant(text, 42);
// @ts-expect-error lazy diagnostics must return a string
invariant(text, () => 42);
void text;
