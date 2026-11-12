import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createInstance } from "i18next";
import {
  I18nextProvider,
  useTranslation,
  initReactI18next,
} from "react-i18next";
const wait = () => new Promise((r) => setTimeout(r, 40));
const resources = {
  en: {
    contests: { TITLE: "Contest archive", COUNT_other: "{{count}} problems" },
    other: { TITLE: "Other title" },
  },
  es: { contests: { TITLE: "Archivo", COUNT_other: "{{count}} problemas" } },
};
window.formVariant = VPM_REACT_I18N_VARIANT;
window.runForms = async () => {
  const x = createInstance();
  await x
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",
      fallbackLng: "en",
      defaultNS: "contests",
      interpolation: { escapeValue: false },
    });
  const subscriptions = new Map();
  const on = x.on.bind(x),
    off = x.off.bind(x);
  x.on = (event, fn) => {
    if (!subscriptions.has(event)) subscriptions.set(event, new Set());
    subscriptions.get(event).add(fn);
    return on(event, fn);
  };
  x.off = (event, fn) => {
    subscriptions.get(event)?.delete(fn);
    return off(event, fn);
  };
  const host = document.body.appendChild(document.createElement("main")),
    root = createRoot(host);
  let render,
    previousT,
    stable = true;
  function Text() {
    const response = useTranslation(undefined, {
        bindI18nStore: "added removed",
      }),
      [t, i, ready] = response;
    if (t !== response.t || i !== response.i18n || ready !== response.ready)
      throw Error("Tuple and named result disagree");
    if (previousT && previousT.language === i.language && previousT.fn !== t)
      stable = false;
    previousT = { language: i.language, fn: t };
    return (
      <section data-ready={ready}>
        <h1>{t("TITLE")}</h1>
        <p>{t("COUNT", { count: 2 })}</p>
        <input defaultValue="draft" />
      </section>
    );
  }
  function Parent() {
    const [n, set] = React.useState(0);
    render = () => set((n) => n + 1);
    return (
      <I18nextProvider i18n={x}>
        <Text />
        <span>{n}</span>
      </I18nextProvider>
    );
  }
  flushSync(() =>
    root.render(
      <React.StrictMode>
        <Parent />
      </React.StrictMode>,
    ),
  );
  await wait();
  const out = [];
  const record = () =>
    out.push([
      host.querySelector("h1")?.textContent,
      host.querySelector("p")?.textContent,
      host.querySelector("section")?.getAttribute("data-ready"),
    ]);
  record();
  const input = host.querySelector("input");
  input.focus();
  input.setSelectionRange(1, 3);
  flushSync(render);
  await wait();
  if (
    !stable ||
    host.querySelector("input") !== input ||
    document.activeElement !== input ||
    input.selectionStart !== 1
  )
    throw Error("Parent rerender lost stable translator or input");
  out.push("stable rerender");
  await x.changeLanguage("es");
  await wait();
  record();
  previousT = undefined;
  x.addResourceBundle("es", "contests", { TITLE: "Updated" });
  await wait();
  record();
  root.unmount();
  await wait();
  if ([...subscriptions.values()].some((v) => v.size))
    throw Error("Listener not removed");
  out.push("clean unmount");
  // Delayed namespace availability exercises Suspense and ready:false without networking.
  for (const useSuspense of [false, true]) {
    const y = createInstance();
    await y.init({ lng: "en", resources });
    let loaded = false,
      calls = 0;
    y.hasLoadedNamespace = () => loaded;
    y.loadNamespaces = (_names, done) => {
      calls++;
      return new Promise((resolve) =>
        setTimeout(() => {
          loaded = true;
          done?.();
          resolve();
        }, 30),
      );
    };
    const h = document.body.appendChild(document.createElement("div")),
      r = createRoot(h);
    function Loading() {
      const { t, ready } = useTranslation("contests", { i18n: y, useSuspense });
      return <output>{ready ? t("TITLE") : "not ready"}</output>;
    }
    flushSync(() =>
      r.render(
        <React.Suspense fallback={<output>waiting</output>}>
          <Loading />
        </React.Suspense>,
      ),
    );
    out.push(h.textContent);
    for (let n = 0; n < 100 && h.textContent !== "Contest archive"; n++)
      await wait();
    if (
      h.textContent !== "Contest archive" ||
      calls < 1 ||
      (VPM_REACT_I18N_VARIANT.startsWith("vpm") && calls !== 1)
    )
      throw Error("Loading did not settle: " + h.textContent + " / " + calls);
    out.push(h.textContent);
    r.unmount();
    h.remove();
  }
  host.remove();
  return out;
};
