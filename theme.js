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

/* ---------- Text-to-speech ----------
   - tự chọn giọng en-US tốt nhất của thiết bị
   - đọc từng câu riêng (chèn khoảng nghỉ) thay vì cả đoạn dính liền
   - "________" (chỗ trống) -> im lặng BLANK_PAUSE ms */
var BLANK_PAUSE = 2500;     // ms im lặng ở chỗ trống
var SENTENCE_PAUSE = 300;   // ms nghỉ sau dấu . ? ! ; :
var COMMA_PAUSE = 140;      // ms nghỉ sau dấu phẩy (chỉ áp dụng trên iOS/iPadOS/Safari)
var PART_PAUSE = 500;       // ms nghỉ giữa các đoạn truyền vào say([...])

(function () {
  var ua = navigator.userAgent;
  var isApple = (/iPad|iPhone|iPod|Macintosh/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua)) || /CriOS|FxiOS|EdgiOS/.test(ua);
  var RATE = isApple ? 1.0 : 0.9;      // Safari/iOS méo tiếng khi rate < 1
  var voice = null, token = 0, timer = null, keep = null;

  function score(v) {
    var n = v.name || '', s = 0;
    if (!/^en[-_]US$/i.test(v.lang)) return -1;
    if (/natural|neural|online/i.test(n)) s += 50;
    if (/premium|enhanced/i.test(n + ' ' + (v.voiceURI || ''))) s += 40;
    if (/google/i.test(n)) s += 30;
    if (/samantha|ava|allison|nicky|aaron|zoe|evan|joelle|noelle|aria|jenny/i.test(n)) s += 20;
    if (!v.localService) s += 5;
    if (/compact/i.test(v.voiceURI || '')) s -= 30;
    if (/fred|junior|albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|organ|princess|ralph|trinoids|whisper|zarvox|superstar|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley/i.test(n)) s -= 100;
    return s;
  }
  function pickVoice() {
    var list = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    if (!list.length) return;
    var best = null, bs = -1;
    list.forEach(function (v) { var s = score(v); if (s > bs) { bs = s; best = v; } });
    voice = best;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pickVoice);
  }

  // chia văn bản thành các đoạn đọc + khoảng nghỉ
  function plan(text) {
    text = String(text).replace(/[()]/g, '').replace(/\s*\/\s*/g, ', ');
    var re = isApple ? /[^.?!;:,]+[.?!;:,]*/g : /[^.?!;:]+[.?!;:]*/g;
    var out = [];
    text.split(/_{2,}/).forEach(function (chunk, i) {
      if (i > 0) out.push({ p: BLANK_PAUSE });
      (chunk.match(re) || []).forEach(function (s) {
        s = s.trim();
        if (!/[a-z0-9]/i.test(s)) return;
        out.push({ t: s });
        out.push({ p: /[.?!;:]$/.test(s) ? SENTENCE_PAUSE : COMMA_PAUSE });
      });
    });
    return out;
  }

  function run(items, my) {
    var i = 0;
    (function next() {
      if (my !== token || i >= items.length) return;
      var it = items[i++];
      if (it.p !== undefined) { timer = setTimeout(next, it.p); return; }
      var u = new SpeechSynthesisUtterance(it.t);
      u.lang = 'en-US';
      if (voice) u.voice = voice;
      u.rate = RATE;
      u.onend = next;
      u.onerror = next;
      keep = u;                         // tránh Chrome thu hồi utterance trước khi đọc xong
      speechSynthesis.speak(u);
    })();
  }

  window.say = function (parts) {
    if (!window.speechSynthesis) return;
    var my = ++token;
    clearTimeout(timer);
    speechSynthesis.cancel();
    var items = [];
    [].concat(parts).forEach(function (t, k) {
      if (k) items.push({ p: PART_PAUSE });
      items = items.concat(plan(t));
    });
    setTimeout(function () { pickVoice(); run(items, my); }, 60);
  };
  window.stopSpeech = function () {
    token++; clearTimeout(timer);
    if (window.speechSynthesis) speechSynthesis.cancel();
  };
})();

function speak(text) { if (text) say([text]); }

document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-speak]');
  if (el) speak(el.dataset.speak);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
