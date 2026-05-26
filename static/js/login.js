/* ============================================
   JUNO AI — Login / Register Page Logic
   Real email+password auth with SQLite backend
   ============================================ */

(function () {
    'use strict';

    // ─── Redirect if already logged in ─────────────────────────
    if (localStorage.getItem('juno_auth_token')) {
        window.location.replace('/chat');
        return;
    }

    // ─── DOM refs ──────────────────────────────────────────────
    const loginCard      = document.getElementById('loginCard');
    const loginView      = document.getElementById('loginView');
    const registerView   = document.getElementById('registerView');
    const transOverlay   = document.getElementById('transitionOverlay');
    const canvas         = document.getElementById('particlesCanvas');
    const toastContainer = document.getElementById('toastContainer');

    // Login form
    const loginForm       = document.getElementById('loginForm');
    const loginEmailInput = document.getElementById('loginEmailInput');
    const loginEmailGroup = document.getElementById('loginEmailGroup');
    const loginEmailError = document.getElementById('loginEmailError');
    const loginPwInput    = document.getElementById('loginPasswordInput');
    const loginPwGroup    = document.getElementById('loginPasswordGroup');
    const loginPwError    = document.getElementById('loginPasswordError');
    const loginPwToggle   = document.getElementById('loginPwToggle');
    const btnLogin        = document.getElementById('btnLogin');

    // Register form
    const registerForm    = document.getElementById('registerForm');
    const regNameInput    = document.getElementById('regNameInput');
    const regNameGroup    = document.getElementById('regNameGroup');
    const regEmailInput   = document.getElementById('regEmailInput');
    const regEmailGroup   = document.getElementById('regEmailGroup');
    const regPwInput      = document.getElementById('regPasswordInput');
    const regPwGroup      = document.getElementById('regPasswordGroup');
    const regPwToggle     = document.getElementById('regPwToggle');
    const regConfirmInput = document.getElementById('regConfirmInput');
    const regConfirmGroup = document.getElementById('regConfirmGroup');
    const regConfirmToggle= document.getElementById('regConfirmPwToggle');
    const strengthFill    = document.getElementById('strengthFill');
    const strengthLabel   = document.getElementById('strengthLabel');
    const btnRegister     = document.getElementById('btnRegister');

    // Toggle links
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink    = document.getElementById('showLogin');

    // Social buttons
    const btnGoogle = document.getElementById('btnGoogle');
    const btnApple  = document.getElementById('btnApple');
    const btnPhone  = document.getElementById('btnPhone');

    // Close button
    const loginCloseBtn = document.getElementById('loginCloseBtn');

    // ─── Toast Notifications ───────────────────────────────────
    function showToast(message, type = 'info', duration = 3500) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { info: 'fa-info-circle', success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle' };
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    }

    // ─── Particles Animation ───────────────────────────────────
    function initParticles() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];
        const COUNT = 45;

        function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        resize();
        window.addEventListener('resize', resize);

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() - 0.5) * 0.3;
                this.r = Math.random() * 2 + 0.5;
                this.o = Math.random() * 0.3 + 0.05;
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > canvas.width)  this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(165, 160, 255, ${this.o})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < COUNT; i++) particles.push(new Particle());

        function loop() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            // Connection lines
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(145, 140, 255, ${0.06 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(loop);
        }
        loop();
    }
    initParticles();

    // ─── Ripple Effect ─────────────────────────────────────────
    function addRipple(btn, e) {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top  = `${e.clientY - rect.top  - size / 2}px`;
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    }

    // ─── Helpers ───────────────────────────────────────────────
    function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

    function clearErrors(...groups) {
        groups.forEach(g => { if (g) g.classList.remove('error'); });
    }

    function setError(group, errorEl, msg) {
        if (errorEl) errorEl.textContent = msg;
        if (group) group.classList.add('error');
    }

    function setLoading(btn, loading) {
        if (loading) { btn.classList.add('loading'); btn.disabled = true; }
        else { btn.classList.remove('loading'); btn.disabled = false; }
    }

    // ─── Password Strength ─────────────────────────────────────
    function checkStrength(pw) {
        let score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 10) score++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        const levels = [
            { cls: '', label: '' },
            { cls: 'weak', label: 'Weak' },
            { cls: 'fair', label: 'Fair' },
            { cls: 'good', label: 'Good' },
            { cls: 'strong', label: 'Strong' },
            { cls: 'strong', label: 'Strong' }
        ];
        const level = levels[Math.min(score, 5)];
        strengthFill.className = `strength-fill ${level.cls}`;
        strengthLabel.textContent = level.label;
    }

    if (regPwInput) {
        regPwInput.addEventListener('input', () => {
            checkStrength(regPwInput.value);
            clearErrors(regPwGroup);
        });
    }

    // ─── Password Toggle ───────────────────────────────────────
    function setupPwToggle(toggleBtn, inputEl) {
        if (!toggleBtn || !inputEl) return;
        toggleBtn.addEventListener('click', () => {
            const isPassword = inputEl.type === 'password';
            inputEl.type = isPassword ? 'text' : 'password';
            toggleBtn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }
    setupPwToggle(loginPwToggle, loginPwInput);
    setupPwToggle(regPwToggle, regPwInput);
    setupPwToggle(regConfirmToggle, regConfirmInput);

    // ─── Clear errors on input ─────────────────────────────────
    if (loginEmailInput) loginEmailInput.addEventListener('input', () => clearErrors(loginEmailGroup));
    if (loginPwInput)    loginPwInput.addEventListener('input', () => clearErrors(loginPwGroup));
    if (regNameInput)    regNameInput.addEventListener('input', () => clearErrors(regNameGroup));
    if (regEmailInput)   regEmailInput.addEventListener('input', () => clearErrors(regEmailGroup));
    if (regConfirmInput) regConfirmInput.addEventListener('input', () => clearErrors(regConfirmGroup));

    // ─── Form Toggle (Login ↔ Register) ────────────────────────
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('auth-view--hidden');
        registerView.classList.remove('auth-view--hidden');
        registerView.style.animation = 'none';
        void registerView.offsetHeight;
        registerView.style.animation = 'fadeSlideUp 0.4s ease both';
        regNameInput.focus();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.classList.add('auth-view--hidden');
        loginView.classList.remove('auth-view--hidden');
        loginView.style.animation = 'none';
        void loginView.offsetHeight;
        loginView.style.animation = 'fadeSlideUp 0.4s ease both';
        loginEmailInput.focus();
    });

    // ─── Transition to Chatbot ─────────────────────────────────
    function transitionToChatbot() {
        loginCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        loginCard.style.opacity = '0';
        loginCard.style.transform = 'scale(0.95) translateY(-10px)';

        setTimeout(() => {
            transOverlay.classList.add('active');
            setTimeout(() => { window.location.href = '/chat'; }, 1500);
        }, 300);
    }

    // ─── LOGIN Submit ──────────────────────────────────────────
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors(loginEmailGroup, loginPwGroup);

        const email = loginEmailInput.value.trim();
        const password = loginPwInput.value;
        let hasError = false;

        if (!validateEmail(email)) {
            setError(loginEmailGroup, loginEmailError, 'Please enter a valid email address');
            hasError = true;
        }
        if (!password) {
            setError(loginPwGroup, loginPwError, 'Password is required');
            hasError = true;
        }
        if (hasError) return;

        setLoading(btnLogin, true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('juno_auth_token', data.token);
                localStorage.setItem('juno_user_email', data.email);
                localStorage.setItem('juno_user_name', data.name || data.email);
                showToast('Login successful!', 'success');
                setTimeout(() => transitionToChatbot(), 400);
            } else {
                showToast(data.error || 'Login failed', 'error');
                if (data.error && data.error.toLowerCase().includes('password')) {
                    setError(loginPwGroup, loginPwError, data.error);
                } else if (data.error && data.error.toLowerCase().includes('email')) {
                    setError(loginEmailGroup, loginEmailError, data.error);
                }
                setLoading(btnLogin, false);
            }
        } catch (err) {
            showToast('Connection error. Is the server running?', 'error');
            setLoading(btnLogin, false);
        }
    });

    // ─── REGISTER Submit ───────────────────────────────────────
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors(regNameGroup, regEmailGroup, regPwGroup, regConfirmGroup);

        const name     = regNameInput.value.trim();
        const email    = regEmailInput.value.trim();
        const password = regPwInput.value;
        const confirm  = regConfirmInput.value;
        let hasError   = false;

        if (!name) {
            setError(regNameGroup, document.getElementById('regNameError'), 'Name is required');
            hasError = true;
        }
        if (!validateEmail(email)) {
            setError(regEmailGroup, document.getElementById('regEmailError'), 'Please enter a valid email address');
            hasError = true;
        }
        if (!password || password.length < 6) {
            setError(regPwGroup, document.getElementById('regPasswordError'), 'Minimum 6 characters');
            hasError = true;
        }
        if (password !== confirm) {
            setError(regConfirmGroup, document.getElementById('regConfirmError'), 'Passwords do not match');
            hasError = true;
        }
        if (hasError) return;

        setLoading(btnRegister, true);

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('juno_auth_token', data.token);
                localStorage.setItem('juno_user_email', data.email);
                localStorage.setItem('juno_user_name', data.name || data.email);
                showToast('Account created successfully!', 'success');
                setTimeout(() => transitionToChatbot(), 400);
            } else {
                showToast(data.error || 'Registration failed', 'error');
                if (data.error && data.error.toLowerCase().includes('email')) {
                    setError(regEmailGroup, document.getElementById('regEmailError'), data.error);
                }
                setLoading(btnRegister, false);
            }
        } catch (err) {
            showToast('Connection error. Is the server running?', 'error');
            setLoading(btnRegister, false);
        }
    });

    // ─── Social Buttons → "Coming soon" ────────────────────────
    [btnGoogle, btnApple, btnPhone].forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            addRipple(btn, e);
            showToast('Coming soon — requires API keys', 'warning', 3000);
        });
    });

    // ─── Close Button (shake) ──────────────────────────────────
    loginCloseBtn.addEventListener('click', () => {
        loginCard.style.animation = 'none';
        void loginCard.offsetHeight;
        loginCard.style.animation = 'cardShake 0.4s ease';
    });

})();
