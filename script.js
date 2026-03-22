
/* ═══════════════════════════════════════════════════════════════
   ZIPHILLMART — Global JavaScript (script.js)
   Auth: SHA-256 password hashing (client) + GAS verification
   Flow: Signup → hash password → store in Sheet
         Signin → hash password → GAS doGet verifies → dashboard
═══════════════════════════════════════════════════════════════ */

const GAS_URL      = 'https://script.google.com/macros/s/AKfycbxMKcqxhKK7vFGlTpr7Tb7vH8F15PVbkCzqtiV2Zl_eUMIV32_iBn5vJR6fFO0xqEw/exec';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 10 * 60 * 1000; // 10 min lockout

document.addEventListener('DOMContentLoaded', () => {

  /* ── Dynamic Date ── */
  const dateString = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.querySelectorAll('.dynamic-date').forEach(el => {
    el.textContent = `Today is ${dateString}`;
  });

  /* ── Progress Bar ── */
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const max = document.body.scrollHeight - window.innerHeight;
      progressBar.style.width = max > 0
        ? Math.min((window.scrollY / max) * 100, 100) + '%' : '0%';
    }, { passive: true });
  }

  /* ── Navbar shadow ── */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ── Left Drawer ── */
  const hamburgerBtn  = document.getElementById('hamburger-btn');
  const leftDrawer    = document.getElementById('left-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const drawerClose   = document.getElementById('drawer-close');
  let drawerIsOpen    = false;

  const openDrawer = () => {
    drawerIsOpen = true;
    leftDrawer?.classList.add('open');
    drawerOverlay?.classList.add('open');
    hamburgerBtn?.classList.add('active');
    hamburgerBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const closeDrawer = () => {
    drawerIsOpen = false;
    leftDrawer?.classList.remove('open');
    drawerOverlay?.classList.remove('open');
    hamburgerBtn?.classList.remove('active');
    hamburgerBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  hamburgerBtn?.addEventListener('click', () => drawerIsOpen ? closeDrawer() : openDrawer());
  drawerClose?.addEventListener('click',   closeDrawer);
  drawerOverlay?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawerIsOpen) closeDrawer();
  });

  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.drawer-link[data-page]').forEach(link => {
    if (link.dataset.page === currentFile) link.classList.add('active');
  });

  /* ── Search Toggle ── */
  const searchToggle = document.getElementById('search-toggle');
  const searchInput  = document.getElementById('search-input');
  let searchIsOpen   = false;

  if (searchToggle && searchInput) {
    const toggleSearch = (open) => {
      searchIsOpen = open ?? !searchIsOpen;
      searchInput.classList.toggle('open', searchIsOpen);
      const icon = searchToggle.querySelector('i');
      if (icon) icon.className = searchIsOpen
        ? 'fa-solid fa-xmark' : 'fa-solid fa-magnifying-glass';
      if (searchIsOpen) {
        setTimeout(() => searchInput.focus(), 380);
      } else {
        // Clear input and restore all hidden cards
        searchInput.value = '';
        document.querySelectorAll('.product-card').forEach(c => c.style.display = '');
        document.querySelectorAll('.search-no-results').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.prod-table tbody tr').forEach(r => r.style.display = '');
      }
    };
    searchToggle.addEventListener('click', () => toggleSearch());
    document.addEventListener('click', e => {
      const wrap = document.getElementById('search-wrap');
      if (searchIsOpen && wrap && !wrap.contains(e.target)) {
        // Don't auto-close if there's an active search query
        if (!searchInput.value.trim()) toggleSearch(false);
      }
    });
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();

      // Search product cards (dynamically rendered on index.html)
      document.querySelectorAll('.product-card').forEach(card => {
        const name    = card.querySelector('.card-name')?.textContent.toLowerCase()  || '';
        const cat     = card.querySelector('.card-cat')?.textContent.toLowerCase()   || '';
        const seller  = card.querySelector('.card-desc')?.textContent.toLowerCase()  || '';
        const matches = !q || name.includes(q) || cat.includes(q) || seller.includes(q);
        // Hide the card itself; keep grid layout clean with opacity+pointer trick
        card.style.display = matches ? '' : 'none';
      });

      // Show/hide "no results" hint per grid
      ['fruits-grid', 'vegetables-grid'].forEach(gridId => {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        const cards   = grid.querySelectorAll('.product-card');
        const visible = Array.from(cards).filter(c => c.style.display !== 'none');
        let noRes = grid.querySelector('.search-no-results');

        if (q && cards.length > 0 && visible.length === 0) {
          if (!noRes) {
            noRes = document.createElement('p');
            noRes.className = 'search-no-results';
            noRes.style.cssText = 'grid-column:1/-1;text-align:center;padding:2rem 1rem;font-size:0.85rem;color:var(--slate-700)';
            noRes.innerHTML = `<i class="fa-solid fa-magnifying-glass" style="display:block;font-size:1.5rem;color:var(--slate-700);margin-bottom:0.5rem"></i>No results for "<strong style="color:var(--slate-500)">${q}</strong>"`;
            grid.appendChild(noRes);
          } else {
            noRes.querySelector('strong').textContent = q;
            noRes.style.display = '';
          }
        } else if (noRes) {
          noRes.style.display = 'none';
        }
      });

      // Also filter seller's own products table on dashboard
      document.querySelectorAll('.prod-table tbody tr:not(.skel-row)').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = (!q || text.includes(q)) ? '' : 'none';
      });
    });
  }

  /* ── Back to Top ── */
  const backTop = document.getElementById('back-top');
  if (backTop) {
    window.addEventListener('scroll', () => {
      backTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ── Scroll Reveal ── */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    const ro = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay || 0) * 100;
          setTimeout(() => entry.target.classList.add('revealed'), delay);
          ro.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    revealEls.forEach(el => ro.observe(el));
  }

  /* ── File Upload drag & drop ── */
  document.querySelectorAll('.file-upload').forEach(area => {
    const input   = area.querySelector('input[type="file"]');
    const display = area.querySelector('.file-name-display');
    if (!input) return;
    area.addEventListener('click', () => input.click());
    const setFileName = files => {
      if (!files.length) return;
      if (display) display.textContent = Array.from(files).map(f => f.name).join(', ');
    };
    area.addEventListener('dragover',  e => { e.preventDefault(); area.style.borderColor = 'var(--lime)'; });
    area.addEventListener('dragleave', ()  => area.style.borderColor = '');
    area.addEventListener('drop', e => {
      e.preventDefault(); area.style.borderColor = '';
      const dt = new DataTransfer();
      Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
      input.files = dt.files;
      setFileName(input.files);
    });
    input.addEventListener('change', () => setFileName(input.files));
  });

  /* ── Hero Parallax ── */
  const hero = document.querySelector('.hero');
  if (hero) {
    window.addEventListener('scroll', () => {
      if (window.scrollY < window.innerHeight * 1.5)
        hero.style.backgroundPositionY = `calc(50% + ${window.scrollY * 0.25}px)`;
    }, { passive: true });
  }

  /* ── Password Visibility Toggle ── */
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      const icon = btn.querySelector('i');
      if (icon) icon.className = input.type === 'password'
        ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
    });
  });

  /* ── Password Strength Meter (signup only) ── */
  const pwInput     = document.getElementById('password');
  const strengthBar = document.getElementById('pw-strength-bar');
  const strengthTxt = document.getElementById('pw-strength-text');
  if (pwInput && strengthBar) {
    pwInput.addEventListener('input', () => {
      const r = getPasswordStrength(pwInput.value);
      strengthBar.style.width      = r.pct + '%';
      strengthBar.style.background = r.color;
      if (strengthTxt) {
        strengthTxt.textContent = pwInput.value ? r.label : '';
        strengthTxt.style.color = r.color;
      }
    });
  }

  /* ── Confirm Password match indicator ── */
  const confirmInput = document.getElementById('confirm-password');
  const matchHint    = document.getElementById('pw-match-hint');
  if (confirmInput && matchHint && pwInput) {
    const checkMatch = () => {
      if (!confirmInput.value) { matchHint.textContent = ''; return; }
      const match = confirmInput.value === pwInput.value;
      matchHint.textContent = match ? '✓ Passwords match' : '✗ Passwords do not match';
      matchHint.style.color = match ? 'var(--lime)' : '#ef4444';
    };
    confirmInput.addEventListener('input', checkMatch);
    pwInput.addEventListener('input', checkMatch);
  }

  /* ── Signup Form ── */
  const signupForm = document.getElementById('signup-form');
  if (signupForm) signupForm.addEventListener('submit', e => handleSignupSubmit(e));

  /* ── Signin Form ── */
  const signinForm = document.getElementById('signin-form');
  if (signinForm) signinForm.addEventListener('submit', e => handleSigninSubmit(e));

  /* ── Load real products on index page ── */
  if (document.getElementById('fruits-grid')) {
    loadProducts();
  }

  /* ── Verification Form ── */
  const verifyForm = document.getElementById('verify-form');
  if (verifyForm) {
    verifyForm.addEventListener('submit', e => {
      e.preventDefault();
      const btn = verifyForm.querySelector('button[type="submit"]');
      setButtonLoading(btn, true);
      setTimeout(() => {
        setButtonLoading(btn, false);
        showAlert('verify-alert', 'success',
          'Documents sent to admin! You will be notified on WhatsApp once verified.');
        btn.disabled = true;
      }, 1200);
    });
  }

  /* ── Dashboard auth guard + restore name ── */
  const hasDashEl = document.getElementById('dash-seller-name') ||
                    document.getElementById('dash-welcome-name');
  if (hasDashEl) {
    if (!sessionStorage.getItem('zm_auth_token')) {
      window.location.replace('signin.html');
      return;
    }
    // Load real products + status from GAS
    loadDashboard();
    // Wire up the Add New Product modal
    initAddProductModal();
  }

  /* ── Sign Out ── */
  document.querySelectorAll('.signout-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      sessionStorage.removeItem('zm_auth_token');
      sessionStorage.removeItem('zm_seller_name');
      window.location.href = 'signin.html';
    });
  });

}); // END DOMContentLoaded


