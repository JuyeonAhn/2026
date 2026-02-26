(function () {
  var track = document.querySelector('.banner-track');
  var indicatorsContainer = document.querySelector('.banner-indicators');
  var configEl = document.getElementById('banner-config');
  var config = null;
  try {
    if (configEl && configEl.textContent) config = JSON.parse(configEl.textContent);
  } catch (e) {}

  /* 설정이 있으면 설정 기반으로 슬라이드·인디케이터 생성 (레이블 규칙: banner_1.jpg, banner_2.jpg …) */
  if (config && config.slides && config.slides.length > 0) {
    if (!track || !indicatorsContainer) return;
    track.innerHTML = '';
    config.slides.forEach(function (item, i) {
      var section = document.createElement('section');
      section.className = 'banner-slide';
      section.setAttribute('data-slide', String(i));
      section.innerHTML =
        '<div class="banner-bg">' +
          '<div class="banner-gradient"></div>' +
          '<img class="banner-image" src="' + escapeHtml(item.image || '') + '" alt="" aria-hidden="true" onerror="this.style.display=\'none\'">' +
        '</div>' +
        '<div class="banner-content">' +
          '<h2 class="banner-title" data-max="30">' + escapeHtml(item.title || '') + '</h2>' +
          '<p class="banner-sub" data-max="50">' + escapeHtml(item.sub || '') + '</p>' +
        '</div>';
      track.appendChild(section);
    });
    indicatorsContainer.innerHTML = '';
    config.slides.forEach(function (_, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'banner-indicator' + (i === 0 ? ' is-active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.setAttribute('aria-label', '배너 ' + (i + 1));
      btn.setAttribute('data-index', String(i));
      indicatorsContainer.appendChild(btn);
    });
  } else if (indicatorsContainer && track) {
    /* 설정 없이 기존 DOM만 있을 때: 슬라이드 개수만큼 인디케이터 생성 */
    var existingSlides = track.querySelectorAll('.banner-slide');
    if (existingSlides.length > 0 && indicatorsContainer.children.length === 0) {
      for (var i = 0; i < existingSlides.length; i++) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'banner-indicator' + (i === 0 ? ' is-active' : '');
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        btn.setAttribute('aria-label', '배너 ' + (i + 1));
        btn.setAttribute('data-index', String(i));
        indicatorsContainer.appendChild(btn);
      }
    }
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  var slides = track ? track.querySelectorAll('.banner-slide') : [];
  var prevBtn = document.querySelector('.banner-prev');
  var nextBtn = document.querySelector('.banner-next');
  var indicators = document.querySelectorAll('.banner-indicator');

  var totalReal = slides.length;
  if (!track || totalReal === 0) return;

  /* 루핑: 첫 슬라이드 복제본을 끝에, 마지막 슬라이드 복제본을 앞에 추가 */
  var firstClone = slides[0].cloneNode(true);
  var lastClone = slides[totalReal - 1].cloneNode(true);
  firstClone.classList.add('banner-slide-clone');
  lastClone.classList.add('banner-slide-clone');
  track.appendChild(firstClone);
  track.insertBefore(lastClone, track.firstChild);

  var allSlides = track.querySelectorAll('.banner-slide');
  var totalAll = allSlides.length; /* totalReal + 2 */
  var current = 1; /* 처음에는 1번(첫 번째 실제 슬라이드) 표시 */

  /**
   * 이미지에서 주조색 추출 (양자화 후 최빈 색 → 동일 이미지면 항상 같은 결과)
   * 추출값은 data-slide-bg에 저장해 두면 다음 로드 시 재사용(롤링배너 가이드 고정)
   */
  function extractDominantColor(img, done) {
    if (!img || !img.src) {
      if (done) done(null);
      return;
    }
    var proxy = new Image();
    proxy.crossOrigin = 'anonymous';
    proxy.onload = function () {
      try {
        var w = 64;
        var h = 48;
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(proxy, 0, 0, w, h);
        var data = ctx.getImageData(0, 0, w, h).data;
        /* 4비트 양자화 (16단계) → 같은 이미지면 동일한 버킷 카운트 */
        var shift = 4;
        var buckets = {};
        for (var i = 0; i < data.length; i += 4) {
          var r = data[i] >> shift;
          var g = data[i + 1] >> shift;
          var b = data[i + 2] >> shift;
          var a = data[i + 3];
          if (a < 128) continue;
          var key = r + ',' + g + ',' + b;
          if (!buckets[key]) buckets[key] = { count: 0, r: 0, g: 0, b: 0 };
          buckets[key].count += 1;
          buckets[key].r += data[i];
          buckets[key].g += data[i + 1];
          buckets[key].b += data[i + 2];
        }
        var best = null;
        for (var k in buckets) {
          if (!best || buckets[k].count > best.count) best = buckets[k];
        }
        if (best && best.count > 0) {
          var r = Math.round(best.r / best.count);
          var g = Math.round(best.g / best.count);
          var b = Math.round(best.b / best.count);
          var dim = 0.78;
          r = Math.min(255, Math.round(r * dim));
          g = Math.min(255, Math.round(g * dim));
          b = Math.min(255, Math.round(b * dim));
          if (done) done([r, g, b]);
        } else if (done) {
          done(null);
        }
      } catch (e) {
        if (done) done(null);
      }
    };
    proxy.onerror = function () {
      if (done) done(null);
    };
    proxy.src = img.src;
  }

  function applySlideBg(slide, rgb) {
    if (!rgb || rgb.length !== 3) return;
    var value = rgb[0] + ',' + rgb[1] + ',' + rgb[2];
    slide.style.setProperty('--slide-bg', value);
    slide.setAttribute('data-slide-bg', value);
    if (slide === slides[0] && firstClone) firstClone.style.setProperty('--slide-bg', value);
    if (slide === slides[totalReal - 1] && lastClone) lastClone.style.setProperty('--slide-bg', value);
  }

  /* data-slide-bg가 있으면 그대로 사용(가이드 고정), 없으면 주조색 추출 후 적용·저장 */
  slides.forEach(function (slide) {
    var cached = slide.getAttribute('data-slide-bg');
    if (cached && /^\d+,\d+,\d+$/.test(cached)) {
      slide.style.setProperty('--slide-bg', cached);
      if (slide === slides[0] && firstClone) firstClone.style.setProperty('--slide-bg', cached);
      if (slide === slides[totalReal - 1] && lastClone) lastClone.style.setProperty('--slide-bg', cached);
      return;
    }
    var img = slide.querySelector('.banner-image');
    if (!img) return;
    extractDominantColor(img, function (rgb) {
      applySlideBg(slide, rgb);
    });
  });

  function getLogicalIndex() {
    if (current === 0) return totalReal - 1;
    if (current === totalReal + 1) return 0;
    return current - 1;
  }

  function applyPosition(noTransition) {
    if (noTransition) {
      track.style.transition = 'none';
      track.style.transform = 'translateX(-' + current * 100 + '%)';
      track.offsetHeight; /* reflow */
      track.style.transition = '';
    } else {
      track.style.transform = 'translateX(-' + current * 100 + '%)';
    }
    var logical = getLogicalIndex();
    indicators.forEach(function (ind, i) {
      ind.classList.toggle('is-active', i === logical);
      ind.setAttribute('aria-selected', i === logical);
    });
  }

  function onTransitionEnd(e) {
    if (e.target !== track || e.propertyName !== 'transform') return;
    if (current === 0) {
      current = totalReal;
      applyPosition(true);
    } else if (current === totalReal + 1) {
      current = 1;
      applyPosition(true);
    }
  }

  track.addEventListener('transitionend', onTransitionEnd);

  function goToLogical(logicalIndex) {
    if (logicalIndex < 0 || logicalIndex >= totalReal) return;
    current = logicalIndex + 1;
    applyPosition(false);
  }

  function next() {
    current += 1;
    if (current > totalReal + 1) current = 1;
    applyPosition(false);
  }

  function prev() {
    current -= 1;
    if (current < 0) current = totalReal;
    applyPosition(false);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', prev);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', next);
  }

  indicators.forEach(function (ind) {
    ind.addEventListener('click', function () {
      var idx = parseInt(ind.getAttribute('data-index'), 10);
      if (!isNaN(idx)) goToLogical(idx);
    });
  });

  applyPosition(true);

  /* 텍스트 글자수 제한 (모든 슬라이드) */
  var titles = document.querySelectorAll('.banner-title');
  var subs = document.querySelectorAll('.banner-sub');

  function clampText(el, max) {
    if (!el || max <= 0) return;
    var text = (el.textContent || '').trim();
    if (text.length <= max) return;
    el.textContent = text.slice(0, max) + '…';
  }

  titles.forEach(function (el) {
    var max = parseInt(el.getAttribute('data-max'), 10) || 30;
    clampText(el, max);
  });

  subs.forEach(function (el) {
    var max = parseInt(el.getAttribute('data-max'), 10) || 50;
    clampText(el, max);
  });
})();
