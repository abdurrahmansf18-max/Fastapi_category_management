import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLang = i18n.language?.split('-')[0] || "tr";

  return (
    <div className="relative group inline-flex items-center">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 dark:text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3v18" />
        </svg>
      </div>
      <select 
        value={currentLang}
        onChange={(e) => changeLanguage(e.target.value)}
        className="appearance-none pl-10 pr-8 py-2 text-sm font-medium bg-white/50 hover:bg-white/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/80 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm cursor-pointer min-w-[120px]"
        dir="ltr"
      >
        <option value="tr">{t('tr')} (Türkçe)</option>
        <option value="en">{t('en')} (English)</option>
        <option value="ar">{t('ar')} (العربية)</option>
      </select>
      <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500 dark:text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </div>
  );
}