/* ════════════════════════════════════════════════════════
   SHA-256 — native Web Crypto API, no library needed
════════════════════════════════════════════════════════ */
async function sha256(message) {
  const buf  = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}


/* ════════════════════════════════════════════════════════
   SIGNUP HANDLER
   - Validates all fields + password rules
   - Hashes password with SHA-256
   - Sends payload (hash, NOT plaintext) to GAS via fetch
   - Redirects to verification.html on success
════════════════════════════════════════════════════════ */
async function handleSignupSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('button[type="submit"]');

  const sellerName  = form.querySelector('#seller-name')?.value.trim();
  const mobile      = form.querySelector('#mobile')?.value.trim();
  const category    = form.querySelector('#category')?.value;
  const productName = form.querySelector('#product-name')?.value.trim();
  const price       = form.querySelector('#price')?.value.trim();
  const password    = form.querySelector('#password')?.value;
  const confirmPw   = form.querySelector('#confirm-password')?.value;
  const imageRef    = form.querySelector('#product-photo')?.files[0]?.name || 'no-image';

  // Validate required fields
  if (!sellerName || !mobile || !category || !productName || !price || !password || !confirmPw) {
    showAlert('signup-alert', 'error', 'Please fill in all required fields.'); return;
  }
  if (!/^\d{10}$/.test(mobile)) {
    showAlert('signup-alert', 'error', 'Enter a valid 10-digit mobile number.'); return;
  }
  if (password.length < 8) {
    showAlert('signup-alert', 'error', 'Password must be at least 8 characters.'); return;
  }
  if (getPasswordStrength(password).score < 2) {
    showAlert('signup-alert', 'error', 'Password too weak. Add uppercase letters, numbers or symbols.'); return;
  }
  if (password !== confirmPw) {
    showAlert('signup-alert', 'error', 'Passwords do not match.'); return;
  }

  setButtonLoading(btn, true);
  hideAlert('signup-alert');

  // Hash BEFORE sending — plaintext never leaves the browser
  const passwordHash = await sha256(password);

  sessionStorage.setItem('zm_seller_name', sellerName);

  const payload = {
    action: 'register',
    timestamp: new Date().toISOString(),
    sellerName, mobile, category, productName,
    price: parseFloat(price),
    imageRef,
    passwordHash   // ← SHA-256 hash only
  };

  try {
    await fetch(GAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      mode:    'no-cors' // required for GAS
    });
    setButtonLoading(btn, false);
    showAlert('signup-alert', 'success', 'Registered! Redirecting to verification…');
    setTimeout(() => { window.location.href = 'verification.html'; }, 1500);

  } catch (err) {
    setButtonLoading(btn, false);
    if (GAS_URL.includes('YOUR_GOOGLE')) {
      showAlert('signup-alert', 'info', 'Demo mode: GAS URL not configured. Redirecting anyway…');
      setTimeout(() => { window.location.href = 'verification.html'; }, 1800);
    } else {
      showAlert('signup-alert', 'error', 'Network error. Please try again.');
    }
  }
}


