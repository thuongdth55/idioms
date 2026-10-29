(function () {
  var theme = 'light';
  try { theme = localStorage.getItem('theme') || 'light'; } catch (e) {}
  document.documentElement.dataset.theme = theme;

  document.addEventListener('DOMContentLoaded', function () {
    var sw = document.getElementById('themeSwitch');
    if (!sw) return;
    sw.checked = document.documentElement.dataset.theme === 'dark';
    sw.addEventListener('change', function () {
      var t = sw.checked ? 'dark' : 'light';
      document.documentElement.dataset.theme = t;
      try { localStorage.setItem('theme', t); } catch (e) {}
    });
  });
})();

function speak(text) {
  if (!text || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(String(text).replace(/\//g, ','));
  u.lang = 'en-US';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-speak]');
  if (el) speak(el.dataset.speak);
});
