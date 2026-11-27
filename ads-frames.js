(() => {
  'use strict';
  const adsOrigin = 'https://ads.thedeceiver.site';
  const native = document.getElementById('portal-native-ad-frame');
  window.addEventListener('message', event => {
    if (!native || event.origin !== adsOrigin || event.source !== native.contentWindow) return;
    const data = event.data;
    if (!data || data.type !== 'deceiver-ad-size' || !Number.isInteger(data.height)) return;
    if (data.height < 160 || data.height > 900) return;
    native.style.height = `${data.height}px`;
  });
})();
