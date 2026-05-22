document.addEventListener("DOMContentLoaded", () => {
    console.log("Portfolio Script Initialized");

    // 1. Preloader
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('loaded');
        }, 500); // Small delay to let animations sync
    }

    // 2. Custom Cursor
    const cursorDot = document.querySelector("[data-cursor-dot]");
    const cursorOutline = document.querySelector("[data-cursor-outline]");
    if (cursorDot && cursorOutline) {
        window.addEventListener("mousemove", (e) => {
            const posX = e.clientX;
            const posY = e.clientY;
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;
            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        });
    }

    // 3. Scroll Progress Indicator
    const scrollProgress = document.querySelector('.scroll-progress');
    window.addEventListener('scroll', () => {
        if (scrollProgress) {
            const scrollPx = document.documentElement.scrollTop;
            const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = `${scrollPx / winHeightPx * 100}%`;
            scrollProgress.style.width = scrolled;
        }
    });

    // 4. Smooth Scrolling for Anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                const nav = document.querySelector('.nav');
                if (nav) nav.classList.remove('active');
            }
        });
    });

    // 5. Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    if (themeToggle) {
        try {
            if (localStorage.getItem('theme') === 'light') body.classList.add('light-mode');
        } catch (e) { console.warn("localStorage not available"); }

        themeToggle.addEventListener('click', () => {
            body.classList.toggle('light-mode');
            const isLight = body.classList.contains('light-mode');
            try { localStorage.setItem('theme', isLight ? 'light' : 'dark'); } catch (e) {}
            themeToggle.style.transform = "scale(0.8)";
            setTimeout(() => themeToggle.style.transform = "scale(1.1)", 100);
        });
    }

    // Hamburger Menu Logic
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('.nav');
    if (hamburger && nav) {
        hamburger.addEventListener('click', () => { nav.classList.toggle('active'); });
    }

    // 6. Scroll Reveal Animations (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Reveal only once
            }
        });
    }, { rootMargin: "0px 0px -50px 0px", threshold: 0.1 });

    revealElements.forEach(el => revealObserver.observe(el));

    // 7. Dynamic Typing Effect (Typed.js)
    const typedText = document.getElementById('typed-text');
    if (typedText && window.Typed) {
        new Typed('#typed-text', {
            strings: ['AI Transformation & Delivery Leader', 'Global Delivery & DevSecOps Leader', 'PMP® Certified Program Manager'],
            typeSpeed: 50,
            backSpeed: 30,
            backDelay: 2000,
            loop: true
        });
    }

    // 8. Magnetic Buttons
    const magnets = document.querySelectorAll('.magnetic');
    magnets.forEach(magnet => {
        magnet.addEventListener('mousemove', function(e) {
            const position = magnet.getBoundingClientRect();
            const x = e.pageX - position.left - position.width / 2;
            const y = e.clientY - position.top - position.height / 2;
            magnet.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        magnet.addEventListener('mouseout', function() {
            magnet.style.transform = 'translate(0px, 0px)';
        });
    });

    // 9. Interactive Skill Filtering
    const filterBtns = document.querySelectorAll('.filter-btn');
    const skillTags = document.querySelectorAll('.skills-grid .tag');

    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter');

                skillTags.forEach(tag => {
                    tag.style.transition = 'opacity 0.3s ease';
                    if (filter === 'all' || tag.getAttribute('data-category') === filter) {
                        tag.classList.remove('hidden');
                        setTimeout(() => { tag.style.opacity = '1'; }, 10);
                    } else {
                        tag.style.opacity = '0';
                        setTimeout(() => { tag.classList.add('hidden'); }, 300);
                    }
                });
            });
        });
    }

    // 10. Testimonials Carousel (Swiper.js)
    if (document.querySelector('.testimonial-swiper') && window.Swiper) {
        new Swiper('.testimonial-swiper', {
            slidesPerView: 1,
            spaceBetween: 30,
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                768: { slidesPerView: 2 },
                1024: { slidesPerView: 3 }
            }
        });
    }
});
