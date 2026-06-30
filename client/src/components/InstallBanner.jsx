import { useState, useEffect } from 'react';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null); // Android
  const [mode, setMode] = useState(null); // 'android' | 'ios' | null
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return; // already installed

    if (isIOS()) {
      // Show iOS instructions banner
      setMode('ios');
      setVisible(true);
      return;
    }

    // Android / Chrome
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setMode('android');
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible) return null;

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
  };

  return (
    <div className="install-banner">
      <div className="install-banner-left">
        <img src="/icon-192.svg" alt="@me" className="install-banner-icon" />
        <div>
          <div className="install-banner-title">Add @me to home screen</div>
          {mode === 'ios' ? (
            <div className="install-banner-sub">
              Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
            </div>
          ) : (
            <div className="install-banner-sub">Faster access, works offline</div>
          )}
        </div>
      </div>
      <div className="install-banner-actions">
        <button className="install-banner-dismiss" onClick={() => setVisible(false)}>Not now</button>
        {mode === 'android' && (
          <button className="install-banner-btn" onClick={install}>Install</button>
        )}
      </div>
    </div>
  );
}
