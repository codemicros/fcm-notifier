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

  const revealTargets = [
    ...document.querySelectorAll('.tool-card, .compatibility-strip, .content-head, .step, .two-column, .link-card, .faq-item, .footer-inner')
  ];

  revealTargets.forEach((node, index) => {
    node.dataset.reveal = '';
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

  const visualCard = document.querySelector('.hero-visual-card');
  if (visualCard && !reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    visualCard.addEventListener('pointermove', (event) => {
      const rect = visualCard.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      const rotateY = px * 3.2;
      const rotateX = py * -2.6;
      visualCard.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });
    visualCard.addEventListener('pointerleave', () => {
      visualCard.style.transform = '';
    });
  }

  const fileInput = document.getElementById('serviceAccountFile');
  const uploadBox = fileInput?.closest('.upload-box');
  if (fileInput && uploadBox) {
    fileInput.addEventListener('change', () => {
      uploadBox.classList.toggle('is-loaded', Boolean(fileInput.files?.length));
    });
  }
})();