/* ════════════════════════════════════════════════════════
   SIGNIN HANDLER
   - Hashes entered password with SHA-256
   - Calls GAS doGet?action=login&mobile=X&hash=Y
   - GAS looks up mobile in Sheet, compares hashes
   - Returns { success: true/false, sellerName, message }
   - Wrong password shows error + tracks failed attempts
   - 5 failed attempts = 10 min lockout (stored in localStorage)
════════════════════════════════════════════════════════ */
async function handleSigninSubmit(e) {
  e.preventDefault();
  const form     = e.target;
  const btn      = form.querySelector('button[type="submit"]');
  const mobile   = form.querySelector('#signin-mobile')?.value.trim();
  const password = form.querySelector('#signin-password')?.value;

  if (!mobile || !password) {
    showAlert('signin-alert', 'error', 'Please enter your mobile number and password.'); return;
  }
  if (!/^\d{10}$/.test(mobile)) {
    showAlert('signin-alert', 'error', 'Enter a valid 10-digit mobile number.'); return;
  }

  // Brute-force lockout check
  const lockoutKey  = `zm_lockout_${mobile}`;
  const attemptsKey = `zm_attempts_${mobile}`;
  const lockedUntil = parseInt(localStorage.getItem(lockoutKey) || '0');

  if (Date.now() < lockedUntil) {
    const mins = Math.ceil((lockedUntil - Date.now()) / 60000);
    showAlert('signin-alert', 'error',
      `<i class="fa-solid fa-lock"></i> Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);
    return;
  }

  setButtonLoading(btn, true);
  hideAlert('signin-alert');

  const passwordHash = await sha256(password);

  /* ── DEMO MODE ── */
  if (GAS_URL.includes('YOUR_GOOGLE')) {
    if (password.length >= 8) {
      sessionStorage.setItem('zm_auth_token', 'demo_' + Date.now());
      const name = sessionStorage.getItem('zm_seller_name') || 'Seller';
      sessionStorage.setItem('zm_seller_name', name);
      sessionStorage.setItem('zm_seller_mobile', mobile);  // store for dashboard
      localStorage.removeItem(attemptsKey);
      localStorage.removeItem(lockoutKey);
      setButtonLoading(btn, false);
      showAlert('signin-alert', 'success', `Demo mode: Welcome, ${name}! Redirecting…`);
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
    } else {
      setButtonLoading(btn, false);
      showAlert('signin-alert', 'error', 'Demo mode: Password must be 8+ characters.');
    }
    return;
  }

  /* ── REAL GAS VERIFICATION ── */
  try {
    const url = `${GAS_URL}?action=login`
      + `&mobile=${encodeURIComponent(mobile)}`
      + `&hash=${encodeURIComponent(passwordHash)}`;

    const res  = await fetch(url);       // doGet is readable (not no-cors)
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.success === true) {
      // ✅ Correct password — grant access
      localStorage.removeItem(attemptsKey);
      localStorage.removeItem(lockoutKey);

      const token = await sha256(mobile + Date.now());
      sessionStorage.setItem('zm_auth_token',  token);
      sessionStorage.setItem('zm_seller_name', data.sellerName || 'Seller');
      sessionStorage.setItem('zm_seller_mobile', mobile);  // store for dashboard use

      setButtonLoading(btn, false);
      showAlert('signin-alert', 'success', `Welcome back, ${data.sellerName}! Redirecting…`);
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);

    } else {
      // ❌ Wrong credentials — track attempts
      const attempts = parseInt(localStorage.getItem(attemptsKey) || '0') + 1;
      localStorage.setItem(attemptsKey, attempts);

      const remaining = MAX_ATTEMPTS - attempts;
      setButtonLoading(btn, false);

      if (attempts >= MAX_ATTEMPTS) {
        localStorage.setItem(lockoutKey, Date.now() + LOCKOUT_MS);
        localStorage.removeItem(attemptsKey);
        showAlert('signin-alert', 'error',
          '<i class="fa-solid fa-lock"></i> Too many failed attempts. Account locked for 10 minutes.');
      } else {
        showAlert('signin-alert', 'error',
          `Incorrect mobile or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
      }
    }

  } catch (err) {
    console.error('Signin error:', err);
    setButtonLoading(btn, false);
    showAlert('signin-alert', 'error', 'Could not reach server. Check your connection and try again.');
  }
}


