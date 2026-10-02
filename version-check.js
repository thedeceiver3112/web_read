(() => {
  'use strict';

  const script = document.currentScript;
  const currentVersion = script?.dataset.appVersion || '';
  if (!currentVersion || window.location.protocol === 'file:') return;

  const checkForUpdate = () => {
    const versionUrl = new URL('version.json', document.baseURI);
    versionUrl.searchParams.set('_', Date.now().toString());

    fetch(versionUrl, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        const latestVersion = String(data.version || '').trim();
        if (!latestVersion || latestVersion === currentVersion) return;

        const refreshedUrl = new URL(window.location.href);
        if (refreshedUrl.searchParams.get('__appv') === latestVersion) return;

        refreshedUrl.searchParams.set('__appv', latestVersion);
        window.location.replace(refreshedUrl.toString());
      })
      .catch(error => {
        console.info('Không kiểm tra được phiên bản mới:', error);
      });
  };

  checkForUpdate();
  window.setInterval(checkForUpdate, 60 * 60 * 1000);
})();
