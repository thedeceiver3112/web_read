// Only the native placement can report its content height, to a fixed parent.
(() => {
  if (window.parent === window) return;
  const parentOrigin = document.referrer.startsWith('https://www.thedeceiver.site/')
    ? 'https://www.thedeceiver.site' : 'https://thedeceiver.site';
  const content = document.getElementById('ad-content');
  if (!content) return;
  let previous = 0;
  const report = () => {
    const height = Math.min(900, Math.max(160, Math.ceil(content.getBoundingClientRect().height)));
    if (height === previous) return;
    previous = height;
    window.parent.postMessage({ type: 'deceiver-ad-size', height }, parentOrigin);
  };
  new ResizeObserver(report).observe(content);
  report();
})();
