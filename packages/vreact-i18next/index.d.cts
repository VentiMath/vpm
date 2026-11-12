import type { Context, ReactNode, ReactElement } from "react";
import type { i18n, Namespace, TFunction, ThirdPartyModule } from "vi18next";
export interface ReactOptions {
  bindI18n?: string | false;
  bindI18nStore?: string | false;
  useSuspense?: boolean;
  nsMode?: "default" | "fallback";
}
export interface UseTranslationOptions<K extends string | undefined = undefined>
  extends ReactOptions {
  i18n?: i18n;
  keyPrefix?: K;
  lng?: string;
}
export type UseTranslationResponse<
  N extends Namespace = Namespace,
  K = undefined,
> = [TFunction<N, K>, i18n, boolean] & {
  t: TFunction<N, K>;
  i18n: i18n;
  ready: boolean;
};
export interface I18nextProviderProps {
  i18n: i18n;
  defaultNS?: Namespace;
  children?: ReactNode;
}
export declare const I18nContext: Context<
  { i18n: i18n; defaultNS?: Namespace } | undefined
>;
export declare function I18nextProvider(
  props: I18nextProviderProps,
): ReactElement;
export declare function useTranslation<
  N extends Namespace = Namespace,
  K extends string | undefined = undefined,
>(
  namespace?: N,
  options?: UseTranslationOptions<K>,
): UseTranslationResponse<N, K>;
export declare const initReactI18next: ThirdPartyModule;
export declare function getI18n(): i18n | undefined;
export declare function setI18n(instance: i18n | undefined): void;
export declare function getDefaults(): ReactOptions;
export declare function setDefaults(options: ReactOptions): void;
