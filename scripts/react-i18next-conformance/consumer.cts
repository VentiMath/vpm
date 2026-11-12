import { createElement } from "react";
import { createInstance } from "vi18next";
import {
  useTranslation,
  I18nextProvider,
  initReactI18next,
  I18nContext,
  getDefaults,
  setDefaults,
  type UseTranslationResponse,
} from "vreact-i18next";
const engine = createInstance();
engine.use(initReactI18next);
function Contest() {
  const { t, i18n, ready } = useTranslation("contests");
  const value: string = t("TITLE");
  void i18n.changeLanguage("es");
  return createElement(
    "p",
    null,
    ready ? value : t("loading", { defaultValue: "Loading" }),
  );
}
function Nested() {
  const [t] = useTranslation("contests", {
    i18n: engine,
    keyPrefix: "nested",
    lng: "en",
    useSuspense: false,
  });
  return createElement("p", null, t("TITLE"));
}
const tree = createElement(
  I18nextProvider,
  { i18n: engine, defaultNS: ["contests"] },
  createElement(Contest),
  createElement(Nested),
);
setDefaults({ ...getDefaults(), bindI18nStore: "added removed" });
void tree;
void I18nContext;
// @ts-expect-error namespaces are strings, not numbers
useTranslation(42);
// @ts-expect-error prefix is a string
useTranslation("contests", { keyPrefix: 42 });
