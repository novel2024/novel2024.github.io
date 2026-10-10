(function () {
  var FS_KEY = 'newnovel-reader-font-size';
  var MIN = 14;
  var MAX = 28;
  var root = document.documentElement;
  var size = 18;

  function apply(next, persist) {
    size = Math.max(MIN, Math.min(MAX, next));
    root.style.setProperty('--fs', size + 'px');
    if (persist) {
      try { localStorage.setItem(FS_KEY, String(size)); } catch (e) {}
    }
  }

  var saved = NaN;
  try { saved = parseInt(localStorage.getItem(FS_KEY), 10); } catch (e) {}
  if (saved >= MIN && saved <= MAX) { apply(saved, false); }

  function bind(id, handler) {
    var el = document.getElementById(id);
    if (el) { el.addEventListener('click', handler); }
  }

  bind('btn-top', function () { window.scrollTo(0, 0); });
  bind('btn-fs-minus', function () { apply(size - 1, true); });
  bind('btn-fs-plus', function () { apply(size + 1, true); });
})();
