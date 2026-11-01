import weakMemoize from 'vemotion-weak-memoize';
const keys = weakMemoize((theme: {spacing: number}) => theme.spacing * 2);
const value: number = keys({spacing: 4});
// @ts-expect-error arguments are objects
weakMemoize((value: string) => value);
void value;
