(function () {
  'use strict';

  var bigEl = document.getElementById('countdown-big');
  var stickyEl = document.getElementById('countdown-sticky');
  var heroEl = document.getElementById('hero');

  if (!bigEl && !stickyEl) return;

  var deadlineStr = (bigEl || stickyEl).getAttribute('data-deadline');
  var onZero = (bigEl || stickyEl).getAttribute('data-onzero') || 'ended-state';
  var deadline = new Date(deadlineStr).getTime();

  if (isNaN(deadline)) {
    console.warn('[countdown] invalid deadline:', deadlineStr);
    return;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function tick() {
    var now = Date.now();
    var diff = deadline - now;

    if (diff <= 0) {
      handleZero();
      return false;
    }

    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);

    if (bigEl) {
      var units = { days: days, hours: hours, mins: mins, secs: secs };
      bigEl.querySelectorAll('[data-unit]').forEach(function (el) {
        el.textContent = pad(units[el.dataset.unit] || 0);
      });
    }

    if (stickyEl) {
      var timeEl = stickyEl.querySelector('.time');
      if (timeEl) {
        timeEl.textContent = days + '天 ' + pad(hours) + ':' + pad(mins) + ':' + pad(secs);
      }
    }

    return true;
  }

  function handleZero() {
    if (onZero === 'hide') {
      if (bigEl) bigEl.remove();
      if (stickyEl) stickyEl.remove();
    } else {
      var msg = '<div style="text-align:center;opacity:0.6;padding:1rem;">本次活動已結束</div>';
      if (bigEl) bigEl.innerHTML = msg;
      if (stickyEl) {
        stickyEl.innerHTML = '<span style="width:100%;text-align:center;">本次活動已結束</span>';
        stickyEl.classList.add('visible');
      }
    }
  }

  // 滾動偵測：滾過 Hero 才顯示 sticky
  if (heroEl && stickyEl) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        stickyEl.classList.toggle('visible', !entry.isIntersecting);
      });
    }, { threshold: 0 });
    observer.observe(heroEl);
  }

  // 啟動
  if (tick()) {
    var interval = setInterval(function () {
      if (!tick()) clearInterval(interval);
    }, 1000);
  }
})();