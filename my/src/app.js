function normalizePath(pathname = '/') {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

function renderPageContent(pathname) {
  if (pathname === '/') {
    return `
      <section class="home-screen container">
        <div class="home-stage">
          <a href="/physiotherapy" data-nav class="physio-shortcut text-decoration-none" aria-label="Open Physiotherapy page">
            <img src="/physiotherapy-joints.webp" alt="Physiotherapy" class="physio-shortcut-image" />
            <span class="physio-shortcut-title">Physiotherapy</span>
          </a>
          <div class="home-surface"></div>
          <a href="/pilates" data-nav class="pilates-shortcut text-decoration-none" aria-label="Open Pilates page">
            <img src="/pilates-training.webp" alt="Pilates" class="physio-shortcut-image" />
            <span class="physio-shortcut-title">Pilates</span>
          </a>
        </div>
      </section>
    `
  }

  if (pathname === '/about') {
    return `
      <section class="page-screen container">
        <div class="page-surface">
          <h1 class="page-title">About Move Physio</h1>
          <p class="page-copy">
            We focus on evidence-based rehabilitation, movement quality, and long-term health outcomes.
            Every therapy plan is personalized to your goals, your daily demands, and your recovery timeline.
          </p>
        </div>
      </section>
    `
  }

  if (pathname === '/services') {
    return `
      <section class="page-screen container">
        <div class="page-surface">
          <h1 class="page-title">Services</h1>
          <p class="page-copy mb-2">Our current core services include:</p>
          <ul class="page-list mb-0">
            <li>Musculoskeletal assessments and treatment</li>
            <li>Post-surgery rehabilitation plans</li>
            <li>Sports injury recovery and return-to-play support</li>
            <li>Posture and movement optimization programs</li>
          </ul>
        </div>
      </section>
    `
  }

  if (pathname === '/physiotherapy') {
    return `
      <section class="page-screen container">
        <div class="page-surface">
          <h1 class="page-title">Physiotherapy</h1>
          <p class="page-copy mb-2">
            Our physiotherapy services focus on restoring movement, reducing pain, and improving overall function.
            We use evidence-based techniques tailored to your specific needs.
          </p>
          <ul class="page-list mb-0">
            <li>Manual therapy and soft tissue mobilization</li>
            <li>Exercise prescription and rehabilitation programs</li>
            <li>Sports injury assessment and treatment</li>
            <li>Post-operative rehabilitation</li>
            <li>Pain management strategies</li>
          </ul>

          <div class="service-manager mt-4" data-service-manager="physiotherapy">
            <div class="service-card mb-3">
              <h2 class="service-card-title">Appointment Calendar</h2>
              <p class="service-note" data-appointments-status></p>
              <div data-appointments-list></div>
            </div>
          </div>
        </div>
      </section>
    `
  }

  if (pathname === '/pilates') {
    return `
      <section class="page-screen container">
        <div class="page-surface">
          <h1 class="page-title">Pilates</h1>
          <p class="page-copy mb-2">
            Our Pilates sessions combine core strengthening, flexibility, and mindful movement to enhance
            body awareness and functional strength for everyday activities.
          </p>
          <ul class="page-list mb-0">
            <li>Mat and equipment-based Pilates sessions</li>
            <li>Clinical Pilates for injury recovery</li>
            <li>One-on-one and small group classes</li>
            <li>Specialized programs for athletes</li>
            <li>Pre and postnatal Pilates</li>
          </ul>

          <div class="service-manager mt-4" data-service-manager="pilates">
            <div class="service-card mb-3">
              <h2 class="service-card-title">Appointment Calendar</h2>
              <p class="service-note" data-appointments-status></p>
              <div data-appointments-list></div>
            </div>
          </div>
        </div>
      </section>
    `
  }

  if (pathname === '/contact') {
    return `
      <section class="page-screen container">
        <div class="page-surface">
          <h1 class="page-title">Contact</h1>
          <p class="page-copy mb-0">
            Reach us at <strong>contact@movephysio.com</strong> or call <strong>+359 000 000 000</strong>.
            Online booking is coming soon.
          </p>
        </div>
      </section>
    `
  }

  return `
    <section class="page-screen container">
      <div class="page-surface">
        <h1 class="page-title">Page Not Found</h1>
        <p class="page-copy">
          The page you requested does not exist. Return to
          <a href="/" data-nav class="text-info-emphasis">home</a>.
        </p>
      </div>
    </section>
  `
}

export function renderApp(pathname = '/') {
  const currentPath = normalizePath(pathname)

  return `
    <canvas id="live-bg-canvas" class="live-bg-canvas"></canvas>

    <main class="site-shell">
      <header class="site-header container py-3 py-md-4">
        <nav class="header-nav d-flex justify-content-between align-items-center gap-3">
          <div class="brand-wrap">
            <a href="/" data-nav class="logo-link">
              <div class="move-logo" aria-label="Move Physio logo">
                <span class="bar left one"></span>
                <span class="bar left two"></span>
                <span class="bar left three"></span>
                <span class="wordmark">Move</span>
                <span class="bar right three"></span>
                <span class="bar right two"></span>
                <span class="bar right one"></span>
              </div>
            </a>
          </div>

          <a
            href="/"
            data-nav
            class="gesy-logo-link rounded-4 bg-white shadow-sm p-1"
            aria-label="GESY logo"
          >
            <img src="/gesi-gesy_logo_cover.jpg" alt="GESY logo" class="gesy-logo img-fluid rounded-3" />
          </a>

          <nav class="site-nav nav nav-pills gap-2" aria-label="Main navigation">
            <a href="/" data-nav class="nav-link ${currentPath === '/' ? 'active' : ''}">Home</a>
            <a href="/physiotherapy" data-nav class="nav-link ${currentPath === '/physiotherapy' ? 'active' : ''}">Physiotherapy</a>
            <a href="/pilates" data-nav class="nav-link ${currentPath === '/pilates' ? 'active' : ''}">Pilates</a>
            <a href="/about" data-nav class="nav-link ${currentPath === '/about' ? 'active' : ''}">About</a>
            <a href="/contact" data-nav class="nav-link ${currentPath === '/contact' ? 'active' : ''}">Contact</a>
          </nav>

          <div class="auth-actions d-flex align-items-center gap-2">
            <a href="/admin.html" id="admin-btn" class="btn auth-pill-btn d-none">
              <i class="bi bi-shield-check action-icon me-2" aria-hidden="true"></i>Adnim Pannel
            </a>
            <button id="auth-open-btn" class="btn auth-pill-btn">
              <i class="bi bi-person-plus-fill action-icon me-2" aria-hidden="true"></i>Register / Login
            </button>
            <button id="logout-btn" class="btn auth-pill-btn d-none">
              Logout
            </button>
          </div>
        </nav>
      </header>

      ${renderPageContent(currentPath)}

      <footer class="site-footer container py-4">
        <div class="footer-content text-center">
          <p class="mb-2">&copy; ${new Date().getFullYear()} Move Physio & Pilates. All rights reserved.</p>
          <p class="mb-0 text-subtle">Christoforos Stavrou | <a href="tel:+35794604515" class="footer-link">+357 94604515</a> | <a href="https://instagram.com/move.physio.pilates" target="_blank" class="footer-link">@move.physio.pilates</a></p>
        </div>
      </footer>
    </main>

    <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content auth-modal">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title" id="authModalLabel">Welcome to Move Physio</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body pt-3">
            <ul class="nav nav-tabs auth-tabs" id="authTabs" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="register-tab" data-bs-toggle="tab" data-bs-target="#register-pane" type="button" role="tab" aria-controls="register-pane" aria-selected="true">
                  <i class="bi bi-person-plus-fill action-icon me-2" aria-hidden="true"></i>Register
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="login-tab" data-bs-toggle="tab" data-bs-target="#login-pane" type="button" role="tab" aria-controls="login-pane" aria-selected="false">
                  <i class="bi bi-box-arrow-in-right action-icon me-2" aria-hidden="true"></i>Login
                </button>
              </li>
            </ul>

            <div class="tab-content pt-3">
              <div class="tab-pane fade show active" id="register-pane" role="tabpanel" aria-labelledby="register-tab" tabindex="0">
                <form id="register-form" class="d-grid gap-3">
                  <div>
                    <label for="register-username" class="form-label">Username</label>
                    <input id="register-username" type="text" class="form-control" placeholder="Choose a username" required />
                  </div>
                  <div>
                    <label for="register-contact" class="form-label">Phone Number or Email</label>
                    <input id="register-contact" type="text" class="form-control" placeholder="+357... or you@example.com" required />
                  </div>
                  <div>
                    <label for="register-password" class="form-label">Password</label>
                    <input id="register-password" type="password" class="form-control" placeholder="Create a secure password" minlength="6" required />
                  </div>
                  <button type="submit" class="btn btn-primary btn-glow w-100">Create Account</button>
                </form>
              </div>

              <div class="tab-pane fade" id="login-pane" role="tabpanel" aria-labelledby="login-tab" tabindex="0">
                <form id="login-form" class="d-grid gap-3">
                  <div>
                    <label for="login-contact" class="form-label">Phone Number or Email</label>
                    <input id="login-contact" type="text" class="form-control" placeholder="+357... or you@example.com" required />
                  </div>
                  <div>
                    <label for="login-password" class="form-label">Password</label>
                    <input id="login-password" type="password" class="form-control" placeholder="Your password" required />
                  </div>
                  <button type="submit" class="btn btn-primary btn-glow w-100">Sign In</button>
                </form>
              </div>
            </div>

            <p id="auth-status" class="auth-status mt-3 mb-0" role="status" aria-live="polite"></p>
          </div>
        </div>
      </div>
    </div>
  `
}
