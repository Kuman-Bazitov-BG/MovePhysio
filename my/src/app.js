function normalizePath(pathname = '/') {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

function renderPageContent(pathname) {
  if (pathname === '/') {
    return `
      <section class="home-screen container">
        <div class="home-surface">
          <div class="hero-content">
            <p class="hero-kicker">Move Better. Recover Stronger.</p>
            <h1 class="hero-title">Personalized Physiotherapy for a Pain-Free Life</h1>
            <p class="hero-subtitle">
              Modern rehabilitation and movement care designed to help you return to sport,
              work, and everyday life with confidence.
            </p>

            <div class="hero-actions">
              <button id="hero-auth-btn" class="btn btn-primary btn-glow px-4 py-2">
                <i class="bi bi-person-plus-fill me-2"></i>Get Started
              </button>
              <button class="btn btn-outline-light px-4 py-2" disabled>
                <i class="bi bi-calendar2-week me-2"></i>Book Session (Soon)
              </button>
            </div>
          </div>
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
      <header class="site-header container py-4 py-md-5">
        <nav class="d-flex justify-content-between align-items-center gap-3 flex-wrap">
          <div class="brand-wrap">
            <div class="move-logo" aria-label="Move Physio logo">
              <span class="bar left one"></span>
              <span class="bar left two"></span>
              <span class="bar left three"></span>
              <span class="wordmark">Move</span>
              <span class="bar right three"></span>
              <span class="bar right two"></span>
              <span class="bar right one"></span>
            </div>
            <div class="physio-text">PHYSIO</div>
          </div>

          <div class="auth-actions d-flex align-items-center gap-2">
            <button id="auth-open-btn" class="btn btn-primary btn-glow px-4">
              <i class="bi bi-person-circle me-2"></i>Register / Login
            </button>
            <button id="logout-btn" class="btn btn-outline-light d-none">
              <i class="bi bi-box-arrow-right me-2"></i>Logout
            </button>
          </div>
        </nav>

        <nav class="site-nav nav nav-pills gap-2 mt-4" aria-label="Main navigation">
          <a href="/" data-nav class="nav-link ${currentPath === '/' ? 'active' : ''}">Home</a>
          <a href="/about" data-nav class="nav-link ${currentPath === '/about' ? 'active' : ''}">About</a>
          <a href="/services" data-nav class="nav-link ${currentPath === '/services' ? 'active' : ''}">Services</a>
          <a href="/contact" data-nav class="nav-link ${currentPath === '/contact' ? 'active' : ''}">Contact</a>
        </nav>
      </header>

      ${renderPageContent(currentPath)}
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
                  Register
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="login-tab" data-bs-toggle="tab" data-bs-target="#login-pane" type="button" role="tab" aria-controls="login-pane" aria-selected="false">
                  Login
                </button>
              </li>
            </ul>

            <div class="tab-content pt-3">
              <div class="tab-pane fade show active" id="register-pane" role="tabpanel" aria-labelledby="register-tab" tabindex="0">
                <form id="register-form" class="d-grid gap-3">
                  <div>
                    <label for="register-email" class="form-label">Email</label>
                    <input id="register-email" type="email" class="form-control" placeholder="you@example.com" required />
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
                    <label for="login-email" class="form-label">Email</label>
                    <input id="login-email" type="email" class="form-control" placeholder="you@example.com" required />
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
