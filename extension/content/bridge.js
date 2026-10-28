// Passes what's playing from page-hook.js (inside the player page) to the
// LyricSync side panel. Nothing is sent anywhere else.
(() => {
  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.source !== 'lyricsync-page') return;
    try {
      chrome.runtime.sendMessage({ type: 'lyricsync:state', state: e.data.state }).catch(() => {});
    } catch {
      // The extension was reloaded or removed; this tab needs a refresh.
    }
  });
})();
