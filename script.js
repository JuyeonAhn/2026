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

  /* 세로형 이미지 감지: height > width 이면 우측 60% 배치용 클래스 적용 */
  function checkPortrait(img) {
    if (!img || !img.closest) return;
    var slide = img.closest('.banner-slide');
    if (!slide) return;
    var isPortrait = img.naturalWidth > 0 && img.naturalHeight > img.naturalWidth;
    slide.classList.toggle('banner-slide--portrait', !!isPortrait);
    if (slide === slides[0] && firstClone) firstClone.classList.toggle('banner-slide--portrait', !!isPortrait);
  }

  slides.forEach(function (slide) {
    var img = slide.querySelector('.banner-image');
    if (!img) return;
    img.addEventListener('load', function () { checkPortrait(img); });
    if (img.complete) checkPortrait(img);
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

  function rgbToHex(rgb) {
    if (!rgb || rgb.length !== 3) return '#262a4d';
    var r = Math.max(0, Math.min(255, rgb[0]));
    var g = Math.max(0, Math.min(255, rgb[1]));
    var b = Math.max(0, Math.min(255, rgb[2]));
    return '#' + [r, g, b].map(function (x) {
      var h = x.toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
  }

  function hexToRgb(hex) {
    var m = (hex || '').replace(/^#/, '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return null;
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }

  /* 사용자 이미지 첨부 → 미리보기 반영 (첫 번째 슬라이드에 적용) */
  (function initUploadApply() {
    var fileInput = document.getElementById('banner-file');
    var urlInput = document.getElementById('banner-image-url');
    var uploadZone = document.getElementById('upload-zone');
    var placeholder = document.getElementById('upload-placeholder');
    var filenameEl = document.getElementById('upload-filename');
    var titleInput = document.getElementById('banner-title-input');
    var subInput = document.getElementById('banner-sub-input');
    var titleMsg = document.getElementById('title-msg');
    var subMsg = document.getElementById('sub-msg');
    var applyBtn = document.getElementById('apply-preview-btn');
    var colorPicker = document.getElementById('banner-color-picker');
    var colorDefaultSwatch = document.getElementById('color-default-swatch');
    var colorResetBtn = document.getElementById('color-reset-btn');
    var defaultExtractedRgb = null;
    if (!fileInput || !applyBtn || !track || slides.length === 0) return;

    function updateApplyButton() {
      var hasFile = fileInput.files && fileInput.files.length > 0;
      var hasUrl = urlInput && (urlInput.value || '').trim().length > 0;
      applyBtn.disabled = !hasFile && !hasUrl;
      if (fileApplyBtn) fileApplyBtn.disabled = !hasFile;
    }

    /* URL로 배너 이미지 적용 (링크 적용 / 이미지 검색 결과 공용) */
    function applyImageUrlToBanner(imageUrl) {
      if (!imageUrl || !track || slides.length === 0) return;
      var firstSlide = slides[0];
      var img = firstSlide.querySelector('.banner-image');
      if (!img) return;
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      img.style.display = '';
      if (firstClone) {
        var cloneImg = firstClone.querySelector('.banner-image');
        if (cloneImg) {
          cloneImg.crossOrigin = 'anonymous';
          cloneImg.src = imageUrl;
          cloneImg.style.display = '';
        }
      }
      img.addEventListener('load', function onUrlLoad() {
        img.removeEventListener('load', onUrlLoad);
        if (typeof checkPortrait === 'function') checkPortrait(img);
      });
      if (img.complete && typeof checkPortrait === 'function') checkPortrait(img);
      extractDominantColor(img, function (rgb) {
        applySlideBg(firstSlide, rgb);
        if (firstClone) firstClone.style.setProperty('--slide-bg', rgb[0] + ',' + rgb[1] + ',' + rgb[2]);
        defaultExtractedRgb = rgb;
        var hex = rgbToHex(rgb);
        if (colorDefaultSwatch) {
          colorDefaultSwatch.style.backgroundColor = hex;
          colorDefaultSwatch.textContent = '';
          colorDefaultSwatch.classList.add('has-color');
        }
        if (colorPicker) colorPicker.value = hex;
        if (colorResetBtn) colorResetBtn.disabled = false;
      });
    }

    function checkTitleSub() {
      var titleLen = (titleInput && titleInput.value) ? titleInput.value.length : 0;
      var subLen = (subInput && subInput.value) ? subInput.value.length : 0;
      if (titleMsg) {
        titleMsg.textContent = titleLen > 30 ? '30자 이내로 작성해 주세요.' : '';
        if (titleInput) titleInput.classList.toggle('is-over', titleLen > 30);
      }
      if (subMsg) {
        subMsg.textContent = subLen > 50 ? '50자 이내로 작성해 주세요.' : '';
        if (subInput) subInput.classList.toggle('is-over', subLen > 50);
      }
    }
    if (titleInput) titleInput.addEventListener('input', checkTitleSub);
    if (subInput) subInput.addEventListener('input', checkTitleSub);

    uploadZone.addEventListener('click', function () {
      fileInput.click();
    });
    uploadZone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    uploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.add('is-dragover');
    });
    uploadZone.addEventListener('dragleave', function () {
      uploadZone.classList.remove('is-dragover');
    });
    uploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('is-dragover');
      var files = e.dataTransfer.files;
      if (files && files.length > 0 && files[0].type.indexOf('image/') === 0) {
        fileInput.files = files;
        if (filenameEl) filenameEl.textContent = files[0].name;
        if (placeholder) placeholder.style.display = 'none';
        updateApplyButton();
      }
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) {
        if (filenameEl) filenameEl.textContent = fileInput.files[0].name;
        if (placeholder) placeholder.style.display = 'none';
      } else {
        if (filenameEl) filenameEl.textContent = '';
        if (placeholder) placeholder.style.display = '';
      }
      updateApplyButton();
    });
    if (urlInput) urlInput.addEventListener('input', updateApplyButton);

    var fileApplyBtn = document.getElementById('file-apply-btn');

    /* 파일 적용하기 버튼: 선택한 파일만 미리보기에 즉시 반영 (여러 번 테스트 가능) */
    if (fileApplyBtn && fileInput && track && slides.length > 0) {
      fileApplyBtn.addEventListener('click', function () {
        if (!fileInput.files || fileInput.files.length === 0) return;
        var file = fileInput.files[0];
        var objectUrl = URL.createObjectURL(file);
        var firstSlide = slides[0];
        if (!firstSlide) return;
        var img = firstSlide.querySelector('.banner-image');
        if (!img) return;

        img.crossOrigin = '';
        img.src = objectUrl;
        img.style.display = '';

        if (firstClone) {
          var cloneImg = firstClone.querySelector('.banner-image');
          if (cloneImg) {
            cloneImg.crossOrigin = '';
            cloneImg.src = objectUrl;
            cloneImg.style.display = '';
          }
        }

        img.addEventListener('load', function onFileLoad() {
          img.removeEventListener('load', onFileLoad);
          if (typeof checkPortrait === 'function') checkPortrait(img);
        });
        if (img.complete && typeof checkPortrait === 'function') checkPortrait(img);

        extractDominantColor(img, function (rgb) {
          applySlideBg(firstSlide, rgb);
          if (firstClone) firstClone.style.setProperty('--slide-bg', rgb[0] + ',' + rgb[1] + ',' + rgb[2]);
          defaultExtractedRgb = rgb;
          var hex = rgbToHex(rgb);
          if (colorDefaultSwatch) {
            colorDefaultSwatch.style.backgroundColor = hex;
            colorDefaultSwatch.textContent = '';
            colorDefaultSwatch.classList.add('has-color');
          }
          if (colorPicker) colorPicker.value = hex;
          if (colorResetBtn) colorResetBtn.disabled = false;
        });
      });
    }

    /* 이미지 링크 적용하기 버튼 */
    var urlApplyBtn = document.getElementById('url-apply-btn');
    if (urlApplyBtn && urlInput) {
      urlApplyBtn.addEventListener('click', function () {
        var imageUrl = (urlInput.value || '').trim();
        if (!imageUrl) return;
        applyImageUrlToBanner(imageUrl);
      });
    }

    /* 이미지 검색 (Pexels / Unsplash) */
    var pexelsKeyInput = document.getElementById('pexels-key');
    var unsplashKeyInput = document.getElementById('unsplash-key');
    var searchQueryInput = document.getElementById('image-search-query');
    var unsplashSearchQueryInput = document.getElementById('unsplash-search-query');
    var searchBtn = document.getElementById('image-search-btn');
    var unsplashSearchBtn = document.getElementById('unsplash-search-btn');
    var searchStatus = document.getElementById('image-search-status');
    var searchResults = document.getElementById('image-search-results');
    var searchTabs = document.querySelectorAll('.image-search-tab');
    var formPexels = document.querySelector('.image-search-form--pexels');
    var formUnsplash = document.querySelector('.image-search-form--unsplash');
    var PEXELS_KEY_STORAGE = 'banner_tool_pexels_key';
    var UNSPLASH_KEY_STORAGE = 'banner_tool_unsplash_key';

    if (pexelsKeyInput && localStorage.getItem(PEXELS_KEY_STORAGE)) {
      pexelsKeyInput.value = localStorage.getItem(PEXELS_KEY_STORAGE);
    }
    if (pexelsKeyInput) {
      pexelsKeyInput.addEventListener('change', function () {
        var val = (pexelsKeyInput.value || '').trim();
        if (val) localStorage.setItem(PEXELS_KEY_STORAGE, val);
        else localStorage.removeItem(PEXELS_KEY_STORAGE);
      });
    }
    if (unsplashKeyInput && localStorage.getItem(UNSPLASH_KEY_STORAGE)) {
      unsplashKeyInput.value = localStorage.getItem(UNSPLASH_KEY_STORAGE);
    }
    if (unsplashKeyInput) {
      unsplashKeyInput.addEventListener('change', function () {
        var val = (unsplashKeyInput.value || '').trim();
        if (val) localStorage.setItem(UNSPLASH_KEY_STORAGE, val);
        else localStorage.removeItem(UNSPLASH_KEY_STORAGE);
      });
    }

    if (searchTabs && searchTabs.length && formPexels && formUnsplash) {
      searchTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var src = tab.getAttribute('data-source');
          searchTabs.forEach(function (t) { t.classList.remove('is-active'); });
          tab.classList.add('is-active');
          formPexels.hidden = src !== 'pexels';
          formUnsplash.hidden = src !== 'unsplash';
        });
      });
    }

    function renderSearchResults(photos, getFullUrl, getThumbUrl) {
      if (!searchResults) return;
      searchResults.innerHTML = '';
      (photos || []).forEach(function (photo) {
        var fullUrl = getFullUrl(photo);
        if (!fullUrl) return;
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'image-search-item';
        item.title = '배너에 적용';
        var thumb = document.createElement('img');
        thumb.src = getThumbUrl(photo) || fullUrl;
        thumb.alt = '검색 결과';
        thumb.loading = 'lazy';
        item.appendChild(thumb);
        item.addEventListener('click', function () {
          applyImageUrlToBanner(fullUrl);
          if (urlInput) urlInput.value = fullUrl;
        });
        searchResults.appendChild(item);
      });
    }

    if (searchBtn && searchQueryInput && searchResults && searchStatus) {
      function doPexelsSearch() {
        var key = (pexelsKeyInput && pexelsKeyInput.value) ? pexelsKeyInput.value.trim() : '';
        var query = (searchQueryInput.value || '').trim();
        if (!key) {
          searchStatus.textContent = 'Pexels API Key를 입력하세요. pexels.com/api 에서 가입 후 즉시 발급됩니다.';
          searchStatus.className = 'image-search-status image-search-status--error';
          return;
        }
        if (!query) {
          searchStatus.textContent = '검색어를 입력하세요.';
          searchStatus.className = 'image-search-status image-search-status--error';
          return;
        }
        if (key) localStorage.setItem(PEXELS_KEY_STORAGE, key);
        searchStatus.textContent = '검색 중…';
        searchStatus.className = 'image-search-status';
        searchResults.innerHTML = '';

        fetch('https://api.pexels.com/v1/search?query=' + encodeURIComponent(query) + '&per_page=12', {
          headers: { 'Authorization': key }
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            searchStatus.textContent = '';
            if (data.error) {
              searchStatus.textContent = data.error || '검색 실패';
              searchStatus.className = 'image-search-status image-search-status--error';
              return;
            }
            var photos = data.photos || [];
            if (photos.length === 0) {
              searchStatus.textContent = '검색 결과가 없습니다.';
              searchStatus.className = 'image-search-status';
              return;
            }
            renderSearchResults(photos, function (p) { return (p.src && p.src.large) || (p.src && p.src.original) || ''; }, function (p) { return (p.src && p.src.small) || (p.src && p.src.medium) || ''; });
          })
          .catch(function () {
            searchStatus.textContent = '검색 중 오류가 났습니다. API Key와 네트워크를 확인하세요.';
            searchStatus.className = 'image-search-status image-search-status--error';
          });
      }
      searchBtn.addEventListener('click', doPexelsSearch);
      searchQueryInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); doPexelsSearch(); }
      });
    }

    if (unsplashSearchBtn && unsplashSearchQueryInput && searchResults && searchStatus) {
      function doUnsplashSearch() {
        var key = (unsplashKeyInput && unsplashKeyInput.value) ? unsplashKeyInput.value.trim() : '';
        var query = (unsplashSearchQueryInput.value || '').trim();
        if (!key) {
          searchStatus.textContent = 'Unsplash Access Key를 입력하세요. (발급 시 심사가 필요할 수 있습니다)';
          searchStatus.className = 'image-search-status image-search-status--error';
          return;
        }
        if (!query) {
          searchStatus.textContent = '검색어를 입력하세요.';
          searchStatus.className = 'image-search-status image-search-status--error';
          return;
        }
        if (key) localStorage.setItem(UNSPLASH_KEY_STORAGE, key);
        searchStatus.textContent = '검색 중…';
        searchStatus.className = 'image-search-status';
        searchResults.innerHTML = '';

        fetch('https://api.unsplash.com/search/photos?query=' + encodeURIComponent(query) + '&client_id=' + encodeURIComponent(key) + '&per_page=12')
          .then(function (res) { return res.json(); })
          .then(function (data) {
            searchStatus.textContent = '';
            if (data.errors) {
              searchStatus.textContent = data.errors[0] || '검색 실패';
              searchStatus.className = 'image-search-status image-search-status--error';
              return;
            }
            var results = data.results || [];
            if (results.length === 0) {
              searchStatus.textContent = '검색 결과가 없습니다.';
              searchStatus.className = 'image-search-status';
              return;
            }
            renderSearchResults(results, function (p) { return (p.urls && p.urls.regular) || (p.urls && p.urls.full) || ''; }, function (p) { return (p.urls && p.urls.thumb) || ''; });
          })
          .catch(function () {
            searchStatus.textContent = '검색 중 오류가 났습니다. Key와 네트워크를 확인하세요.';
            searchStatus.className = 'image-search-status image-search-status--error';
          });
      }
      unsplashSearchBtn.addEventListener('click', doUnsplashSearch);
      unsplashSearchQueryInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); doUnsplashSearch(); }
      });
    }

    applyBtn.addEventListener('click', function () {
      var imageUrl = (urlInput && urlInput.value) ? urlInput.value.trim() : '';
      var hasFile = fileInput.files && fileInput.files.length > 0;
      if (!hasFile && !imageUrl) return;
      var title = (titleInput && titleInput.value) ? titleInput.value.trim() : '';
      var sub = (subInput && subInput.value) ? subInput.value.trim() : '';
      if (title.length > 30) title = title.slice(0, 30);
      if (sub.length > 50) sub = sub.slice(0, 50);

      var imageSource;
      if (imageUrl) {
        imageSource = imageUrl;
      } else {
        var file = fileInput.files[0];
        imageSource = URL.createObjectURL(file);
      }
      var firstSlide = slides[0];
      if (!firstSlide) return;
      var img = firstSlide.querySelector('.banner-image');
      var titleEl = firstSlide.querySelector('.banner-title');
      var subEl = firstSlide.querySelector('.banner-sub');
      if (!img) return;

      if (imageUrl) img.crossOrigin = 'anonymous';
      img.src = imageSource;
      img.style.display = '';
      img.addEventListener('load', function onApplyLoad() {
        img.removeEventListener('load', onApplyLoad);
        if (typeof checkPortrait === 'function') checkPortrait(img);
      });
      if (img.complete && typeof checkPortrait === 'function') checkPortrait(img);
      if (titleEl) {
        titleEl.textContent = title || titleEl.textContent;
        clampText(titleEl, 30);
      }
      if (subEl) {
        subEl.textContent = sub || subEl.textContent;
        clampText(subEl, 50);
      }

      if (firstClone) {
        var cloneImg = firstClone.querySelector('.banner-image');
        var cloneTitle = firstClone.querySelector('.banner-title');
        var cloneSub = firstClone.querySelector('.banner-sub');
        if (cloneImg) {
          if (imageUrl) cloneImg.crossOrigin = 'anonymous';
          cloneImg.src = imageSource;
          cloneImg.style.display = '';
        }
        if (cloneTitle) {
          cloneTitle.textContent = titleEl ? titleEl.textContent : (title || '');
          clampText(cloneTitle, 30);
        }
        if (cloneSub) {
          cloneSub.textContent = subEl ? subEl.textContent : (sub || '');
          clampText(cloneSub, 50);
        }
      }

      extractDominantColor(img, function (rgb) {
        applySlideBg(firstSlide, rgb);
        if (firstClone) applySlideBg(firstClone, rgb);
        defaultExtractedRgb = rgb;
        var hex = rgbToHex(rgb);
        if (colorDefaultSwatch) {
          colorDefaultSwatch.style.backgroundColor = hex;
          colorDefaultSwatch.textContent = '';
          colorDefaultSwatch.classList.add('has-color');
        }
        if (colorPicker) colorPicker.value = hex;
        if (colorResetBtn) colorResetBtn.disabled = false;
      });

      applyBtn.textContent = '반영됨';
      applyBtn.disabled = true;
      setTimeout(function () {
        applyBtn.textContent = '미리보기에 반영';
        updateApplyButton();
      }, 2000);
    });

    /* 컬러 팔레트: 조정 시 배너에 즉시 반영, 되돌리기 */
    if (colorPicker && slides.length > 0) {
      colorPicker.addEventListener('input', function () {
        var hex = colorPicker.value;
        var rgb = hexToRgb(hex);
        if (rgb) {
          applySlideBg(slides[0], rgb);
          if (firstClone) firstClone.style.setProperty('--slide-bg', rgb[0] + ',' + rgb[1] + ',' + rgb[2]);
        }
      });
    }
    if (colorResetBtn && slides.length > 0) {
      colorResetBtn.addEventListener('click', function () {
        if (!defaultExtractedRgb) return;
        applySlideBg(slides[0], defaultExtractedRgb);
        if (firstClone) firstClone.style.setProperty('--slide-bg', defaultExtractedRgb[0] + ',' + defaultExtractedRgb[1] + ',' + defaultExtractedRgb[2]);
        if (colorPicker) colorPicker.value = rgbToHex(defaultExtractedRgb);
      });
    }

    /* 초기 주조색이 있으면 기본 주조색·피커·되돌리기 버튼 활성화 */
    (function initColorFromSlide() {
      var firstSlide = slides[0];
      if (!firstSlide || !colorPicker) return;
      var bg = firstSlide.getAttribute('data-slide-bg') || firstSlide.style.getPropertyValue('--slide-bg') || (window.getComputedStyle && getComputedStyle(firstSlide).getPropertyValue('--slide-bg').trim());
      if (bg && /^\d+,\s*\d+,\s*\d+$/.test(bg.trim())) {
        var parts = bg.split(',').map(function (p) { return parseInt(p.trim(), 10); });
        if (parts.length === 3) {
          var hex = rgbToHex(parts);
          defaultExtractedRgb = parts;
          colorPicker.value = hex;
          if (colorDefaultSwatch) {
            colorDefaultSwatch.style.backgroundColor = hex;
            colorDefaultSwatch.textContent = '';
            colorDefaultSwatch.classList.add('has-color');
          }
          if (colorResetBtn) colorResetBtn.disabled = false;
        }
      }
    })();
  })();

  /* 탭 전환: 제작 프로세스 / 가이드 */
  (function initGuideTabs() {
    var tabProcess = document.getElementById('tab-process');
    var tabGuide = document.getElementById('tab-guide');
    var panelProcess = document.getElementById('panel-process');
    var panelGuide = document.getElementById('panel-guide');
    if (!tabProcess || !tabGuide || !panelProcess || !panelGuide) return;

    function switchTo(id) {
      var isProcess = id === 'panel-process';
      tabProcess.classList.toggle('is-active', isProcess);
      tabGuide.classList.toggle('is-active', !isProcess);
      tabProcess.setAttribute('aria-selected', isProcess);
      tabGuide.setAttribute('aria-selected', !isProcess);
      panelProcess.classList.toggle('is-active', isProcess);
      panelGuide.classList.toggle('is-active', !isProcess);
      panelProcess.hidden = !isProcess;
      panelGuide.hidden = isProcess;
    }

    tabProcess.addEventListener('click', function () { switchTo('panel-process'); });
    tabGuide.addEventListener('click', function () { switchTo('panel-guide'); });
  })();
})();