/* ════════════════════════════════════════════════════════
   PASSWORD STRENGTH
════════════════════════════════════════════════════════ */
function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (pw.length >= 12)          score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  const levels = [
    { label: 'Very Weak',   color: '#ef4444', pct: 15 },
    { label: 'Weak',        color: '#f97316', pct: 30 },
    { label: 'Fair',        color: '#eab308', pct: 55 },
    { label: 'Strong',      color: '#22c55e', pct: 80 },
    { label: 'Very Strong', color: '#A4E61D', pct: 100 }
  ];
  return { ...levels[Math.min(score, 4)], score };
}


/* ════════════════════════════════════════════════════════
   SHARED UTILITIES
════════════════════════════════════════════════════════ */
function setButtonLoading(btn, loading) {
  if (!btn) return;
  const spinner = btn.querySelector('.btn-spinner');
  const text    = btn.querySelector('.btn-text');
  btn.disabled  = loading;
  btn.classList.toggle('loading', loading);
  if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
  if (text && loading) text.textContent = 'Please wait…';
}

function showAlert(id, type, html) {
  const el = document.getElementById(id);
  if (!el) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  el.className = `alert alert-${type} show`;
  el.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-circle-info'}"></i><span>${html}</span>`;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'alert';
}


/* ════════════════════════════════════════════════════════
   LOAD REAL PRODUCTS — index.html
   Fetches verified sellers from GAS and renders cards.
   Shows empty state per category if none registered yet.
════════════════════════════════════════════════════════ */
async function loadProducts() {
  // Show skeletons while loading (already in HTML)

  /* ── Demo / GAS not configured ── */
  if (GAS_URL.includes('YOUR_GOOGLE')) {
    renderEmptyState('fruits-grid',     'fruits');
    renderEmptyState('vegetables-grid', 'vegetables');
    updateLiveCount(0);
    updateHeroStat(0);
    return;
  }

  try {
    const url  = `${GAS_URL}?action=getProducts`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'Failed to load products');

    const fruits     = data.fruits     || [];
    const vegetables = data.vegetables || [];
    const total      = fruits.length + vegetables.length;

    renderProductGrid('fruits-grid',     fruits,     'Fruits');
    renderProductGrid('vegetables-grid', vegetables, 'Vegetables');

    updateLiveCount(total);
    updateHeroStat(total);

  } catch (err) {
    console.error('loadProducts error:', err);
    renderErrorState('fruits-grid');
    renderErrorState('vegetables-grid');
  }
}


