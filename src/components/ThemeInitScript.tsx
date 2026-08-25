export function ThemeInitScript() {
  const script = `
    (function () {
      try {
        var theme = localStorage.getItem('kamol_theme');
        if (theme === 'dark') document.documentElement.classList.add('dark');
        var lang = localStorage.getItem('kamol_lang');
        if (lang === 'ru' || lang === 'uz' || lang === 'en') document.documentElement.lang = lang;
        var trailMig = localStorage.getItem('kamol_cursor_trail_style_default_v2');
        if (!trailMig) {
          var trailStyle = localStorage.getItem('kamol_cursor_trail_style');
          if (!trailStyle || trailStyle === 'both' || trailStyle === 'snake') {
            localStorage.setItem('kamol_cursor_trail_style', 'line');
          }
          localStorage.setItem('kamol_cursor_trail_style_default_v2', '1');
        }
        var bg = localStorage.getItem('kamol_background') || '';
        var liveIds = {
          aurora:1, nebula:1, golddust:1, ocean:1, prism:1,
          daybreak:1, mist:1, bloom:1, cloud:1, silk:1
        };
        if (bg.indexOf('custom:') === 0 || liveIds[bg]) {
          document.documentElement.setAttribute('data-live-bg', '1');
        }
        if (bg.indexOf('custom:') === 0) {
          var list = JSON.parse(localStorage.getItem('kamol_custom_backgrounds') || '[]');
          var id = bg.slice(7);
          for (var i = 0; i < list.length; i++) {
            if (list[i] && list[i].id === id && list[i].dataUrl) {
              document.documentElement.style.setProperty('--boot-wallpaper', 'url("' + list[i].dataUrl + '")');
              document.documentElement.setAttribute('data-boot-wallpaper', '1');
              break;
            }
          }
        }
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
