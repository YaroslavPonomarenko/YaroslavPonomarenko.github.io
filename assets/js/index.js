(() => {
  'use strict';

  // ---------- Utilities ----------
  function resolveVarAs(property, name) {
    const el = document.createElement('div');
    el.style[property] = `var(${name})`;
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    el.style.contain = 'size';
    document.body.appendChild(el);
    const value = parseFloat(getComputedStyle(el)[property]);
    el.remove();
    return value;
  }

  const resolveWidthVar = n => resolveVarAs('width', n);
  const resolveFontVar  = n => resolveVarAs('fontSize', n);

  const setSlope = (root, range, cssVarMin, cssVarMax, cssVarSlope) => {
    const min = resolveFontVar(cssVarMin);
    const max = resolveFontVar(cssVarMax);
    const slope = (max - min) / range;
    if (Number.isFinite(slope)) {
      root.style.setProperty(cssVarSlope, slope.toString());
    }
  };

  const setWidthSlope = (root, range, cssVarMin, cssVarMax, cssVarSlope) => {
    const min = resolveWidthVar(cssVarMin);
    const max = resolveWidthVar(cssVarMax);
    const slope = (max - min) / range;
    if (Number.isFinite(slope)) {
      root.style.setProperty(cssVarSlope, slope.toString());
    }
  };

  // Wait for all linked stylesheets to load (Safari timing guard)
  function whenStylesReady() {
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    if (links.length === 0) return Promise.resolve();
    const pending = links.filter(l => !l.sheet);
    if (pending.length === 0) return Promise.resolve();
    return Promise.all(pending.map(l => new Promise(res => {
      l.addEventListener('load', res, { once: true });
      l.addEventListener('error', res, { once: true });
    })));
  }

  // ---------- Features ----------
  function initNewsToggle() {
    const list = document.getElementById('news-list');
    const btn  = document.getElementById('news-toggle');
    if (!list || !btn) return;

    const olderItems = Array.from(list.querySelectorAll('.news__item[hidden]'));
    if (olderItems.length === 0) {
      btn.hidden = true;
      return;
    }

    const setExpanded = expanded => {
      list.classList.toggle('is-expanded', expanded);
      btn.textContent = expanded ? 'Hide Older Entries' : 'View Older Entries';
      btn.setAttribute('aria-expanded', String(expanded));
      olderItems.forEach(item => {
        item.hidden = !expanded;
      });
    };

    // Initialize to collapsed state and ensure deterministic hidden flags.
    setExpanded(false);

    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      setExpanded(!expanded);
    });
  }

  function initPubMedia() {
    const items = Array.from(document.querySelectorAll('.pub__media .pub__video'));
    const reducedMotionQuery = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    items.forEach(v => {
      const wrapper = v.closest('.pub__media');
      if (!wrapper) return;

      const hasPreview = Boolean(v.getAttribute('src'));
      if (hasPreview) {
        wrapper.classList.add('has-video-preview');
      }

      const play = () => {
        if (!hasPreview) return;
        if (reducedMotionQuery?.matches) return;
        v.currentTime = 0;
        v.play().catch(() => {});
      };
      const stop = () => { v.pause(); };

      wrapper.addEventListener('mouseenter', play);
      wrapper.addEventListener('mouseleave', stop);
      wrapper.addEventListener('focusin',  play);
      wrapper.addEventListener('focusout', stop);
    });

    // Pause when off-screen
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(({ isIntersecting, target }) => {
          const v = target.querySelector('.pub__video');
          if (v && !isIntersecting) v.pause();
        });
      }, { threshold: 0.01 });
      document.querySelectorAll('.pub__media').forEach(el => io.observe(el));
    }
  }

  function syncIntroPhotoCap() {
    const intro = document.querySelector('.intro');
    if (!intro) return;

    const photo = intro.querySelector('.intro__photo');
    const nav = intro.querySelector('.site-nav');
    const introText = intro.querySelector('.intro__text');
    if (!photo || !nav) return;

    const isMobileLayout = window.matchMedia
      ? window.matchMedia('(max-width: 750px)').matches
      : window.innerWidth <= 750;

    // Mobile layout has its own sizing rules.
    if (isMobileLayout) {
      photo.style.removeProperty('--intro-photo-width-cap');
      photo.style.removeProperty('--intro-photo-inline-shift');
      return;
    }

    // Reset dynamic values before measuring.
    photo.style.removeProperty('--intro-photo-width-cap');
    photo.style.removeProperty('--intro-photo-inline-shift');

    const baseWidth = resolveWidthVar('--photo-id-width');
    if (!Number.isFinite(baseWidth) || baseWidth <= 0) return;

    let photoRect = photo.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();

    if (photoRect.height <= 0 || photoRect.width <= 0) return;

    const maxHeight = navRect.bottom - photoRect.top;
    if (!Number.isFinite(maxHeight) || maxHeight <= 0) return;

    const ratio = photoRect.width / photoRect.height;
    const cappedWidth = Math.min(baseWidth, maxHeight * ratio);
    if (!Number.isFinite(cappedWidth) || cappedWidth <= 0) return;

    if (cappedWidth < baseWidth - 0.5) {
      photo.style.setProperty('--intro-photo-width-cap', `${cappedWidth}px`);
    }

    if (!introText) return;

    // Re-read after optional cap so geometry is current.
    photoRect = photo.getBoundingClientRect();
    const textRect = introText.getBoundingClientRect();
    if (textRect.width <= 0 || textRect.height <= 0) return;

    const overlapTop = Math.max(textRect.top, photoRect.top);
    const overlapBottom = Math.min(textRect.bottom, photoRect.bottom);
    const overlapHeight = overlapBottom - overlapTop;
    if (!Number.isFinite(overlapHeight) || overlapHeight <= 0) return;

    const rx = photoRect.width / 2;
    const ry = photoRect.height / 2;
    if (rx <= 0 || ry <= 0) return;

    const cx = photoRect.left + rx;
    const cy = photoRect.top + ry;
    const sampleCount = 15;
    const gaps = [];

    for (let i = 0; i < sampleCount; i += 1) {
      const y = overlapTop + ((i + 0.5) / sampleCount) * overlapHeight;
      const normY = (y - cy) / ry;
      const inside = 1 - (normY * normY);
      if (inside <= 0) continue;
      const ellipseLeftX = cx - (rx * Math.sqrt(inside));
      gaps.push(ellipseLeftX - textRect.right);
    }

    if (gaps.length === 0) return;
    gaps.sort((a, b) => a - b);

    const percentileIndex = Math.max(
      0,
      Math.min(gaps.length - 1, Math.floor((gaps.length - 1) * 0.35))
    );
    const representativeGap = gaps[percentileIndex];

    let targetGap = resolveWidthVar('--spacer-vertical');
    if (!Number.isFinite(targetGap) || targetGap <= 0) {
      targetGap = 20;
    }

    const maxShift = photoRect.width * 0.38;
    const desiredShift = Math.min(
      maxShift,
      Math.max(0, representativeGap - targetGap)
    );

    if (desiredShift > 0.5) {
      photo.style.setProperty('--intro-photo-inline-shift', `${desiredShift}px`);
    } else {
      photo.style.removeProperty('--intro-photo-inline-shift');
    }
  }

  // Compute all fluid slopes (after CSS is ready)
  function computeSlopes() {
    const root = document.documentElement;
    const cs = getComputedStyle(root);

    const vwStart = parseFloat(cs.getPropertyValue('--vw-start')) || 375;
    const vwEnd   = parseFloat(cs.getPropertyValue('--website-width-max')) || 800;
    const range   = vwEnd - vwStart;
    if (!Number.isFinite(range) || range <= 0) return false;

    // H1 font size
    setSlope(root, range,
      '--font-size-h1-min',
      '--font-size-h1-max',
      '--font-size-h1-step'
    );

    // H1 line height
    setSlope(root, range,
      '--line-height-h1-min',
      '--line-height-h1-max',
      '--line-height-h1-step'
    );

    // H1 letter spacing
    setSlope(root, range,
      '--letter-spacing-h1-min',
      '--letter-spacing-h1-max',
      '--letter-spacing-h1-step'
    );

    // H2 font size
    setSlope(root, range,
      '--font-size-h2-min',
      '--font-size-h2-max',
      '--font-size-h2-step'
    );

    // H2 line height
    setSlope(root, range,
      '--line-height-h2-min',
      '--line-height-h2-max',
      '--line-height-h2-step'
    );

    // H2 letter spacing
    setSlope(root, range,
      '--letter-spacing-h2-min',
      '--letter-spacing-h2-max',
      '--letter-spacing-h2-step'
    );

    // H3 font size
    setSlope(root, range,
      '--font-size-h3-min',
      '--font-size-h3-max',
      '--font-size-h3-step'
    );

    // H3 line height
    setSlope(root, range,
      '--line-height-h3-min',
      '--line-height-h3-max',
      '--line-height-h3-step'
    );

    // H3 letter spacing
    setSlope(root, range,
      '--letter-spacing-h3-min',
      '--letter-spacing-h3-max',
      '--letter-spacing-h3-step'
    );

    // H4 font size
    setSlope(root, range,
      '--font-size-h4-min',
      '--font-size-h4-max',
      '--font-size-h4-step'
    );

    // H4 line height
    setSlope(root, range,
      '--line-height-h4-min',
      '--line-height-h4-max',
      '--line-height-h4-step'
    );

    // H4 letter spacing
    setSlope(root, range,
      '--letter-spacing-h4-min',
      '--letter-spacing-h4-max',
      '--letter-spacing-h4-step'
    );

    // H5 font size
    setSlope(root, range,
      '--font-size-h5-min',
      '--font-size-h5-max',
      '--font-size-h5-step'
    );

    // H5 line height
    setSlope(root, range,
      '--line-height-h5-min',
      '--line-height-h5-max',
      '--line-height-h5-step'
    );

    // H5 letter spacing
    setSlope(root, range,
      '--letter-spacing-h5-min',
      '--letter-spacing-h5-max',
      '--letter-spacing-h5-step'
    );

    // H6 font size
    setSlope(root, range,
      '--font-size-h6-min',
      '--font-size-h6-max',
      '--font-size-h6-step'
    );

    // H6 line height
    setSlope(root, range,
      '--line-height-h6-min',
      '--line-height-h6-max',
      '--line-height-h6-step'
    );

    // H6 letter spacing
    setSlope(root, range,
      '--letter-spacing-h6-min',
      '--letter-spacing-h6-max',
      '--letter-spacing-h6-step'
    );

    // Body font size
    setSlope(root, range,
      '--font-size-body-min',
      '--font-size-body-max',
      '--font-size-body-step'
    );

    // Body line height
    setSlope(root, range,
      '--line-height-body-min',
      '--line-height-body-max',
      '--line-height-body-step'
    );

    // Body letter spacing
    setSlope(root, range,
      '--letter-spacing-body-min',
      '--letter-spacing-body-max',
      '--letter-spacing-body-step'
    );

    // UI font size
    setSlope(root, range,
      '--font-size-ui-min',
      '--font-size-ui-max',
      '--font-size-ui-step'
    );

    // UI line height
    setSlope(root, range,
      '--line-height-ui-min',
      '--line-height-ui-max',
      '--line-height-ui-step'
    );

    // UI letter spacing
    setSlope(root, range,
      '--letter-spacing-ui-min',
      '--letter-spacing-ui-max',
      '--letter-spacing-ui-step'
    );

    // Captions/Footnotes font size
    setSlope(root, range,
      '--font-size-caption-min',
      '--font-size-caption-max',
      '--font-size-caption-step'
    );

    // Captions/Footnotes line height
    setSlope(root, range,
      '--line-height-caption-min',
      '--line-height-caption-max',
      '--line-height-caption-step'
    );

    // Captions/Footnotes letter spacing
    setSlope(root, range,
      '--letter-spacing-caption-min',
      '--letter-spacing-caption-max',
      '--letter-spacing-caption-step'
    );

    // Superscripts/Subscripts font size
    setSlope(root, range,
      '--font-size-supsub-min',
      '--font-size-supsub-max',
      '--font-size-supsub-step'
    );

    // Photo width
    setWidthSlope(root, range,
      '--photo-id-width-min',
      '--photo-id-width-max',
      '--photo-id-width-step'
    );


    // Graphic abstract width
    setWidthSlope(root, range,
      '--graphical-abstract-width-min',
      '--graphical-abstract-width-max',
      '--graphical-abstract-width-step'
    );

    return true;
  }

  function tryComputeSlopesWithRetry(retries = 5, delay = 60) {
    const ok = computeSlopes();
    syncIntroPhotoCap();
    if (!ok && retries > 0) {
      setTimeout(() => tryComputeSlopesWithRetry(retries - 1, delay), delay);
    }
  }

  // ---------- Main ----------
  async function init() {
    initNewsToggle();
    initPubMedia();

    await whenStylesReady();
    tryComputeSlopesWithRetry();

    // Recompute on resize/orientation/bfcache
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => tryComputeSlopesWithRetry(1, 40), 120);
    });
    window.addEventListener('orientationchange', () => tryComputeSlopesWithRetry(2, 40));
    window.addEventListener('pageshow', e => {
      if (e.persisted) tryComputeSlopesWithRetry(2, 40);
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  window.addEventListener('load', () => tryComputeSlopesWithRetry(2, 80));
})();