/* ── Render a grid of real product cards ── */
function renderProductGrid(gridId, products, categoryLabel) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  if (!products.length) {
    renderEmptyState(gridId, categoryLabel);
    return;
  }

  grid.innerHTML = products.map((p, i) => `
    <div class="product-card" data-reveal data-delay="${(i % 4) + 1}">
      <div class="card-img">
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;
                    background:linear-gradient(135deg,var(--forest),var(--forest-mid));font-size:3rem">
          ${getCategoryEmoji(p.category)}
        </div>
        <span class="card-badge">Verified</span>
      </div>
      <div class="card-body">
        <p class="card-cat">${escHtml(p.category)}</p>
        <h3 class="card-name">${escHtml(p.productName)}</h3>
        <p class="card-desc">
          <i class="fa-solid fa-user" style="font-size:0.65rem;color:var(--slate-700);margin-right:0.3rem"></i>
          by ${escHtml(p.sellerName)}
        </p>
        <div class="card-footer-row">
          <div class="card-price"><sup>₹</sup>${Number(p.price).toLocaleString('en-IN')} <small>/kg</small></div>
          <a href="https://wa.me/91${escHtml(p.mobile)}?text=${encodeURIComponent(
            `Hi! I want to order ${p.productName} from ZiphillMart. Please share details.`
          )}" class="btn btn-wa" target="_blank" rel="noopener">
            <i class="fa-brands fa-whatsapp"></i>Buy
          </a>
        </div>
      </div>
    </div>
  `).join('');

  // Trigger scroll reveal on new cards
  grid.querySelectorAll('[data-reveal]').forEach(el => {
    setTimeout(() => el.classList.add('revealed'),
      parseInt(el.dataset.delay || 0) * 100);
  });
}


