/** String-key application API. Resource-schema type inference and ICU/MF2 plugins are outside scope. */
export type ResourceValue =
  | string
  | number
  | boolean
  | null
  | ResourceValue[]
  | { [key: string]: ResourceValue };
export interface ResourceLanguage {
  [namespace: string]: { [key: string]: ResourceValue };
}
export interface Resource {
  [language: string]: ResourceLanguage;
}
export type FlatNamespace = string;
export type Namespace = string | readonly string[];
export interface CustomInstanceExtensions {}
export interface CustomTypeOptions {}
export interface ReactOptions {}
export interface TypeOptions {
  defaultNS: "translation";
  enableSelector: false;
  allowObjectInHTMLChildren: false;
  parseInterpolation: "default";
  resources: Record<string, Record<string, string>>;
}
export type KeyPrefix<N = Namespace> = string | undefined;
export type KeyPrefixSelector<N = Namespace> = (
  source: Record<string, unknown>,
) => unknown;
export type NsResource<N = Namespace> = Record<string, string>;
export type ParseKeys<N = Namespace, O = TOptions, K = undefined> = string;
export type AppendKeyPrefix<Key, Prefix> = Key extends string
  ? Prefix extends string
    ? `${Prefix}.${Key}`
    : Key
  : Key;
export type InterpolationMap<Value> = Record<string, unknown>;
export type TFunctionReturn<N = Namespace, Key = string, O = TOptions> = string;
export type ConstrainTarget<O> = unknown;
export type ApplyTarget<T, O> = T;
export type GetSource<N, K = undefined> = Record<string, unknown>;
export type SelectorFn<Source, Target, O = unknown> = (
  source: Source,
) => Target;
export type SelectorKey = string;
export interface InterpolationOptions {
  escapeValue?: boolean;
  prefix?: string;
  suffix?: string;
  unescapePrefix?: string;
  formatSeparator?: string;
  defaultVariables?: Record<string, unknown>;
  format?: (
    value: unknown,
    format: string,
    lng: string | undefined,
    options: TOptions,
  ) => unknown;
  maxReplaces?: number;
  skipOnVariables?: boolean;
}
export interface TOptionsBase {
  lng?: string;
  lngs?: readonly string[];
  ns?: Namespace;
  count?: number;
  context?: string;
  ordinal?: boolean;
  defaultValue?: string;
  returnDetails?: boolean;
  returnObjects?: boolean;
  joinArrays?: string;
  keyPrefix?: string;
  interpolation?: InterpolationOptions;
  replace?: Record<string, unknown>;
  skipInterpolation?: boolean;
  [key: string]: unknown;
}
export type TOptions<T extends object = Record<string, unknown>> =
  TOptionsBase & T;
export interface TranslationDetails {
  res: ResourceValue | undefined;
  usedKey: string;
  exactUsedKey: string;
  usedLng: string | undefined;
  usedNS: string;
  usedParams: Record<string, unknown>;
}
export type KeyArgument =
  | string
  | readonly string[]
  | ((source: Record<string, unknown>) => unknown);
export interface TFunction<N extends Namespace = Namespace, K = undefined> {
  (
    key: KeyArgument,
    options: TOptionsBase & { returnDetails: true },
  ): TranslationDetails;
  (
    key: KeyArgument,
    options: TOptionsBase & { returnObjects: true },
  ): ResourceValue;
  (key: KeyArgument, defaultValue: string, options?: TOptionsBase): string;
  (key: KeyArgument, options?: TOptionsBase): string;
  lng?: string | readonly string[];
  ns?: Namespace;
  keyPrefix?: K;
}
export type FallbackLng =
  | false
  | string
  | readonly string[]
  | Record<string, string | readonly string[]>
  | ((language?: string) => string | readonly string[] | false);
