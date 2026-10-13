/* ============================================================
   MAIN.JS : interaksi & animasi halaman portofolio
   ============================================================
   Butuh: GSAP + ScrollTrigger (dimuat di index.html sebelum file ini).
   Kalau GSAP gagal dimuat atau pengguna memilih "kurangi gerakan",
   bagian animasi dilewati dan halaman tetap tampil utuh.

   DAFTAR ISI
     1. Dasar            variabel umum + deteksi mouse
     2. Navigasi         nav muncul setelah hero, link aktif, menu HP
     3. Kursor           kursor kustom
     3b. Switch mode     tombol geser Software Engineer <-> Designer + efek tirai
     --- semua di bawah ini hanya jalan jika animasi aktif ---
     4. Helper           splitWords() memecah teks jadi kata
     5. Loader + intro   layar pembuka lalu animasi masuk hero
     6. Hero             parallax mouse + efek saat di-scroll
     7. Marquee          arah teks berjalan mengikuti scroll
     8. Reveal umum      [data-reveal] dan [data-split] di HTML
     9. Profil | Aktivitas | Quote | Galeri | Footer
    10. Efek magnet     tombol "tertarik" ke kursor

   CATATAN
   - Selector seperti '.title', '.subject', '.gallery' mengacu ke class di index.html.
     Kalau class di HTML di-rename, ubah juga selector-nya di sini.
   - Ingin elemen baru muncul saat di-scroll? Cukup beri atribut
     data-reveal (naik + fade) atau data-split (kata per kata) di HTML.
   ============================================================ */

