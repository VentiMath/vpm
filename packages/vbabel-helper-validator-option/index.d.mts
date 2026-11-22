export function findSuggestion(
  value: string,
  candidates: readonly string[],
): string | undefined;
export class OptionValidator {
  descriptor: string;
  constructor(descriptor: string);
  formatMessage(message: string): string;
  invariant(condition: unknown, message: string): asserts condition;
  validateBooleanOption(name: string, value: unknown): boolean | undefined;
  validateBooleanOption<T>(
    name: string,
    value: unknown,
    defaultValue: T,
  ): boolean | T;
  validateStringOption(name: string, value: unknown): string | undefined;
  validateStringOption<T>(
    name: string,
    value: unknown,
    defaultValue: T,
  ): string | T;
  validateTopLevelOptions(options: object, shape: object): void;
}
