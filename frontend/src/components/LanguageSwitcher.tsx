import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "EN", name: "English" },
  { code: "ar", label: "AR", name: "العربية" },
  { code: "fr", label: "FR", name: "Français" },
];

interface LanguageSwitcherProps {
  className?: string;
}

function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const activeLanguage = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  return (
    <div className={className ? `language-switcher ${className}` : "language-switcher"}>
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          className={
            activeLanguage === language.code
              ? "payment-method-pill payment-method-pill-active"
              : "payment-method-pill"
          }
          onClick={() => i18n.changeLanguage(language.code)}
          aria-label={language.name}
          aria-pressed={activeLanguage === language.code}
        >
          {language.label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
