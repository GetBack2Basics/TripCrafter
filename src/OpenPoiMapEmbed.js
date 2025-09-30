import React, { useRef, useEffect } from 'react';

// Simple iframe embed for openpoimap-lite
export default function OpenPoiMapEmbed({ tripId, items = [] , style = { height: '500px', width: '100%' } }) {
  const iframeRef = useRef(null);

  // Post items when iframe loads or when items change
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const targetOrigin = window.location.origin;

    const send = () => {
      try {
        const msg = { type: 'init', tripId: tripId || 'local', items };
        // try postMessage first
        iframe.contentWindow && iframe.contentWindow.postMessage && iframe.contentWindow.postMessage(msg, '*');
        // also try direct global function if same-origin and available
        try { iframe.contentWindow && iframe.contentWindow.__OPM_LOAD_TRIP_ITEMS__ && iframe.contentWindow.__OPM_LOAD_TRIP_ITEMS__(tripId || 'local', items); } catch (e) { /* ignore cross-origin */ }
      } catch (e) { console.warn('OpenPoiMapEmbed: send failed', e); }
    };

    // send immediately if already loaded
    try {
      if (iframe.contentWindow && iframe.contentDocument && iframe.contentDocument.readyState === 'complete') send();
    } catch (e) { /* ignore cross-origin */ }

    // also listen for load event
    const onLoad = () => send();
    iframe.addEventListener && iframe.addEventListener('load', onLoad);
    return () => { try { iframe.removeEventListener && iframe.removeEventListener('load', onLoad); } catch (e) {} };
  }, [tripId, items]);

  return (
    <iframe
      title="OpenPoiMap Embed"
      ref={iframeRef}
      src="/openpoimap-embed.html"
      style={style}
    />
  );
}
