document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // PERFORMANCE & ACCESSIBILITY CHECK
  // ==========================================================================
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Simple throttle function for scroll events
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ==========================================================================
  // 1. CUSTOM CURSOR GLOW
  // ==========================================================================
  const cursorGlow = document.getElementById('cursor-glow');
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  if (cursorGlow && !('ontouchstart' in window)) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorGlow.style.left = mouseX + 'px';
      cursorGlow.style.top = mouseY + 'px';
    }, { passive: true });
  } else if (cursorGlow) {
    cursorGlow.style.display = 'none';
  }

  // ==========================================================================
  // 2. MATRIX RAIN EFFECT
  // ==========================================================================
  const matrixCanvas = document.getElementById('matrix-canvas');
  if (matrixCanvas && !prefersReducedMotion) {
    const ctx = matrixCanvas.getContext('2d');
    
    // Characters: Katakana + Digits + Symbols
    const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッン0123456789{}<>/=;:()[]#@&*+-'.split('');
    
    const fontSize = 14;
    let columns = [];
    let drops = [];

    const initMatrix = () => {
      matrixCanvas.width = window.innerWidth;
      matrixCanvas.height = window.innerHeight;
      
      const colCount = Math.floor(matrixCanvas.width / fontSize) + 1;
      drops = [];
      for (let i = 0; i < colCount; i++) {
        // Start at random y positions so they don't all fall together initially
        drops[i] = Math.random() * -(matrixCanvas.height / fontSize);
      }
    };

    initMatrix();
    window.addEventListener('resize', initMatrix, { passive: true });

    const drawMatrix = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.05)'; // trail effect
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

      ctx.fillStyle = '#00ff41'; // green text
      ctx.font = fontSize + 'px "JetBrains Mono", monospace';

      for (let i = 0; i < drops.length; i++) {
        // Random char
        const text = chars[Math.floor(Math.random() * chars.length)];
        
        // Random slight alpha variations
        ctx.globalAlpha = Math.random() * 0.5 + 0.5;
        
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        ctx.globalAlpha = 1.0;

        // Reset drop to top randomly or when it hits bottom
        if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        
        drops[i]++;
      }
    };

    setInterval(drawMatrix, 33); // ~30fps
  }

  // ==========================================================================
  // 3. PARTICLE SYSTEM
  // ==========================================================================
  const particlesCanvas = document.getElementById('particles-canvas');
  if (particlesCanvas && !prefersReducedMotion) {
    const pCtx = particlesCanvas.getContext('2d');
    let particles = [];
    
    const initParticles = () => {
      particlesCanvas.width = window.innerWidth;
      particlesCanvas.height = window.innerHeight;
      
      const isMobile = window.innerWidth < 768;
      const numParticles = isMobile ? 35 : 70;
      const colors = ['#00f0ff', '#8b5cf6', '#ffffff'];
      
      particles = [];
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * particlesCanvas.width,
          y: Math.random() * particlesCanvas.height,
          size: Math.random() * 2 + 1, // 1 to 3
          speedX: Math.random() - 0.5,
          speedY: Math.random() - 0.5,
          opacity: Math.random() * 0.4 + 0.1,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    initParticles();
    window.addEventListener('resize', initParticles, { passive: true });

    const animateParticles = () => {
      pCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
      
      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Mouse interaction push
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const distanceToMouse = Math.sqrt(dx * dx + dy * dy);
        
        if (distanceToMouse < 150) {
          // Push away gently
          const forceDirectionX = dx / distanceToMouse;
          const forceDirectionY = dy / distanceToMouse;
          p.x += forceDirectionX * 1.5;
          p.y += forceDirectionY * 1.5;
        }

        // Apply natural movement
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Wrap edges
        if (p.x > particlesCanvas.width) p.x = 0;
        else if (p.x < 0) p.x = particlesCanvas.width;
        
        if (p.y > particlesCanvas.height) p.y = 0;
        else if (p.y < 0) p.y = particlesCanvas.height;

        // Draw particle
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pCtx.fillStyle = p.color;
        pCtx.globalAlpha = p.opacity;
        pCtx.fill();
        pCtx.globalAlpha = 1.0;
      }
      
      // Draw lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 120) {
            pCtx.beginPath();
            pCtx.strokeStyle = `rgba(0, 240, 255, ${1 - distance / 120})`;
            pCtx.lineWidth = 0.5;
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

  // ==========================================================================
  // 4. TYPEWRITER EFFECT
  // ==========================================================================
  const typewriterElement = document.getElementById('typewriter');
  if (typewriterElement) {
    const text = "Code, Compete, Conquer";
    let index = 0;
    let isDeleting = false;
    
    const type = () => {
      if (!isDeleting) {
        // Typing forward
        typewriterElement.textContent = text.substring(0, index + 1);
        index++;
        
        if (index === text.length) {
          isDeleting = true;
          setTimeout(type, 2500); // Pause at end
        } else {
          setTimeout(type, 100);
        }
      } else {
        // Deleting backward
        typewriterElement.textContent = text.substring(0, index - 1);
        index--;
        
        if (index === 0) {
          isDeleting = false;
          setTimeout(type, 500); // Pause when empty
        } else {
          setTimeout(type, 50);
        }
      }
    };
    
    setTimeout(type, 500);
  }

  // ==========================================================================
  // 5. SCROLL REVEAL ANIMATION
  // ==========================================================================
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length > 0 && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.revealed) {
          entry.target.classList.add('revealed');
          entry.target.dataset.revealed = 'true';
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });
    
    revealElements.forEach(el => revealObserver.observe(el));
  } else if (prefersReducedMotion) {
    // If reduced motion is preferred, immediately show elements
    revealElements.forEach(el => {
      el.classList.add('revealed');
      el.dataset.revealed = 'true';
    });
  }

  // ==========================================================================
  // 6. NAVIGATION
  // ==========================================================================
  const navbar = document.querySelector('.navbar'); // Assuming class .navbar
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = Array.from(navLinks).map(link => {
    const id = link.getAttribute('href');
    if (id && id.startsWith('#')) {
      return document.querySelector(id);
    }
    return null;
  }).filter(Boolean);

  const handleScroll = throttle(() => {
    // Navbar background change
    if (window.scrollY > 50) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }

    // Active link highlighting
    let currentSectionId = '';
    const scrollPosition = window.scrollY + 150; // offset

    sections.forEach(section => {
      if (section && section.offsetTop <= scrollPosition && (section.offsetTop + section.offsetHeight) > scrollPosition) {
        currentSectionId = section.getAttribute('id');
      }
    });

    if (currentSectionId) {
      navLinks.forEach(link => {
        link.classList.remove('nav-active');
        if (link.getAttribute('href') === `#${currentSectionId}`) {
          link.classList.add('nav-active');
        }
      });
    }
  }, 100);

  window.addEventListener('scroll', handleScroll, { passive: true });

  // Smooth scroll
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetSection = document.querySelector(href);
        if (targetSection) {
          window.scrollTo({
            top: targetSection.offsetTop - 70, // offset for navbar
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
        }
      }
    });
  });

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuBtn && mobileMenu) {
    const icon = mobileMenuBtn.querySelector('i');
    
    const toggleMenu = () => {
      mobileMenu.classList.toggle('active');
      if (icon) {
        if (mobileMenu.classList.contains('active')) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-times');
        } else {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
      }
    };

    mobileMenuBtn.addEventListener('click', toggleMenu);

    // Close when clicking a link
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (mobileMenu.classList.contains('active')) {
          toggleMenu();
        }
      });
    });
  }

  // ==========================================================================
  // 7. 3D TILT CARD EFFECT
  // ==========================================================================
  const tiltCards = document.querySelectorAll('.tilt-card');
  if (tiltCards.length > 0 && !prefersReducedMotion && !('ontouchstart' in window)) {
    tiltCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 0.1s ease';
      });
      
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        
        // Mouse pos relative to center (-1 to 1)
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const xNormalized = (x - centerX) / centerX;
        const yNormalized = (y - centerY) / centerY;
        
        // Max rotation 8 degrees
        const xRotation = xNormalized * 8;
        const yRotation = -yNormalized * 8; // inverted for natural feel
        
        card.style.transform = `perspective(1000px) rotateX(${yRotation}deg) rotateY(${xRotation}deg)`;
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s ease';
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
      });
    });
  }

  // ==========================================================================
  // 8. COUNTER ANIMATION
  // ==========================================================================
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length > 0) {
    const statObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          
          if (el.dataset.animated === 'true') return;
          if (el.dataset.static === 'true') return;
          
          const targetStr = el.dataset.target;
          const target = parseFloat(targetStr);
          if (isNaN(target)) return;
          
          const prefix = el.dataset.prefix || '';
          const suffix = el.dataset.suffix || '';
          const duration = 2000;
          let startTime = null;
          
          const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progressRaw = Math.min((timestamp - startTime) / duration, 1);
            
            // ease-out cubic
            const progress = 1 - Math.pow(1 - progressRaw, 3);
            const current = progress * target;
            
            // Format number
            const formatted = Math.floor(current).toLocaleString('en-IN');
            el.textContent = `${prefix}${formatted}${suffix}`;
            
            if (progressRaw < 1) {
              requestAnimationFrame(step);
            } else {
              el.dataset.animated = 'true';
              el.textContent = `${prefix}${target.toLocaleString('en-IN')}${suffix}`;
            }
          };
          
          if (!prefersReducedMotion) {
            requestAnimationFrame(step);
          } else {
            // Immediate on reduced motion
            el.dataset.animated = 'true';
            el.textContent = `${prefix}${target.toLocaleString('en-IN')}${suffix}`;
          }
        }
      });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(el => statObserver.observe(el));
  }

  // ==========================================================================
  // 9. GALLERY LIGHTBOX
  // ==========================================================================
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightbox');
  
  if (galleryItems.length > 0 && lightbox) {
    const lightboxImg = lightbox.querySelector('img');
    const lightboxClose = lightbox.querySelector('.lightbox-close');
    
    const closeLightbox = () => {
      lightbox.classList.remove('active');
    };

    galleryItems.forEach(item => {
      item.addEventListener('click', () => {
        const img = item.querySelector('img');
        if (img && lightboxImg) {
          lightboxImg.src = img.src;
          lightbox.classList.add('active');
        }
      });
    });
    
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || (lightboxClose && e.target === lightboxClose) || (lightboxClose && lightboxClose.contains(e.target))) {
        closeLightbox();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  // ==========================================================================
  // 10. EASTER EGG
  // ==========================================================================
  let keyBuffer = '';
  const eggCode = 'copc';
  
  document.addEventListener('keydown', (e) => {
    // Only capture single characters to build the buffer
    if (e.key.length === 1) {
      keyBuffer += e.key.toLowerCase();
      // Keep only last 4 chars
      if (keyBuffer.length > 4) {
        keyBuffer = keyBuffer.slice(-4);
      }
      
      if (keyBuffer === eggCode) {
        keyBuffer = ''; // reset
        
        // Trigger easter egg
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0, 255, 65, 0.15)';
        overlay.style.zIndex = '9999';
        overlay.style.pointerEvents = 'none';
        overlay.style.transition = 'opacity 0.5s ease';
        
        document.body.appendChild(overlay);
        
        if (cursorGlow) {
          const oldColor = cursorGlow.style.backgroundColor || cursorGlow.style.boxShadow;
          cursorGlow.style.boxShadow = '0 0 50px 20px #00ff41'; // matrix green glow
          setTimeout(() => {
             cursorGlow.style.boxShadow = oldColor;
          }, 500);
        }
        
        // Fade out and remove
        setTimeout(() => {
          overlay.style.opacity = '0';
          setTimeout(() => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          }, 500);
        }, 500);
      }
    }
  });

});
