import i18n, {
  createInstance,
  type TFunction,
  type InitOptions,
} from "vi18next";
import {
  useTranslation,
  initReactI18next,
  I18nextProvider,
  Trans,
} from "react-i18next";
import { createElement } from "react";
const options: InitOptions = {
  lng: "en",
  fallbackLng: "en",
  keySeparator: false,
  resources: {
    en: {
      contests: { TITLE: "Contest archive", COUNT_other: "{{count}} problems" },
    },
  },
  interpolation: { escapeValue: false },
};
const instance = createInstance();
instance.use(initReactI18next);
await instance.init(options);
const t: TFunction = instance.getFixedT("en", "contests");
const title: string = t("TITLE");
function View() {
  const { t, ready } = useTranslation("contests", { i18n: instance });
  return createElement("p", null, ready ? t("COUNT", { count: 2 }) : "");
}
createElement(I18nextProvider, { i18n: instance }, createElement(View));
createElement(Trans, { i18n: instance, ns: "contests", i18nKey: "TITLE" });
instance.on("languageChanged", (language) => {
  const s: string = language;
  void s;
});
// @ts-expect-error count must be numeric
instance.t("COUNT", { count: "two" });
// @ts-expect-error no backend protocol implementation
instance.use({ type: "backend", read: () => {} });
void i18n;
void title;
