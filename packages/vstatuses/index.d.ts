/** Known numeric codes return reason phrases; reason phrases return codes. */
declare function status(code: number): string;
declare function status(codeOrMessage: string): string | number;
declare function status(codeOrMessage: string | number): string | number;

declare namespace status {
  const message: Readonly<Record<number, string | undefined>>;
  const code: Readonly<Record<string, number | undefined>>;
  const codes: readonly number[];
  const redirect: Readonly<Record<number, true | undefined>>;
  const empty: Readonly<Record<number, true | undefined>>;
  const retry: Readonly<Record<number, true | undefined>>;
}

export = status;
