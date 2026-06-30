import { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone) return;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
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
          <div className="install-banner-sub">Faster access, works offline</div>
        </div>
      </div>
      <div className="install-banner-actions">
        <button className="install-banner-dismiss" onClick={() => setVisible(false)}>Not now</button>
        <button className="install-banner-btn" onClick={install}>Install</button>
      </div>
    </div>
  );
}
