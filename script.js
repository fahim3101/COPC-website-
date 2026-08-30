document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const throttle = (fn, limit) => {
    let inThrottle = false;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  };

  // 1) Cursor glow — smooth lerp + hover boost
  const cursorGlow = document.getElementById('cursor-glow');
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let glowX = mouseX, glowY = mouseY;
  let glowScale = 1;

  if (cursorGlow && !('ontouchstart' in window) && !prefersReducedMotion) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
    }, { passive: true });

    const lerpGlow = () => {
      glowX += (mouseX - glowX) * 0.075;
      glowY += (mouseY - glowY) * 0.075;
      cursorGlow.style.left = glowX + 'px';
      cursorGlow.style.top = glowY + 'px';
      cursorGlow.style.transform = `translate(-50%,-50%) scale(${glowScale})`;
      requestAnimationFrame(lerpGlow);
    };
    lerpGlow();

    // Enlarge when hovering interactive cards
    document.querySelectorAll('.glass-card, .cta-btn, .gallery-item').forEach(el => {
      el.addEventListener('mouseenter', () => { glowScale = 1.18; cursorGlow.style.opacity = '1'; });
      el.addEventListener('mouseleave', () => { glowScale = 1; });
    });
    document.addEventListener('mouseleave', () => { cursorGlow.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { cursorGlow.style.opacity = '0.9'; });
  } else if (cursorGlow) {
    cursorGlow.style.display = 'none';
  }

  // 2) Matrix rain — softer, more subtle now
  let heroVisible = true;
  const hero = document.getElementById('hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { heroVisible = entries[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  }
  const matrixCanvas = document.getElementById('matrix-canvas');
  if (matrixCanvas && !prefersReducedMotion && hero) {
    const ctx = matrixCanvas.getContext('2d');
    const chars = '01{}<>/=;:[]#&*+-▓▒░'.split('');
    const fontSize = 13;
    let drops = [];
    const initMatrix = () => {
      matrixCanvas.width = window.innerWidth;
      matrixCanvas.height = window.innerHeight;
      const colCount = Math.floor(matrixCanvas.width / fontSize) + 1;
      drops = Array.from({ length: colCount }, () => Math.random() * -(matrixCanvas.height / fontSize));
    };
    initMatrix();
    window.addEventListener('resize', initMatrix, { passive: true });
    const drawMatrix = () => {
      if (document.hidden || !heroVisible) return;
      ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(246,247,251,0.08)' : 'rgba(6,8,15,0.09)';
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' ? '#0891b2' : '#00e5ff';
      ctx.font = fontSize + 'px "JetBrains Mono", monospace';
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.globalAlpha = 0.35 + Math.random() * 0.45;
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        ctx.globalAlpha = 1;
        if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.7 + Math.random() * 0.6;
      }
    };
    setInterval(drawMatrix, 44);
  }

  // 3) Particles — refined network
  const particlesCanvas = document.getElementById('particles-canvas');
  if (particlesCanvas && !prefersReducedMotion) {
    const pCtx = particlesCanvas.getContext('2d');
    let particles = [];
    const initParticles = () => {
      particlesCanvas.width = window.innerWidth;
      particlesCanvas.height = window.innerHeight;
      const isMobile = window.innerWidth < 768;
      const numParticles = isMobile ? 30 : 56;
      const colors = ['#00e5ff', '#7c3aed', '#ffffff'];
      particles = Array.from({ length: numParticles }, () => ({
        x: Math.random() * particlesCanvas.width,
        y: Math.random() * particlesCanvas.height,
        size: Math.random() * 1.6 + 0.7,
        speedX: (Math.random() - 0.5) * 0.45,
        speedY: (Math.random() - 0.5) * 0.45,
        opacity: Math.random() * 0.32 + 0.12,
        color: colors[Math.floor(Math.random() * colors.length)]
      }));
    };
    initParticles();
    window.addEventListener('resize', initParticles, { passive: true });
    const animateParticles = () => {
      if (document.hidden || !heroVisible) { requestAnimationFrame(animateParticles); return; }
      pCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
      for (const p of particles) {
        const dx = p.x - mouseX, dy = p.y - mouseY;
        const dist = Math.hypot(dx, dy);
        if (dist > 1 && dist < 160) {
          p.x += (dx / dist) * 1.2;
          p.y += (dy / dist) * 1.2;
        }
        p.x += p.speedX; p.y += p.speedY;
        if (p.x > particlesCanvas.width) p.x = 0; else if (p.x < 0) p.x = particlesCanvas.width;
        if (p.y > particlesCanvas.height) p.y = 0; else if (p.y < 0) p.y = particlesCanvas.height;
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pCtx.fillStyle = p.color; pCtx.globalAlpha = p.opacity; pCtx.fill(); pCtx.globalAlpha = 1;
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.hypot(dx, dy);
          if (distance < 110) {
            pCtx.beginPath();
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            pCtx.strokeStyle = isLight ? `rgba(8,145,178,${(1 - distance / 110) * 0.18})` : `rgba(0,229,255,${(1 - distance / 110) * 0.28})`;
            pCtx.lineWidth = 0.6;
            pCtx.moveTo(particles[i].x, particles[i].y);
            pCtx.lineTo(particles[j].x, particles[j].y);
            pCtx.stroke();
          }
        }
      }
      requestAnimationFrame(animateParticles);
    };
    animateParticles();
  }

  // 4) Typewriter
  const typewriterElement = document.getElementById('typewriter');
  if (typewriterElement) {
    const text = "Code, Compete, Conquer";
    let index = 0; let isDeleting = false;
    const type = () => {
      if (!isDeleting) {
        typewriterElement.textContent = text.substring(0, index + 1); index++;
        if (index === text.length) { isDeleting = true; setTimeout(type, 2200); }
        else setTimeout(type, 92);
      } else {
        typewriterElement.textContent = text.substring(0, index - 1); index--;
        if (index === 0) { isDeleting = false; setTimeout(type, 520); }
        else setTimeout(type, 44);
      }
    };
    setTimeout(type, 600);
  }

  // 5) Scroll reveal — buttery with blur
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length) {
    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !entry.target.dataset.revealed) {
            entry.target.classList.add('revealed');
            entry.target.dataset.revealed = 'true';
          }
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
      revealElements.forEach(el => revealObserver.observe(el));
    } else {
      revealElements.forEach(el => { el.classList.add('revealed'); el.dataset.revealed = 'true'; });
    }
  }

  // 6) Navigation — scroll progress, active link, parallax
  const navbar = document.getElementById('navbar');
  const scrollProgress = document.getElementById('scroll-progress');
  const backToTop = document.getElementById('back-to-top');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = Array.from(document.querySelectorAll('section[id], #stats'))
    .filter(Boolean);

  const heroContent = document.querySelector('.hero-content');

  const handleScroll = throttle(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
    if (scrollProgress) scrollProgress.style.transform = `scaleX(${progress})`;
    if (backToTop) {
      if (window.scrollY > 560) backToTop.classList.add('visible');
      else backToTop.classList.remove('visible');
    }
    if (window.scrollY > 24) navbar?.classList.add('scrolled');
    else navbar?.classList.remove('scrolled');

    // Hero parallax — subtle lift + fade
    if (heroContent && !prefersReducedMotion) {
      const y = Math.min(window.scrollY * 0.22, 80);
      const op = Math.max(0, 1 - window.scrollY / 680);
      heroContent.style.transform = `translateY(${y}px)`;
      heroContent.style.opacity = String(op);
    }

    // Active link
    let currentSectionId = '';
    const scrollPosition = window.scrollY + 120;
    sections.forEach(section => {
      if (section.offsetTop <= scrollPosition && (section.offsetTop + section.offsetHeight) > scrollPosition) {
        currentSectionId = section.getAttribute('id');
      }
    });
    if (currentSectionId) {
      navLinks.forEach(link => {
        link.classList.toggle('nav-active', link.getAttribute('href') === `#${currentSectionId}`);
      });
    }
  }, 16);

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetSection = document.querySelector(href);
        if (targetSection) {
          const top = href === '#hero' ? 0 : targetSection.offsetTop - 72;
          window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }
      }
    });
  });

  // Smooth scroll for scroll-indicator
  const indicator = document.querySelector('.scroll-indicator');
  if (indicator) {
    indicator.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(indicator.getAttribute('href') || '#about');
      if (target) window.scrollTo({ top: target.offsetTop - 72, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    const icon = mobileMenuBtn.querySelector('i');
    const toggleMenu = () => {
      const isOpen = mobileMenu.classList.toggle('active');
      if (icon) {
        icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
      }
      mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
    };
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    mobileMenuBtn.addEventListener('click', toggleMenu);
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (mobileMenu.classList.contains('active')) toggleMenu();
      });
    });
    document.addEventListener('click', (e) => {
      if (mobileMenu.classList.contains('active') && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        toggleMenu();
      }
    });
  }

  // 7) 3D tilt + glare for cards — refined
  const tiltCards = document.querySelectorAll('.glass-card, .gallery-item');
  if (tiltCards.length && !prefersReducedMotion && !('ontouchstart' in window)) {
    tiltCards.forEach(card => {
      let raf = null;
      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2, centerY = rect.height / 2;
        const xN = (x - centerX) / centerX;
        const yN = (y - centerY) / centerY;

        // Update glare position
        card.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--my', `${(y / rect.height) * 100}%`);

        const rotY = xN * 7;
        const rotX = -yN * 7;

        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-3px)`;
        });
      };
      const onLeave = () => {
        card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
      };
      card.addEventListener('mousemove', onMove, { passive: true });
      card.addEventListener('mouseleave', onLeave);
      card.addEventListener('mouseenter', () => { card.style.transition = 'transform 0.12s ease'; });
      card.addEventListener('mouseleave', () => { card.style.transition = 'transform 0.55s cubic-bezier(0.22,1,0.36,1)'; });
    });
  }

  // Headings subtle follow
  const tiltHeadings = document.querySelectorAll('.section-title, .hero-title');
  if (tiltHeadings.length && !prefersReducedMotion && !('ontouchstart' in window)) {
    tiltHeadings.forEach(h => {
      h.addEventListener('mousemove', (e) => {
        const rect = h.getBoundingClientRect();
        const xN = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const yN = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        h.style.transform = `perspective(800px) rotateX(${(-yN * 3).toFixed(2)}deg) rotateY(${(xN * 3).toFixed(2)}deg)`;
      }, { passive: true });
      h.addEventListener('mouseleave', () => { h.style.transform = 'perspective(800px) rotateX(0) rotateY(0)'; });
    });
  }

  // Magnetic buttons
  const magneticBtns = document.querySelectorAll('.cta-btn, .social-link');
  if (magneticBtns.length && !prefersReducedMotion && !('ontouchstart' in window)) {
    magneticBtns.forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
      }, { passive: true });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate(0,0)'; });
      btn.addEventListener('mouseenter', () => { btn.style.transition = 'transform 0.12s ease'; });
      btn.addEventListener('mouseleave', () => { btn.style.transition = 'transform 0.45s cubic-bezier(0.22,1,0.36,1)'; });
    });
  }

  // 8) Counter animation
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length) {
    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.dataset.animated === 'true' || el.dataset.static === 'true') return;
        const target = parseFloat(el.dataset.target);
        if (isNaN(target)) return;
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const duration = 1700;
        let startTime = null;
        const step = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const progressRaw = Math.min((timestamp - startTime) / duration, 1);
          const progress = 1 - Math.pow(1 - progressRaw, 3);
          const current = progress * target;
          el.textContent = `${prefix}${Math.floor(current).toLocaleString('en-IN')}${suffix}`;
          if (progressRaw < 1) requestAnimationFrame(step);
          else { el.dataset.animated = 'true'; el.textContent = `${prefix}${target.toLocaleString('en-IN')}${suffix}`; }
        };
        if (!prefersReducedMotion) requestAnimationFrame(step);
        else { el.dataset.animated = 'true'; el.textContent = `${prefix}${target.toLocaleString('en-IN')}${suffix}`; }
        statObserver.unobserve(el);
      });
    }, { threshold: 0.45 });
    statNumbers.forEach(el => statObserver.observe(el));
  }

  // 9) Lightbox
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightbox');
  if (galleryItems.length && lightbox) {
    const lightboxImg = lightbox.querySelector('img');
    const lightboxClose = lightbox.querySelector('.lightbox-close');
    let lastFocusedElement = null;
    const openLightbox = (img) => {
      if (img && lightboxImg) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || 'Gallery image';
        lightbox.classList.add('active');
        lastFocusedElement = document.activeElement;
        lightboxClose?.focus();
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', trapFocus);
      }
    };
    const closeLightbox = () => {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', trapFocus);
      lastFocusedElement?.focus();
    };
    const trapFocus = (e) => {
      if (e.key === 'Tab') {
        const focusable = lightbox.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    galleryItems.forEach(item => {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', item.querySelector('img')?.alt || 'View gallery image');
      item.addEventListener('click', () => openLightbox(item.querySelector('img')));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(item.querySelector('img')); }
      });
    });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target === lightboxClose || lightboxClose?.contains(e.target)) closeLightbox();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lightbox.classList.contains('active')) closeLightbox(); });
  }

  // 10) Easter egg
  let keyBuffer = '';
  document.addEventListener('keydown', (e) => {
    if (e.key.length === 1) {
      keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-4);
      if (keyBuffer === 'copc') {
        keyBuffer = '';
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
          position: 'fixed', inset: '0', width: '100vw', height: '100vh',
          background: 'rgba(0,229,255,0.14)', zIndex: '9999', pointerEvents: 'none', transition: 'opacity 0.5s ease'
        });
        document.body.appendChild(overlay);
        if (cursorGlow) {
          const old = cursorGlow.style.boxShadow;
          cursorGlow.style.boxShadow = '0 0 60px 22px rgba(0,229,255,0.55)';
          setTimeout(() => { cursorGlow.style.boxShadow = old; }, 520);
        }
        setTimeout(() => {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 520);
        }, 520);
      }
    }
  });

  // 11) Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f7fb' : '#06080f');
    if (themeToggle) {
      const icon = themeToggle.querySelector('i');
      if (icon) icon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
    }
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  };
  const savedTheme = localStorage.getItem('copc-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  applyTheme(savedTheme);
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      localStorage.setItem('copc-theme', next);
      applyTheme(next);
    });
  }

  // FAQ
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(open => {
        open.classList.remove('open');
        open.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });

  // Newsletter
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    const input = newsletterForm.querySelector('.newsletter-input');
    const msg = newsletterForm.parentElement.querySelector('.newsletter-msg');
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = (input.value || '').trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!valid) {
        msg.style.color = '#ff2e7e';
        msg.textContent = 'Please enter a valid email address.';
        input.focus(); input.style.borderColor = 'rgba(255,46,126,0.5)';
        setTimeout(() => { input.style.borderColor = ''; }, 1600);
        return;
      }
      msg.style.color = 'var(--accent-cyan)';
      msg.textContent = "You’re in — welcome to CoPC! Check your inbox soon. ✨";
      newsletterForm.reset();
    });
  }
});
