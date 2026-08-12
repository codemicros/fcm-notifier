(() => {
  const menuButton = document.querySelector('[data-menu-button]');
  const menu = document.querySelector('[data-menu]');
  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
  }

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  const themeToggle = document.querySelector('[data-theme-toggle]');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme
        || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch { /* storage unavailable */ }
    });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');

  const progress = document.createElement('div');
  progress.className = 'motion-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<span></span>';
  document.body.appendChild(progress);
  const progressBar = progress.firstElementChild;

  const updateScrollState = () => {
    const y = window.scrollY || window.pageYOffset;
    header?.classList.toggle('is-scrolled', y > 12);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progressBar.style.width = `${Math.min(100, Math.max(0, (y / max) * 100))}%`;
  };
  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });
  window.addEventListener('resize', updateScrollState, { passive: true });

  const revealTargets = [...document.querySelectorAll('[data-reveal]')];
  revealTargets.forEach((node, index) => {
    node.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 60}ms`);
  });

  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries, revealObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach((node) => observer.observe(node));
  } else {
    revealTargets.forEach((node) => node.classList.add('is-visible'));
  }

  const fileInput = document.getElementById('serviceAccountFile');
  const uploadBox = fileInput?.closest('.upload-box');
  if (fileInput && uploadBox) {
    fileInput.addEventListener('change', () => {
      uploadBox.classList.toggle('is-loaded', Boolean(fileInput.files?.length));
    });
  }

  // Presentational-only: mirrors the send button / result state that app.js already
  // drives (is-sending class, result hidden/success/error) into a visual step tracker.
  const sendButton = document.getElementById('sendButton');
  const resultPanel = document.getElementById('result');
  const sendStatus = document.querySelector('[data-send-status]');
  if (sendButton && resultPanel && sendStatus) {
    const updateSendStatus = () => {
      if (sendButton.classList.contains('is-sending')) {
        sendStatus.dataset.state = 'sending';
      } else if (!resultPanel.hidden && resultPanel.classList.contains('success')) {
        sendStatus.dataset.state = 'success';
      } else if (!resultPanel.hidden && resultPanel.classList.contains('error')) {
        sendStatus.dataset.state = 'error';
      } else {
        sendStatus.dataset.state = 'ready';
      }
    };
    new MutationObserver(updateSendStatus).observe(sendButton, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(updateSendStatus).observe(resultPanel, { attributes: true, attributeFilter: ['class', 'hidden'] });
    updateSendStatus();
  }
})();
