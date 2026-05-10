/* Trefly tracker */
(function () {
  if (typeof window === 'undefined') return;
  var script = document.currentScript;
  if (!script) return;
  var siteId = script.getAttribute('data-site');
  if (!siteId) return;

  var endpoint =
    script.getAttribute('data-endpoint') ||
    new URL(script.src).origin + '/api/event';

  if (
    /localhost|127\.0\.0\.1|^192\.168\.|^10\./.test(location.hostname) &&
    !script.hasAttribute('data-allow-localhost')
  ) {
    return;
  }

  function send(path) {
    try {
      var body = JSON.stringify({
        s: siteId,
        p: path,
        r: document.referrer || null,
      });
      fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: body,
        keepalive: true,
        credentials: 'omit',
        mode: 'cors',
      }).catch(function () {});
    } catch (e) {}
  }

  function track() {
    send(location.pathname + location.search);
  }

  track();

  var pushState = history.pushState;
  history.pushState = function () {
    pushState.apply(this, arguments);
    track();
  };
  window.addEventListener('popstate', track);
})();
