// Debug build copy of openpoimap-lite.js for quick deploy verification (git:98e78b3)
(function(){
  // Inline a short wrapper that loads the canonical script but keeps a visible marker
  const s = document.createElement('script');
  s.src = '/openpoimap-lite.js';
  s.onload = function(){ console.info('openpoimap-lite (canonical) loaded via debug shim'); };
  s.onerror = function(){ console.warn('Failed to load canonical openpoimap-lite.js from origin'); };
  document.currentScript && document.currentScript.parentNode && document.currentScript.parentNode.insertBefore(s, document.currentScript);
})();
