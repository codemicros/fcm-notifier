(() => {
  const config = window.PUSHCRAFT_CONFIG?.adsense;
  if (!config?.client) return;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.client)}`;
  document.head.appendChild(script);

  document.querySelectorAll('[data-ad-slot]').forEach((host) => {
    const slotName = host.dataset.adSlot;
    const slot = config.slots?.[slotName];
    if (!slot) return;

    host.hidden = false;
    const ad = document.createElement('ins');
    ad.className = 'adsbygoogle';
    ad.style.display = 'block';
    ad.dataset.adClient = config.client;
    ad.dataset.adSlot = slot;
    ad.dataset.adFormat = 'auto';
    ad.dataset.fullWidthResponsive = 'true';
    host.appendChild(ad);

    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* AdSense handles retries. */ }
  });
})();
