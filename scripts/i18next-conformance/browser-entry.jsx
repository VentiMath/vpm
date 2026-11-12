import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import i18n from "i18next";
import {
  I18nextProvider,
  useTranslation,
  initReactI18next,
  Trans,
} from "react-i18next";
const host = document.body.appendChild(document.createElement("main"));
const wait = () => new Promise((r) => setTimeout(r, 40));
const resources = {
  en: {
    contests: {
      TITLE: "Contest archive",
      COUNT_one: "{{count}} problem",
      COUNT_other: "{{count}} problems",
      RICH: "Read <strong>{{name}}</strong>",
      EMPTY: "Fallback",
    },
  },
  es: {
    contests: {
      TITLE: "Archivo de concursos",
      COUNT_one: "{{count}} problema",
      COUNT_other: "{{count}} problemas",
      RICH: "Leer <strong>{{name}}</strong>",
    },
  },
  ar: {
    contests: {
      TITLE: "المسابقات",
      COUNT_two: "مسألتان",
      COUNT_few: "{{count}} مسائل",
      COUNT_other: "{{count}} مسألة",
    },
  },
};
function Content() {
  const { t, ready } = useTranslation("contests", {
    bindI18nStore: "added removed",
  });
  return (
    <section dir={i18n.dir()} data-ready={ready}>
      <h1>{t("TITLE")}</h1>
      <p>{t("COUNT", { count: 2 })}</p>
      <p>{t("EMPTY")}</p>
      <p>
        <Trans
          ns="contests"
          i18nKey="RICH"
          values={{ name: "Ada" }}
          components={{ strong: <strong /> }}
        />
      </p>
    </section>
  );
}
window.formVariant = VPM_I18N_VARIANT;
window.runForms = async () => {
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",
      fallbackLng: "en",
      keySeparator: false,
      interpolation: { escapeValue: false },
    });
  const root = createRoot(host);
  flushSync(() =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <Content />
      </I18nextProvider>,
    ),
  );
  await wait();
  const out = [];
  const record = () => {
    const e = host.querySelector("section");
    if (!e) throw Error("Missing translations");
    out.push([
      e.getAttribute("dir"),
      e.getAttribute("data-ready"),
      e.textContent,
      e.querySelector("strong")?.textContent,
    ]);
  };
  record();
  for (const lng of ["es-MX", "ar", "en"]) {
    await i18n.changeLanguage(lng);
    await wait();
    record();
  }
  i18n.addResourceBundle("en", "contests", { TITLE: "Updated archive" });
  await wait();
  record();
  i18n.removeResourceBundle("en", "contests");
  await wait();
  record();
  if (
    out[0][2] !== "Contest archive2 problemsFallbackRead Ada" ||
    out[1][2] !== "Archivo de concursos2 problemasFallbackLeer Ada" ||
    out[2][0] !== "rtl" ||
    !out[4][2].startsWith("Updated archive")
  )
    throw Error(JSON.stringify(out));
  root.unmount();
  return out;
};
