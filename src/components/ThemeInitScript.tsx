export function ThemeInitScript() {
  const script = `
    (function () {
      try {
        var theme = localStorage.getItem('kamol_theme');
        if (theme === 'dark') document.documentElement.classList.add('dark');
        var lang = localStorage.getItem('kamol_lang');
        if (lang === 'ru' || lang === 'uz' || lang === 'en') document.documentElement.lang = lang;
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
