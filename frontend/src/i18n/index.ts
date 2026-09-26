// Sets up multi-language support (English, Arabic, French) with i18next: loads the translations,
// remembers the chosen language, and sets the page language and direction.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      fr: { translation: fr },
    },
    supportedLngs: ["en", "ar", "fr"],
    fallbackLng: "en",
    load: "languageOnly",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
  });

const applyDocumentLanguage = (language: string) => {
  const baseLanguage = language.split("-")[0];
  document.documentElement.lang = baseLanguage;
  document.documentElement.dir = baseLanguage === "ar" ? "rtl" : "ltr";
};

applyDocumentLanguage(i18n.resolvedLanguage || i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
