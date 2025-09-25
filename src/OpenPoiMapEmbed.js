import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

// Simple iframe embed for the standalone OpenPoiMap demo page.
// Exposes a small API via ref: sendMessage(message) and syncTrip(tripPayload).
const OpenPoiMapEmbed = forwardRef(function OpenPoiMapEmbed({ src = '/openpoimap-lite.html', style = {}, title = 'OpenPoiMap embed', onLoad, onMessage }, ref) {
  const iframeRef = useRef(null);

  useImperativeHandle(ref, () => ({
    sendMessage: (message) => {
      try {
        const w = iframeRef.current && iframeRef.current.contentWindow;
        if (w) w.postMessage(message, '*');
        return true;
      } catch (e) {
        return false;
      }
    },
    // convenience helper to sync trip items
    syncTrip: (tripId, items) => {
      return (iframeRef.current && iframeRef.current.contentWindow) ? iframeRef.current.contentWindow.postMessage({ type: 'syncTrip', payload: { tripId, items } }, '*') : false;
    }
  }));

  useEffect(() => {
    const handler = (ev) => {
      if (typeof onMessage === 'function') onMessage(ev);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  return (
    <div className="openpoimap-embed" style={{ position: 'relative', width: '100%', ...style }}>
      <iframe
        title={title}
        ref={iframeRef}
        src={src}
        style={{ border: 0, width: '100%', height: '100%' }}
        onLoad={(e) => { try { if (typeof onLoad === 'function') onLoad(e); } catch (err) {} }}
      />
    </div>
  );
});

export default OpenPoiMapEmbed;