/* ── Empty state when no products in that category ── */
function renderEmptyState(gridId, categoryLabel) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const isFruit = String(categoryLabel).toLowerCase().includes('fruit');
  grid.innerHTML = `
    <div class="products-state">
      <div class="products-state-icon">${isFruit ? '🍑' : '🥦'}</div>
      <div class="products-state-title">No ${isFruit ? 'fruits' : 'vegetables'} listed yet</div>
      <div class="products-state-sub">
        Be the first verified ${isFruit ? 'fruit' : 'vegetable'} seller on ZiphillMart!
        <br/><br/>
        <a href="signup.html" class="btn btn-ghost btn-sm" style="display:inline-flex">
          <i class="fa-solid fa-user-plus"></i>Register as Seller
        </a>
      </div>
    </div>`;
}


/* ── Error state ── */
function renderErrorState(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = `
    <div class="products-state">
      <div class="products-state-icon" style="color:#f87171">
        <i class="fa-solid fa-circle-xmark"></i>
      </div>
      <div class="products-state-title" style="color:#f87171">Could not load products</div>
      <div class="products-state-sub">
        <button onclick="loadProducts()" class="btn btn-ghost btn-sm" style="display:inline-flex;margin-top:0.5rem">
          <i class="fa-solid fa-rotate-right"></i>Retry
        </button>
      </div>
    </div>`;
}


/* ── Update the "X Live" badge in the section heading ── */
function updateLiveCount(total) {
  const badge = document.getElementById('live-count');
  const num   = document.getElementById('live-count-num');
  if (badge && num) {
    num.textContent = total;
    badge.style.display = 'inline-flex';
  }
}


/* ── Update hero stat number ── */
function updateHeroStat(total) {
  const el = document.getElementById('hero-stat-sellers');
  if (el) el.textContent = total > 0 ? total + '+' : '0';
}


/* ── Emoji per category ── */
function getCategoryEmoji(category) {
  const c = String(category).toLowerCase();
  if (c.includes('fruit'))     return '🍑';
  if (c.includes('vegetable')) return '🥦';
  return '🌿';
}


/* ── HTML escape helper (used in product cards) ── */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