(() => {
    const html = document.documentElement;
    const body = document.body;
    const anim = html.classList.contains('anim');
    const finePointer = matchMedia('(pointer: fine)').matches;

    /* ---------- Nav: muncul setelah hero lewat ---------- */
    const nav = document.getElementById('nav');
    new IntersectionObserver(([e]) => nav.classList.toggle('is-visible', !e.isIntersecting), { threshold: 0.12 })
        .observe(document.querySelector('.stage'));

    const navLinks = [...document.querySelectorAll('.nav-links a')];
    const activeObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => activeObs.observe(document.querySelector(a.getAttribute('href'))));

    /* ---------- Menu HP ---------- */
    const toggle = document.querySelector('.nav-toggle');
    const setMenu = open => {
        body.classList.toggle('menu-open', open);
        body.classList.toggle('is-locked', open);
        toggle.setAttribute('aria-expanded', open);
        toggle.textContent = open ? 'Tutup' : 'Menu';
    };
    toggle.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
    document.querySelectorAll('.menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

    /* ---------- Kursor ---------- */
    if (finePointer) {
        html.classList.add('has-cursor');
        const cursor = document.querySelector('.cursor');
        let mx = -100, my = -100, cx = mx, cy = my;
        addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
        (function loop() {
            cx += (mx - cx) * 0.22; cy += (my - cy) * 0.22;
            cursor.style.transform = `translate(${cx}px, ${cy}px)`;
            requestAnimationFrame(loop);
        })();
        document.querySelectorAll('a, button, .act, .panel-img, .mode-switch').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
        });
    }

    /* ---------- Switch mode: Software Engineer <-> Designer ---------- */
    // Tiap mode adalah satu halaman (index.html = Engineer, designer.html = Designer).
    // Mode halaman ini dibaca dari <html data-mode="...">; tujuan pindah ada di data-url pada .mode-switch.
    // true = loader versi singkat (hanya buka tirai) saat datang dari tombol switch.
    // false = loader penuh (huruf Jepang + hitungan 000-100) tampil di setiap perpindahan.
    const QUICK_LOADER_ON_SWITCH = false;
    let fromSwitch = false;   // true jika halaman ini dibuka lewat tombol switch
    try { fromSwitch = sessionStorage.getItem('modeSwitch') === '1'; sessionStorage.removeItem('modeSwitch'); } catch (e) { }

    const sw = document.getElementById('modeSwitch');
    if (sw) {
        const knob = sw.querySelector('.mode-knob');
        const current = html.dataset.mode;                        // 'engineer' | 'designer'
        const other = current === 'engineer' ? 'designer' : 'engineer';
        const travel = () => knob.offsetWidth;                    // jarak geser penuh bulatan (px)
        let switching = false;

        // Geser bulatan ke sisi lain, tutup layar dengan tirai berwarna mode tujuan, lalu pindah halaman
        const goOther = () => {
            if (switching) return;
            switching = true;
            knob.style.transform = `translateX(${other === 'designer' ? travel() : 0}px)`;
            try { sessionStorage.setItem('modeSwitch', '1'); } catch (e) { }
            const url = sw.dataset.url;
            if (!anim) { location.href = url; return; }          // tanpa animasi: langsung pindah

            const wipe = document.createElement('div');
            wipe.className = 'mode-wipe';
            wipe.style.setProperty('--wipe', getComputedStyle(html).getPropertyValue('--loader-' + other).trim());
            wipe.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
            body.append(wipe);
            body.classList.add('is-locked');
            gsap.fromTo(wipe.children, { yPercent: 100 }, {
                yPercent: 0, duration: 0.8, stagger: 0.06, ease: 'expo.inOut',
                onComplete: () => { location.href = url; }
            });
        };

        // Drag bulatan atau ketuk label sisi yang lain
        let startX = null, dx = 0, dragged = false, downSide = null;
        sw.addEventListener('pointerdown', e => {
            if (switching || (e.pointerType === 'mouse' && e.button !== 0)) return;
            startX = e.clientX; dx = 0; dragged = false;
            downSide = e.target.closest('.mode-opt')?.dataset.side || null;
            sw.setPointerCapture(e.pointerId);
        });
        sw.addEventListener('pointermove', e => {
            if (startX === null) return;
            const dir = current === 'engineer' ? 1 : -1;          // arah geser yang valid
            dx = Math.max(0, Math.min(travel(), (e.clientX - startX) * dir));
            if (dx > 4) dragged = true;
            if (dragged) {
                knob.style.transition = 'none';
                knob.style.transform = `translateX(${(current === 'engineer' ? 0 : travel()) + dx * dir}px)`;
            }
        });
        sw.addEventListener('pointerup', () => {
            if (startX === null) return;
            startX = null;
            knob.style.transition = '';
            // Drag: pindah jika sudah melewati separuh jalan. Ketukan: pindah jika yang diketuk sisi lain.
            if (dragged ? dx > travel() * 0.5 : downSide === other) goOther();
            else knob.style.transform = '';
        });
        sw.addEventListener('pointercancel', () => { startX = null; knob.style.transition = ''; knob.style.transform = ''; });

        // Keyboard: Enter / Spasi / tombol panah ke arah sisi lain
        sw.addEventListener('keydown', e => {
            const toward = current === 'engineer' ? 'ArrowRight' : 'ArrowLeft';
            if (e.key === toward || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goOther(); }
        });

        // Tombol "Kembali" browser bisa memulihkan halaman lama dari cache: bersihkan sisa tirai
        addEventListener('pageshow', e => {
            if (!e.persisted) return;
            document.querySelector('.mode-wipe')?.remove();
            body.classList.remove('is-locked');
            knob.style.transform = '';
            switching = false;
            try { sessionStorage.removeItem('modeSwitch'); } catch (err) { }
        });
    }

    if (!anim) return;

    /* ================= ANIMASI GSAP ================= */
    gsap.registerPlugin(ScrollTrigger);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);
    body.classList.add('is-locked');

    // Pecah teks menjadi kata supaya bisa muncul satu per satu
    function splitWords(el) {
        const out = [];
        const frag = document.createDocumentFragment();
        const wrap = content => {
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi';
            i.append(content); w.append(i); frag.append(w); out.push(i);
        };
        [...el.childNodes].forEach(n => {
            if (n.nodeType === 3) {
                n.textContent.split(/(\s+)/).forEach(part => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) frag.append(' ');
                    else wrap(part);
                });
            } else if (n.nodeName === 'BR') frag.append(n);
            else wrap(n);
        });
        el.replaceChildren(frag);
        return out;
    }

    /* ---------- Loader → intro hero ---------- */
    const loader = document.querySelector('.loader');
    const count = loader.querySelector('.loader-count');
    const counter = { v: 0 };

    gsap.set('.subject', { xPercent: -50, x: 0 });

    // Urutan animasi hero setelah loader selesai.
    // Angka paling akhir di tiap baris (0, 0.15, 0.35, ...) = detik mulai; "duration" = lama animasi.
    const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from('.frame', { clipPath: 'inset(50% 50% 50% 50%)', duration: 1.6, ease: 'expo.inOut' }, 0)
        .from('.title .ci', { yPercent: 115, duration: 1.4, stagger: 0.07 }, 0.15)
        .from('.subject', { y: 160, opacity: 0, duration: 1.8, ease: 'power4.out' }, 0.35)
        .from('.jp span', { yPercent: 120, opacity: 0, duration: 1, stagger: 0.08 }, 0.6)
        .from('.drips line', { strokeDashoffset: 1, duration: 1.3, stagger: 0.06, ease: 'power3.inOut' }, 0.5)
        .fromTo('.lenathea', { clipPath: 'inset(-30% 100% -30% -10%)' }, { clipPath: 'inset(-30% -10% -30% -10%)', duration: 1.8, ease: 'power2.inOut' }, 1.1)
        .from(['.intro', '.dated', '.news', '.question'], { y: 36, opacity: 0, duration: 1.2, stagger: 0.1 }, 0.9)
        .from('.scroll-cue', { opacity: 0, y: 20, duration: 1 }, 1.4)
        .from('.mode-switch', { opacity: 0, duration: 1 }, 1.4);

    // Animasi loader: hitungan 0 -> 100 dan bar progres berjalan selama 1.6 detik.
    // Ubah semua "duration: 1.6" pada blok ini untuk mempercepat / memperlambat loader.
    // Munculkan isi loader (disembunyikan CSS) pada saat yang sama animasinya dimulai: tidak ada kilatan.
    gsap.set('.loader-inner', { visibility: 'visible' });
    const loaderTl = gsap.timeline();
    if (fromSwitch && QUICK_LOADER_ON_SWITCH) {
        // Datang dari tombol switch (mode singkat): lewati hitungan, cukup buka tirai.
        gsap.set('.loader-inner', { opacity: 0 });
        loaderTl.to('.loader-panel', { yPercent: -100, duration: 1, stagger: 0.07, ease: 'expo.inOut' }, 0.1);
    } else {
        loaderTl
            .from('.loader-jp span', { yPercent: 110, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0)
            .to(counter, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => count.textContent = String(Math.round(counter.v)).padStart(3, '0') }, 0)
            .to('.loader-bar i', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
            .to('.loader-inner', { opacity: 0, y: -24, duration: 0.5, ease: 'power2.in' })
            .to('.loader-panel', { yPercent: -100, duration: 1, stagger: 0.07, ease: 'expo.inOut' });
    }
    loaderTl
        .add(() => intro.play(), '-=0.75')
        .add(() => { loader.remove(); body.classList.remove('is-locked'); ScrollTrigger.refresh(); });

    /* ---------- Hero: parallax mengikuti mouse ---------- */
    if (finePointer) {
        const bgX = gsap.quickTo('#parallax-bg', 'x', { duration: 1, ease: 'power3' });
        const bgY = gsap.quickTo('#parallax-bg', 'y', { duration: 1, ease: 'power3' });
        const sX = gsap.quickTo('#parallax-subject', 'x', { duration: 1.2, ease: 'power3' });
        const sY = gsap.quickTo('#parallax-subject', 'y', { duration: 1.2, ease: 'power3' });
        const lX = gsap.quickTo('.lenathea', 'x', { duration: 1.4, ease: 'power3' });
        addEventListener('mousemove', e => {
            // Kekuatan efek parallax: angka pembagi 60 (makin KECIL = gerakan makin BESAR).
            const x = (innerWidth / 2 - e.clientX) / 60;
            const y = (innerHeight / 2 - e.clientY) / 60;
            bgX(x * 0.5); bgY(y * 0.5);
            sX(-x); sY(-y * 0.3);
            lX(-x * 1.6);
        });
    }

    /* ---------- Hero: efek saat di-scroll keluar ---------- */
    // Pengaturan efek hero saat di-scroll keluar. Ubah angka yPercent / scale / opacity pada baris di bawah
    // untuk memperkuat atau memperlemah efek.
    const heroOut = { trigger: '.stage', start: 'top top', end: 'bottom top', scrub: true };
    // Huruf pada judul menyebar ke kiri-kanan saat di-scroll. Pusatnya dihitung otomatis,
    // jadi jumlah huruf nama boleh berapa saja (tidak harus 6).
    gsap.to('.title .ch', { x: (i, el, all) => (i - (all.length - 1) / 2) * innerWidth * 0.05, ease: 'none', scrollTrigger: { ...heroOut, invalidateOnRefresh: true } });
    gsap.to('.title', { yPercent: 30, ease: 'none', scrollTrigger: heroOut });
    gsap.to('.subject', { yPercent: 12, scale: 1.04, transformOrigin: '50% 100%', ease: 'none', scrollTrigger: heroOut });
    gsap.to('.layer-front', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { ...heroOut, end: '70% top' } });
    gsap.to('.frame', { scale: 0.94, opacity: 0, ease: 'none', scrollTrigger: heroOut });

    /* ---------- Marquee: arah mengikuti arah scroll ---------- */
    const mTrack = document.querySelector('.marquee-track');
    ScrollTrigger.create({ onUpdate: self => { mTrack.style.animationDirection = self.direction === 1 ? 'normal' : 'reverse'; } });
    gsap.fromTo('.marquee', { rotate: -2, scale: 1.06 }, { rotate: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* ---------- Reveal umum ---------- */
    gsap.utils.toArray('[data-reveal]').forEach(el => {
        gsap.from(el, { y: 40, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    gsap.utils.toArray('[data-split]').forEach(el => {
        gsap.from(splitWords(el), { yPercent: 115, duration: 1.3, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 85%' } });
    });

    /* ---------- Profil ---------- */
    const media = document.querySelector('.profile-media');
    gsap.fromTo('.profile-img', { clipPath: 'inset(100% 0 0 0)' }, {
        clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut',
        scrollTrigger: { trigger: media, start: 'top 80%', onEnter: () => media.classList.add('in') }
    });
    gsap.fromTo('.profile-img img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.profile-jp', { opacity: 0, y: -40, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: media, start: 'top 70%' } });
    gsap.from('.fact .rule', { scaleX: 0, duration: 1.2, ease: 'expo.inOut', stagger: 0.12, scrollTrigger: { trigger: '.facts', start: 'top 85%' } });
    gsap.from('.fact dt, .fact dd', { y: 20, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.3, scrollTrigger: { trigger: '.facts', start: 'top 85%' } });

    /* ---------- Aktivitas ---------- */
    gsap.utils.toArray('.act').forEach(row => {
        gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%' } })
            .from(row.querySelector('.rule'), { scaleX: 0, duration: 1.2, ease: 'expo.inOut' })
            .from(row.querySelectorAll('.act-num, .act-title, .act-desc, .act-arrow'), { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07 }, 0.25);
    });

    /* ---------- Quote: kata menyala mengikuti scroll ---------- */
    gsap.fromTo(splitWords(document.querySelector('.quote-text')), { opacity: 0.12, yPercent: 20 }, {
        opacity: 1, yPercent: 0, stagger: 0.15, ease: 'none',
        scrollTrigger: { trigger: '.quote-text', start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
    gsap.fromTo('.quote-bg', { xPercent: 0 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '.quote-sec', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.quote-sign', { clipPath: 'inset(-30% 100% -30% -10%)' }, {
        clipPath: 'inset(-30% -10% -30% -10%)', duration: 1.8, ease: 'power2.inOut',
        scrollTrigger: { trigger: '.quote-sign', start: 'top 90%' }
    });

    /* ---------- Galeri: scroll horizontal di layar lebar ---------- */
    const mm = gsap.matchMedia();
    const gallery = document.querySelector('.gallery');
    const gTrack = document.querySelector('.track');

    // Breakpoint galeri: >= 900px digeser horizontal (di-pin); di bawahnya muncul biasa.
    // Samakan angka 900 dengan CSS (.gallery.is-pinned & @media) jika diubah.
    mm.add('(min-width: 900px)', () => {
        gallery.classList.add('is-pinned');
        const distance = () => gTrack.scrollWidth - innerWidth;
        const move = gsap.to(gTrack, {
            x: () => -distance(), ease: 'none',
            scrollTrigger: { trigger: gallery, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 1, invalidateOnRefresh: true }
        });
        gsap.to('.gallery-progress i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: gallery, start: 'top top', end: () => '+=' + distance(), scrub: true } });
        gsap.utils.toArray('.panel-img img').forEach(img => {
            gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.panel'), containerAnimation: move, start: 'left right', end: 'right left', scrub: true } });
        });
        gsap.utils.toArray('.panel').forEach(p => {
            gsap.from(p, { yPercent: 8, rotate: 1.5, opacity: 0.3, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: move, start: 'left 105%', end: 'left 60%', scrub: true } });
        });
        return () => gallery.classList.remove('is-pinned');
    });
    mm.add('(max-width: 899px)', () => {
        gsap.from('.panel', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.track', start: 'top 85%' } });
    });

    /* ---------- Footer ---------- */
    gsap.from('.social', { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.socials', start: 'top 92%' } });
    gsap.from('.footer-giant .ci', { yPercent: 105, duration: 1.4, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '.footer-giant', start: 'top 98%' } });

    /* ---------- Efek magnet pada tombol ---------- */
    if (finePointer) {
        document.querySelectorAll('.btn, .to-top i, .act-arrow').forEach(el => {
            const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
            const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
            const host = el.closest('a, li') || el;
            host.addEventListener('mousemove', e => {
                const r = el.getBoundingClientRect();
                qx((e.clientX - (r.left + r.width / 2)) * 0.3);
                qy((e.clientY - (r.top + r.height / 2)) * 0.3);
            });
            host.addEventListener('mouseleave', () => { qx(0); qy(0); });
        });
    }

    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();