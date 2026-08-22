/** Brauzer konsolida faqat console.error qoldiradi */
export function ConsoleSilenceScript() {
  const script = `
    (function () {
      var error = console.error.bind(console);
      console.log = function () {};
      console.info = function () {};
      console.warn = function () {};
      console.debug = function () {};
      console.error = error;
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