export interface InitOptions {
  lng?: string;
  fallbackLng?: FallbackLng;
  ns?: Namespace;
  defaultNS?: Namespace;
  resources?: Resource;
  keySeparator?: string | false;
  nsSeparator?: string | false;
  pluralSeparator?: string;
  contextSeparator?: string;
  fallbackNS?: Namespace | false;
  returnNull?: boolean;
  returnEmptyString?: boolean;
  returnObjects?: boolean;
  interpolation?: InterpolationOptions;
  load?: "all" | "currentOnly" | "languageOnly";
  supportedLngs?: string[];
  nonExplicitSupportedLngs?: boolean;
  lowerCaseLng?: boolean;
  initAsync?: boolean;
  initImmediate?: boolean;
  react?: ReactOptions;
  [key: string]: unknown;
}
export interface ThirdPartyModule {
  type: "3rdParty";
  init(instance: i18n): void;
}
export interface ResourceStore {
  data: Resource;
  on(event: string, listener: (...args: unknown[]) => void): ResourceStore;
  off(event: string, listener?: (...args: unknown[]) => void): ResourceStore;
}
export interface i18n extends CustomInstanceExtensions {
  options: InitOptions;
  language: string;
  languages: string[];
  resolvedLanguage?: string;
  isInitialized: boolean;
  store: ResourceStore;
  t: TFunction;
  use(module: ThirdPartyModule): this;
  init(
    options?: InitOptions,
    callback?: (error: unknown, t: TFunction) => void,
  ): Promise<TFunction>;
  changeLanguage(
    language?: string,
    callback?: (error: unknown, t: TFunction) => void,
  ): Promise<TFunction>;
  getFixedT<N extends Namespace = Namespace, K = undefined>(
    language: string | readonly string[] | null,
    namespace?: N,
    keyPrefix?: K,
    scope?: object,
  ): TFunction<N, K>;
  exists(key: KeyArgument, options?: TOptionsBase): boolean;
  addResource(
    language: string,
    namespace: string,
    key: string,
    value: ResourceValue,
    options?: { keySeparator?: string | false; silent?: boolean },
  ): this;
  addResources(
    language: string,
    namespace: string,
    resources: Record<string, ResourceValue>,
    options?: { silent?: boolean },
  ): this;
  addResourceBundle(
    language: string,
    namespace: string,
    resources: Record<string, ResourceValue>,
    deep?: boolean,
    overwrite?: boolean,
    options?: { silent?: boolean },
  ): this;
  getResource(
    language: string,
    namespace: string,
    key: string,
    options?: { keySeparator?: string | false },
  ): ResourceValue | undefined;
  getResourceBundle(
    language: string,
    namespace: string,
  ): Record<string, ResourceValue> | undefined;
  getDataByLanguage(language: string): ResourceLanguage | undefined;
  hasResourceBundle(language: string, namespace: string): boolean;
  removeResourceBundle(language: string, namespace: string): this;
  loadNamespaces(
    names: Namespace,
    callback?: (error: unknown) => void,
  ): Promise<void>;
  loadLanguages(
    languages: string | string[],
    callback?: (error: unknown) => void,
  ): Promise<void>;
  reloadResources(
    languages?: string | string[],
    namespaces?: Namespace,
    callback?: (error: unknown) => void,
  ): Promise<void>;
  hasLoadedNamespace(namespace: string, options?: object): boolean;
  setDefaultNamespace(namespace: Namespace): void;
  dir(language?: string): "rtl" | "ltr";
  on(
    event: "languageChanged" | "languageChanging",
    listener: (language: string) => void,
  ): this;
  on(event: string, listener: (...args: unknown[]) => void): this;
  off(event: string, listener?: (...args: never[]) => void): this;
  once(event: string, listener: (...args: unknown[]) => void): this;
  cloneInstance(
    options?: InitOptions & { forkResourceStore?: boolean },
    callback?: (error: unknown, t: TFunction) => void,
  ): i18n;
}
export declare function createInstance(
  options?: InitOptions,
  callback?: (error: unknown, t: TFunction) => void,
): i18n;
export declare function keyFromSelector(
  selector: (source: Record<string, unknown>) => unknown,
  options?: { keySeparator?: string | false },
): string;
declare const instance: i18n & {
  createInstance: typeof createInstance;
  keyFromSelector: typeof keyFromSelector;
};
export default instance;
export declare const t: i18n["t"];
export declare const exists: i18n["exists"];
export declare const init: i18n["init"];
export declare const changeLanguage: i18n["changeLanguage"];
export declare const getFixedT: i18n["getFixedT"];
export declare const loadNamespaces: i18n["loadNamespaces"];
export declare const loadLanguages: i18n["loadLanguages"];
export declare const reloadResources: i18n["reloadResources"];
export declare const addResource: i18n["addResource"];
export declare const addResources: i18n["addResources"];
export declare const addResourceBundle: i18n["addResourceBundle"];
export declare const getResource: i18n["getResource"];
export declare const getResourceBundle: i18n["getResourceBundle"];
export declare const getDataByLanguage: i18n["getDataByLanguage"];
export declare const hasResourceBundle: i18n["hasResourceBundle"];
export declare const removeResourceBundle: i18n["removeResourceBundle"];
export declare const setDefaultNamespace: i18n["setDefaultNamespace"];
export declare const dir: i18n["dir"];
export declare const hasLoadedNamespace: i18n["hasLoadedNamespace"];
export declare const use: i18n["use"];
export declare const on: i18n["on"];
export declare const off: i18n["off"];
