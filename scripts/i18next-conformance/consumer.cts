import * as i18n from "vi18next";
const instance = i18n.createInstance();
const text: string = instance.t("TITLE", { defaultValue: "Title" });
void text;