/* ════════════════════════════════════════════════════════
   DASHBOARD — Load seller's own products + status
════════════════════════════════════════════════════════ */
async function loadDashboard() {
  const mobile = sessionStorage.getItem('zm_seller_mobile');
  const name   = sessionStorage.getItem('zm_seller_name') || 'Seller';

  // Restore names
  ['dash-seller-name', 'dash-welcome-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = name;
  });
  const av = document.getElementById('dash-avatar');
  if (av) av.textContent = name.charAt(0).toUpperCase();

  // Demo mode — no GAS connected
  if (!mobile || GAS_URL.includes('YOUR_GOOGLE')) {
    renderDashboardStatus('Pending', []);
    return;
  }

  try {
    const url  = `${GAS_URL}?action=getMyProducts&mobile=${encodeURIComponent(mobile)}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.success) {
      renderDashboardStatus(data.accountStatus, data.products || []);
    } else {
      renderDashboardStatus('Pending', []);
    }
  } catch (err) {
    console.error('loadDashboard error:', err);
    renderDashboardStatus('Pending', []);
  }
}

/* ── Render status notice + products table + button visibility ── */
function renderDashboardStatus(accountStatus, products) {
  const isVerified = accountStatus === 'Verified';
  const notice     = document.getElementById('status-notice');
  const addBtn     = document.getElementById('add-product-btn');
  const tableBtn   = document.getElementById('table-add-btn');
  const sidebarBtn = document.getElementById('sidebar-add-btn');
  const statusRow  = document.getElementById('dash-status-row');
  const statusTxt  = document.getElementById('dash-status-text');

  // Update sidebar status dot
  if (statusRow) {
    const dot = statusRow.querySelector('.status-dot');
    if (dot) {
      dot.className = `status-dot ${isVerified ? 'dot-verified' : 'dot-pending'}`;
    }
    if (statusTxt) statusTxt.textContent = isVerified ? 'Verified Seller' : 'Pending Verification';
  }

  // Account status stat card
  const acStat = document.getElementById('stat-account-status');
  if (acStat) {
    acStat.textContent   = accountStatus;
    acStat.style.color   = isVerified ? '#4ade80' : '#fbbf24';
    acStat.style.fontSize = '0.9rem';
  }

  // Show "Add New Product" button only when verified
  if (isVerified) {
    addBtn?.style.setProperty('display', 'inline-flex', 'important');
    tableBtn?.style.setProperty('display', 'inline-flex', 'important');
    sidebarBtn?.style.setProperty('display', 'flex', 'important');
  }

  // Status notice
  if (notice) {
    if (isVerified) {
      notice.innerHTML = `
        <div class="notice notice-success">
          <i class="fa-solid fa-circle-check"></i>
          <div class="notice-text">
            <strong>Account Verified ✓</strong>
            Your products are live on ZiphillMart. Use the
            <strong style="color:var(--lime)">"Add New Product"</strong>
            button to list more items — each new product will need a quick admin review before going live.
          </div>
        </div>`;
    } else {
      notice.innerHTML = `
        <div class="notice notice-warn">
          <i class="fa-solid fa-clock"></i>
          <div class="notice-text">
            <strong>Account Pending Verification</strong>
            Our admin will verify your account within 24 hours. After verification,
            your products will go live and you can add more.
            <a href="https://wa.me/917983447349?text=Hi!%20I%20registered%20on%20ZiphillMart.%20Please%20check%20my%20verification%20status."
               target="_blank" rel="noopener"
               style="color:var(--lime);font-weight:600;display:inline-block;margin-top:0.4rem">
              <i class="fa-brands fa-whatsapp" style="margin-right:0.25rem"></i>Check Status on WhatsApp →
            </a>
          </div>
        </div>`;
    }
  }

  // Stats
  const live    = products.filter(p => p.status === 'Verified').length;
  const pending = products.filter(p => p.status === 'Pending').length;
  const el = id => document.getElementById(id);
  if (el('stat-product-count'))  el('stat-product-count').textContent  = products.length;
  if (el('stat-verified-count')) el('stat-verified-count').textContent = live;
  if (el('stat-pending-count'))  el('stat-pending-count').textContent  = pending;

  // Products table
  renderProductsTable(products);
}

/* ── Render the seller's own products table ── */
function renderProductsTable(products) {
  const area = document.getElementById('products-area');
  if (!area) return;

  if (!products.length) {
    area.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-box-open"></i></div>
        <div class="empty-title">No products verified yet.</div>
        <div class="empty-sub">
          Once admin verifies your account, your products will appear here.
        </div>
        <a href="https://wa.me/917983447349?text=Hi!%20Please%20verify%20my%20ZiphillMart%20account."
           class="btn btn-ghost btn-sm" style="margin-top:1.1rem" target="_blank" rel="noopener">
          <i class="fa-brands fa-whatsapp"></i>Contact Admin
        </a>
      </div>`;
    return;
  }

  const rows = products.map((p, i) => {
    const statusCls = `s-pill s-${p.status || 'Pending'}`;
    const date = p.timestamp
      ? new Date(p.timestamp).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })
      : '—';
    return `
      <tr>
        <td><span class="prod-name">${escHtml(p.productName)}</span></td>
        <td>${escHtml(p.category)}</td>
        <td class="prod-price">₹${Number(p.price).toLocaleString('en-IN')}</td>
        <td><span class="${statusCls}">${p.status || 'Pending'}</span></td>
        <td style="font-size:0.72rem;color:var(--slate-700)">${date}</td>
      </tr>`;
  }).join('');

  area.innerHTML = `
    <div style="overflow-x:auto">
      <table class="prod-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price / kg</th>
            <th>Status</th>
            <th>Added</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}


/* ════════════════════════════════════════════════════════
   ADD NEW PRODUCT MODAL
════════════════════════════════════════════════════════ */
function initAddProductModal() {
  const modal      = document.getElementById('add-product-modal');
  const openBtns   = [
    document.getElementById('add-product-btn'),
    document.getElementById('table-add-btn'),
    document.getElementById('sidebar-add-btn')
  ];
  const closeBtn   = document.getElementById('modal-close-btn');
  const cancelBtn  = document.getElementById('modal-cancel-btn');
  const form       = document.getElementById('add-product-form');

  if (!modal) return;

  const openModal  = () => {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('new-product-name')?.focus();
  };
  const closeModal = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    form?.reset();
    const disp = form?.querySelector('.file-name-display');
    if (disp) disp.textContent = '';
    hideAlert('modal-alert');
  };

  openBtns.forEach(btn => btn?.addEventListener('click', openModal));
  closeBtn?.addEventListener('click',  closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

  // Form submission
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn      = form.querySelector('button[type="submit"]');
    const category = document.getElementById('new-category')?.value;
    const prodName = document.getElementById('new-product-name')?.value.trim();
    const price    = document.getElementById('new-price')?.value.trim();
    const photo    = document.getElementById('new-product-photo')?.files[0];
    const mobile   = sessionStorage.getItem('zm_seller_mobile');

    // Validation
    if (!category || !prodName || !price) {
      showAlert('modal-alert', 'error', 'Please fill in all required fields.'); return;
    }
    if (!mobile) {
      showAlert('modal-alert', 'error', 'Session expired. Please sign in again.'); return;
    }

    setButtonLoading(btn, true);
    hideAlert('modal-alert');

    // Demo mode
    if (GAS_URL.includes('YOUR_GOOGLE')) {
      setTimeout(() => {
        setButtonLoading(btn, false);
        showAlert('modal-alert', 'success', `Demo: "${prodName}" submitted! (Connect GAS to save for real.)`);
        setTimeout(closeModal, 2000);
      }, 1000);
      return;
    }

    // Real GAS call
    try {
      const url = `${GAS_URL}?action=addProduct`
        + `&mobile=${encodeURIComponent(mobile)}`
        + `&category=${encodeURIComponent(category)}`
        + `&productName=${encodeURIComponent(prodName)}`
        + `&price=${encodeURIComponent(price)}`
        + `&imageRef=${encodeURIComponent(photo?.name || 'no-image')}`;

      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setButtonLoading(btn, false);

      if (data.success) {
        showAlert('modal-alert', 'success', data.message || 'Product submitted!');
        setTimeout(() => {
          closeModal();
          loadDashboard(); // refresh the table
        }, 1800);
      } else {
        showAlert('modal-alert', 'error', data.message || 'Failed to submit.');
      }
    } catch (err) {
      setButtonLoading(btn, false);
      showAlert('modal-alert', 'error', 'Network error. Please try again.');
    }
  });
}