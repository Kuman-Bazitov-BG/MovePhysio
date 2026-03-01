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
      <section class="page-screen container position-relative about-section">
        <div class="page-surface overflow-hidden position-relative p-md-5 z-1 mt-4">
          <!-- Floating Clouds Background Effects (Moved Inside Surface to prevent shadow bleed) -->
          <div class="clouds-bg-wrapper position-absolute w-100 h-100 top-0 start-0 overflow-hidden" style="pointer-events: none; z-index: 0; border-radius: var(--radius-lg);">
            <div class="cloud-blob blur-blob-1"></div>
            <div class="cloud-blob blur-blob-2"></div>
          </div>
          
          <div class="text-center mb-5 position-relative z-1">
              <h1 class="page-title display-4 fw-bold mb-3 slide-up-fade">
                <i class="bi bi-activity text-accent me-2"></i>About Move Physio
              </h1>
              <p class="page-copy lead mb-4 slide-up-fade" style="animation-delay: 0.1s;">
                Bridging clinical precision with intelligent movement.<br/> Experience the synergy of Physiotherapy and Pilates for long-term health.
              </p>
              
              <!-- Clouds / Tags -->
              <div class="d-flex flex-wrap justify-content-center gap-2 slide-up-fade" style="animation-delay: 0.2s;">
                  <span class="badge glass-badge px-3 py-2"><i class="bi bi-bandaid me-1"></i>Rehabilitation</span>
                  <span class="badge glass-badge px-3 py-2"><i class="bi bi-person-arms-up me-1"></i>Mobility</span>
                  <span class="badge glass-badge px-3 py-2"><i class="bi bi-heart-pulse me-1"></i>Evidence-Based</span>
                  <span class="badge glass-badge px-3 py-2"><i class="bi bi-lightning-charge me-1"></i>Functional Strength</span>
                  <span class="badge glass-badge px-3 py-2"><i class="bi bi-fire me-1"></i>Pain Relief</span>
              </div>
          </div>

          <!-- Cards Row -->
          <div class="row g-4 align-items-stretch mb-5 position-relative z-1 slide-up-fade" style="animation-delay: 0.3s;">
              <div class="col-md-6">
                  <div class="glass-card h-100 p-4 rounded-4 transition-hover">
                      <div class="card-icon-wrapper mb-3 text-info fs-1">
                          <i class="bi bi-activity"></i>
                      </div>
                      <h3 class="h4 text-white">Physiotherapy</h3>
                      <p class="text-subtle mb-0">Our approach bridges the gap between injury and peak performance. We use manual therapy, dry needling, and therapeutic exercise to restore joint mechanics, alleviate pain, and rebuild resilient tissues. Grounded in clinical science for optimal recovery.</p>
                  </div>
              </div>
              <div class="col-md-6">
                  <div class="glass-card h-100 p-4 rounded-4 transition-hover">
                      <div class="card-icon-wrapper mb-3 text-accent fs-1">
                          <i class="bi bi-person-arms-up"></i>
                      </div>
                      <h3 class="h4 text-white">Pilates</h3>
                      <p class="text-subtle mb-0">The ultimate tool for neuromuscular re-education. Focusing on core stability, breath control, and precise movement patterns, our clinical Pilates programs correct postural imbalances, increase flexibility, and build a lasting foundation of strength.</p>
                  </div>
              </div>
          </div>

           <!-- Interactive Actions -->
          <div class="d-flex flex-wrap justify-content-center gap-3 mb-5 position-relative z-1 slide-up-fade" style="animation-delay: 0.4s;">
              <button type="button" class="btn btn-outline-info auth-pill-btn px-4 py-2 hover-glow" data-bs-toggle="modal" data-bs-target="#philosophyModal">
                 <i class="bi bi-stars me-2"></i>Our Philosophy
              </button>
              <button class="btn btn-primary auth-pill-btn px-4 py-2 hover-glow" type="button" data-bs-toggle="offcanvas" data-bs-target="#facilitiesDrawer" aria-controls="facilitiesDrawer">
                 <i class="bi bi-building me-2"></i>Tour & Details
              </button>
          </div>

          <!-- Glass Accordion -->
          <h4 class="mb-4 text-white text-center position-relative z-1 slide-up-fade" style="animation-delay: 0.5s;">
             <i class="bi bi-question-circle me-2"></i>Discover Our Approach
          </h4>
          <div class="accordion glass-accordion mb-3 position-relative z-1 slide-up-fade" id="aboutAccordion" style="animation-delay: 0.6s;">
            <div class="accordion-item glass-accordion-item">
              <h2 class="accordion-header">
                <button class="accordion-button collapsed py-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne">
                  <span class="d-flex align-items-center"><i class="bi bi-search text-info fs-5 me-3"></i> Comprehensive Assessments</span>
                </button>
              </h2>
              <div id="collapseOne" class="accordion-collapse collapse" data-bs-parent="#aboutAccordion">
                <div class="accordion-body text-subtle lh-lg">
                  Every journey begins with a meticulous full-body assessment. We look beyond the site of pain to investigate the whole biomechanical chain, analyzing your gait, posture, and movement patterns to find the root cause of discomfort.
                </div>
              </div>
            </div>
            <div class="accordion-item glass-accordion-item">
              <h2 class="accordion-header">
                <button class="accordion-button collapsed py-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo">
                  <span class="d-flex align-items-center"><i class="bi bi-bullseye text-accent fs-5 me-3"></i> Targeted Intervention</span>
                </button>
              </h2>
              <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#aboutAccordion">
                <div class="accordion-body text-subtle lh-lg">
                  Based on your assessment, we combine hands-on manual techniques with specific active movements. This immediately down-regulates pain signals, improves your range of motion, and facilitates immediate symptom relief.
                </div>
              </div>
            </div>
            <div class="accordion-item glass-accordion-item">
              <h2 class="accordion-header">
                <button class="accordion-button collapsed py-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree">
                  <span class="d-flex align-items-center"><i class="bi bi-arrow-repeat text-success fs-5 me-3"></i> The Physio-Pilates Bridge</span>
                </button>
              </h2>
              <div id="collapseThree" class="accordion-collapse collapse" data-bs-parent="#aboutAccordion">
                <div class="accordion-body text-subtle lh-lg">
                  Once pain is managed, we seamlessly transition you into clinical Pilates. This ensures the newly acquired mobility is stabilized by a strong, reactive core—helping you become stronger and far more resilient than before.
                </div>
              </div>
            </div>
          </div>

          <!-- Deep Dive: Specialized Programs -->
          <div class="mt-5 pt-4 border-top border-light border-opacity-10 position-relative z-1 slide-up-fade" style="animation-delay: 0.7s;">
             <h4 class="mb-4 text-white text-center">
               <i class="bi bi-grid-1x2 text-info me-2"></i>Targeted Specializations
             </h4>
             <div class="row g-3">
                <div class="col-md-4">
                   <div class="glass-card p-4 rounded-4 h-100 text-center hover-glow transition-hover">
                      <div class="fs-1 text-accent mb-2"><i class="bi bi-lungs-fill"></i></div>
                      <h5 class="text-white">Post-Operative</h5>
                      <p class="text-subtle small mb-0">Structured protocols to reclaim mobility and strength after orthopedic surgeries.</p>
                   </div>
                </div>
                <div class="col-md-4">
                   <div class="glass-card p-4 rounded-4 h-100 text-center hover-glow transition-hover">
                      <div class="fs-1 text-danger mb-2"><i class="bi bi-lightning-fill"></i></div>
                      <h5 class="text-white">Sports Rehab</h5>
                      <p class="text-subtle small mb-0">Dynamic movement analysis and return-to-sport planning for athletes of all levels.</p>
                   </div>
                </div>
                <div class="col-md-4">
                   <div class="glass-card p-4 rounded-4 h-100 text-center hover-glow transition-hover">
                      <div class="fs-1 text-success mb-2"><i class="bi bi-person-wheelchair"></i></div>
                      <h5 class="text-white">Geriatric Care</h5>
                      <p class="text-subtle small mb-0">Fall prevention, balance training, and arthritis management for active aging.</p>
                   </div>
                </div>
             </div>
          </div>

          <!-- Facility Gallery Strip -->
          <div class="mt-5 pt-4 border-top border-light border-opacity-10 position-relative z-1 slide-up-fade" style="animation-delay: 0.75s;">
             <div class="text-center mb-4">
               <h4 class="text-white"><i class="bi bi-building text-info me-2"></i>Our Modern Clinic</h4>
               <p class="text-subtle small">A peaceful, clean, and optimized environment designed for your comfort and recovery.</p>
             </div>
             <div class="row g-3">
                <div class="col-6 col-md-3">
                   <div class="rounded-4 overflow-hidden shadow-sm position-relative group-hover-zoom h-100" style="min-height: 200px;">
                     <img src="/about-reception-1.jpg" class="img-fluid w-100 h-100 object-fit-cover" alt="Move Physio Reception Area">
                   </div>
                </div>
                <div class="col-6 col-md-3">
                   <div class="rounded-4 overflow-hidden shadow-sm position-relative group-hover-zoom h-100" style="min-height: 200px;">
                     <img src="/about-pilates-room.jpg" class="img-fluid w-100 h-100 object-fit-cover" alt="Clinical Pilates Reformer Room">
                   </div>
                </div>
                <div class="col-6 col-md-3">
                   <div class="rounded-4 overflow-hidden shadow-sm position-relative group-hover-zoom h-100" style="min-height: 200px;">
                     <img src="/about-treatment-room.jpg" class="img-fluid w-100 h-100 object-fit-cover" alt="Physiotherapy Treatment Room">
                   </div>
                </div>
                <div class="col-6 col-md-3">
                   <div class="rounded-4 overflow-hidden shadow-sm position-relative group-hover-zoom h-100" style="min-height: 200px;">
                     <img src="/about-reception-2.jpg" class="img-fluid w-100 h-100 object-fit-cover" alt="Reception Detail">
                   </div>
                </div>
             </div>
          </div>

          <!-- Meet The Experts Section -->
          <div class="mt-5 pt-4 border-top border-light border-opacity-10 position-relative z-1 slide-up-fade" style="animation-delay: 0.8s;">
            <div class="row align-items-center mb-4">
                <div class="col-md-8">
                   <h4 class="text-white mb-2"><i class="bi bi-people text-warning me-2"></i>Our Clinical Team</h4>
                   <p class="text-subtle mb-0">Led by forward-thinking practitioners dedicated to your long-term success.</p>
                </div>
                <div class="col-md-4 text-md-end mt-3 mt-md-0">
                   <a href="/contact" data-nav class="btn btn-outline-light auth-pill-btn btn-sm">Join Our Team</a>
                </div>
            </div>
            
            <div class="glass-card p-0 rounded-4 overflow-hidden position-relative mb-4">
               <div class="row g-0">
                  <div class="col-sm-4 bg-dark d-flex align-items-stretch justify-content-center">
                     <img src="/Christoforos.png" alt="Christoforos Stavrou" class="img-fluid w-100 object-fit-cover" style="min-height: 250px;">
                  </div>
                  <div class="col-sm-8 p-4 d-flex flex-column justify-content-center">
                     <h5 class="text-white fw-bold mb-1">Christoforos Stavrou</h5>
                     <h6 class="text-info small mb-3">Lead Physiotherapist</h6>
                     <p class="text-subtle small mb-3 lh-lg">With extensive experience in musculoskeletal rehabilitation, Christoforos focuses on clinical therapy and functional restoration. His holistic approach ensures that every patient receives a personalized roadmap from pain management to peak physical performance.</p>
                     <div class="d-flex gap-2">
                        <span class="badge bg-dark bg-opacity-50 border border-secondary border-opacity-25 text-light fw-normal"><i class="bi bi-check-circle text-success me-1"></i>BSc Physiotherapy</span>
                     </div>
                  </div>
               </div>
            </div>

            <div class="glass-card p-0 rounded-4 overflow-hidden position-relative">
               <div class="row g-0">
                  <div class="col-sm-4 bg-dark d-flex align-items-stretch justify-content-center order-sm-2">
                     <img src="/Alexandra.jpg" alt="Alexandra Skender" class="img-fluid w-100 object-fit-cover" style="min-height: 250px;">
                  </div>
                  <div class="col-sm-8 p-4 d-flex flex-column justify-content-center order-sm-1 text-sm-end">
                     <h5 class="text-white fw-bold mb-1">Alexandra Skender</h5>
                     <h6 class="text-accent small mb-3">Clinical Pilates Instructor</h6>
                     <p class="text-subtle small mb-3 lh-lg">Alexandra leads our Pilates programs, blending core strengthening, breath work, and flexible movement patterns to prevent injuries and rehabilitate posture. Her classes re-educate the neuromuscular system for long-term health and stability.</p>
                     <div class="d-flex justify-content-sm-end gap-2">
                        <span class="badge bg-dark bg-opacity-50 border border-secondary border-opacity-25 text-light fw-normal"><i class="bi bi-check-circle text-accent me-1"></i>Clinical Pilates Cert</span>
                        <span class="badge bg-dark bg-opacity-50 border border-secondary border-opacity-25 text-light fw-normal"><i class="bi bi-check-circle text-accent me-1"></i>Movement Specialist</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </section>

      <!-- Glass Modal (Popup) -->
      <div class="modal fade" id="philosophyModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content glass-modal border-0 shadow-lg">
            <div class="modal-header border-0 pb-0 pt-4 px-4">
              <h4 class="modal-title text-white fw-bold"><i class="bi bi-lightbulb text-warning me-2"></i>The Move Physio Philosophy</h4>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
              <h5 class="text-info mb-3">Movement is Medicine</h5>
              <p class="text-subtle lh-lg border-start border-3 border-info ps-3 ms-2">We believe the body is designed to heal itself when provided with the right environment and stimuli. Passive treatments alone are never enough. Our core philosophy empowers <strong>you</strong> to take an active role in your own recovery.</p>
              <div class="row text-center mt-5 mb-3">
                <div class="col-4">
                   <div class="fs-1 text-accent mb-3 hover-float"><i class="bi bi-lungs"></i></div>
                   <h6 class="text-white fw-bold">Breathe</h6>
                </div>
                <div class="col-4">
                   <div class="fs-1 text-info mb-3 hover-float" style="animation-delay:0.1s"><i class="bi bi-bicycle"></i></div>
                   <h6 class="text-white fw-bold">Move</h6>
                </div>
                <div class="col-4">
                   <div class="fs-1 text-success mb-3 hover-float" style="animation-delay:0.2s"><i class="bi bi-tree"></i></div>
                   <h6 class="text-white fw-bold">Thrive</h6>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Glass Offcanvas (Drawer) -->
      <div class="offcanvas offcanvas-end glass-drawer shadow-lg" tabindex="-1" id="facilitiesDrawer">
        <div class="offcanvas-header border-bottom border-light border-opacity-10 glass-drawer-header p-4">
          <h5 class="offcanvas-title text-white fw-bold"><i class="bi bi-hospital text-info me-2"></i>Clinical Setup</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body p-4 custom-scrollbar">
          <div class="rounded-4 overflow-hidden mb-4 shadow position-relative group-hover-zoom">
            <img src="/pilates-training.webp" class="img-fluid w-100 object-fit-cover" style="height:220px;" alt="Pilates Equipment">
            <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-25 pointer-events-none"></div>
          </div>
          <h6 class="text-white fw-bold mb-2">State-of-the-Art Equipment</h6>
          <p class="text-subtle small mb-4 lh-lg">Our studio is fully equipped with clinical-grade Pilates Reformers, Cadillacs, Wunda Chairs, and cutting-edge Physiotherapy modalities to support every phase of your journey.</p>
          
          <div class="glass-card p-4 rounded-4 mb-4">
            <h6 class="text-white fw-bold mb-3"><i class="bi bi-card-checklist text-accent me-2"></i>First Visit Expectations:</h6>
            <ul class="list-unstyled small text-subtle mb-0 d-grid gap-3">
               <li class="d-flex align-items-center"><i class="bi bi-check2-circle text-success fs-5 me-3"></i> 60-minute thorough session</li>
               <li class="d-flex align-items-center"><i class="bi bi-check2-circle text-success fs-5 me-3"></i> Medical history review</li>
               <li class="d-flex align-items-center"><i class="bi bi-check2-circle text-success fs-5 me-3"></i> Posture & movement analysis</li>
               <li class="d-flex align-items-center"><i class="bi bi-check2-circle text-success fs-5 me-3"></i> Custom plan creation</li>
            </ul>
          </div>
          
          <div class="d-grid mt-auto pt-4 border-top border-light border-opacity-10">
             <a href="/contact" data-nav class="btn btn-outline-info auth-pill-btn w-100 hover-glow" data-bs-dismiss="offcanvas">
               Book an Assessment <i class="bi bi-arrow-right ms-2"></i>
             </a>
          </div>
        </div>
      </div>
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
      <section class="page-screen container position-relative physiotherapy-section">
        <div class="page-surface overflow-hidden position-relative p-md-5 z-1 mt-4">
          <!-- Floating Background Effects -->
          <div class="clouds-bg-wrapper position-absolute w-100 h-100 top-0 start-0 overflow-hidden" style="pointer-events: none; z-index: 0; border-radius: var(--radius-lg);">
            <div class="cloud-blob blur-blob-1"></div>
            <div class="cloud-blob blur-blob-2"></div>
          </div>
          
          <div class="position-relative z-1 text-center mb-5 slide-up-fade">
            <h1 class="page-title display-4 fw-bold mb-3"><i class="bi bi-activity text-info me-2"></i>Physiotherapy</h1>
            <p class="page-copy lead mb-4">
              Restoring movement, reducing pain, and improving overall function through evidence-based techniques.
            </p>
            <div class="d-flex flex-wrap justify-content-center gap-2">
                <span class="badge glass-badge px-3 py-2"><i class="bi bi-bandaid me-1"></i>Manual Therapy</span>
                <span class="badge glass-badge px-3 py-2"><i class="bi bi-person-arms-up me-1"></i>Exercise Prescription</span>
                <span class="badge glass-badge px-3 py-2"><i class="bi bi-lightning-charge me-1"></i>Sports Rehab</span>
                <span class="badge glass-badge px-3 py-2"><i class="bi bi-heart-pulse me-1"></i>Post-Op Care</span>
            </div>
          </div>

          <div class="physio-info-card position-relative z-1 mb-5 slide-up-fade" style="animation-delay: 0.1s;">
            <div class="physio-info-heading d-flex align-items-center justify-content-center justify-content-md-start gap-2 mb-3">
              <i class="bi bi-info-circle-fill text-info"></i>
              <h2 class="h4 text-white mb-0">Information</h2>
            </div>
            <p class="text-subtle mb-4 text-center text-md-start">Physiotherapy may consist of:</p>
            <div class="row g-4 physio-technique-cards">
              <div class="col-6 col-md-4 col-lg-3">
                <div class="physio-card-item glass-card h-100 p-3 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-between">
                  <div class="rounded-3 overflow-hidden mb-3 w-100 position-relative shadow-sm" style="aspect-ratio: 1; min-height: 120px;">
                    <img src="/electrical-muscle-stim.jpeg" class="w-100 h-100 object-fit-cover" alt="Electro stimulation">
                  </div>
                  <h3 class="h6 text-white mb-0 d-flex align-items-center gap-2"><i class="bi bi-check2-circle text-accent-strong"></i>Electro stimulation</h3>
                </div>
              </div>
              <div class="col-6 col-md-4 col-lg-3">
                <div class="physio-card-item glass-card h-100 p-3 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-between">
                  <div class="rounded-3 overflow-hidden mb-3 w-100 position-relative shadow-sm" style="aspect-ratio: 1; min-height: 120px;">
                    <img src="/tecar-2.jpg" class="w-100 h-100 object-fit-cover" alt="Tecar therapy">
                  </div>
                  <h3 class="h6 text-white mb-0 d-flex align-items-center gap-2"><i class="bi bi-check2-circle text-accent-strong"></i>Tecar therapy</h3>
                </div>
              </div>
              <div class="col-6 col-md-4 col-lg-3">
                <div class="physio-card-item glass-card h-100 p-3 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-between">
                  <div class="rounded-3 overflow-hidden mb-3 w-100 position-relative shadow-sm" style="aspect-ratio: 1; min-height: 120px;">
                    <img src="/Shockwave.jpg" class="w-100 h-100 object-fit-cover" alt="Shockwave therapy">
                  </div>
                  <h3 class="h6 text-white mb-0 d-flex align-items-center gap-2"><i class="bi bi-check2-circle text-accent-strong"></i>Shockwave therapy</h3>
                </div>
              </div>
              <div class="col-6 col-md-4 col-lg-3">
                <div class="physio-card-item glass-card h-100 p-3 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-between">
                  <div class="rounded-3 overflow-hidden mb-3 w-100 position-relative shadow-sm" style="aspect-ratio: 1; min-height: 120px;">
                    <img src="/cupping therapy.webp" class="w-100 h-100 object-fit-cover" alt="Cupping therapy">
                  </div>
                  <h3 class="h6 text-white mb-0 d-flex align-items-center gap-2"><i class="bi bi-check2-circle text-accent-strong"></i>Cupping therapy</h3>
                </div>
              </div>
              <div class="col-6 col-md-4 col-lg-3">
                <div class="physio-card-item glass-card h-100 p-3 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-between">
                  <div class="rounded-3 overflow-hidden mb-3 w-100 position-relative shadow-sm" style="aspect-ratio: 1; min-height: 120px;">
                    <img src="/dry needling and acupuncture.jpeg" class="w-100 h-100 object-fit-cover" alt="Dry needling and acupuncture">
                  </div>
                  <h3 class="h6 text-white mb-0 d-flex align-items-center gap-2 text-start justify-content-center lh-sm"><i class="bi bi-check2-circle text-accent-strong"></i>Dry needling &<br>acupuncture</h3>
                </div>
              </div>
              <div class="col-6 col-md-4 col-lg-3">
                <div class="physio-card-item glass-card h-100 p-3 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-between">
                  <div class="rounded-3 overflow-hidden mb-3 w-100 position-relative shadow-sm" style="aspect-ratio: 1; min-height: 120px;">
                    <img src="/Ergon-IASTM-technique-5-kopie.jpg" class="w-100 h-100 object-fit-cover" alt="Ergon IASTM">
                  </div>
                  <h3 class="h6 text-white mb-0 d-flex align-items-center gap-2"><i class="bi bi-check2-circle text-accent-strong"></i>Ergon IASTM</h3>
                </div>
              </div>
              <div class="col-6 col-md-4 col-lg-3">
                <div class="physio-card-item glass-card h-100 p-3 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-between">
                  <div class="rounded-3 overflow-hidden mb-3 w-100 position-relative shadow-sm" style="aspect-ratio: 1; min-height: 120px;">
                    <img src="/Manual-Therapy-Techniques.webp" class="w-100 h-100 object-fit-cover" alt="Manual therapy techniques">
                  </div>
                  <h3 class="h6 text-white mb-0 d-flex align-items-center gap-2 text-start justify-content-center lh-sm"><i class="bi bi-check2-circle text-accent-strong"></i>Manual therapy<br>techniques</h3>
                </div>
              </div>
              <div class="col-6 col-md-4 col-lg-3">
                <div class="physio-card-item glass-card h-100 p-3 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-between">
                  <div class="rounded-3 overflow-hidden mb-3 w-100 position-relative shadow-sm" style="aspect-ratio: 1; min-height: 120px;">
                    <img src="/taping.jpg" class="w-100 h-100 object-fit-cover" alt="Taping">
                  </div>
                  <h3 class="h6 text-white mb-0 d-flex align-items-center gap-2"><i class="bi bi-check2-circle text-accent-strong"></i>Taping</h3>
                </div>
              </div>
            </div>
          </div>

          <div class="row g-4 align-items-stretch mb-5 position-relative z-1 slide-up-fade" style="animation-delay: 0.2s;">
            <div class="col-12 text-center mb-3">
              <h2 class="h3 text-white">Watch Our Techniques in Action</h2>
              <p class="text-subtle">Take a look at how we perform our focused rehabilitation and manual therapy.</p>
            </div>
            
            <div class="col-md-6">
              <div class="glass-card h-100 p-3 rounded-4 transition-hover text-center">
                <div class="rounded-3 overflow-hidden mb-3 position-relative bg-dark shadow-sm mx-auto" style="width: 300px; max-width: 100%; aspect-ratio: 9/16; cursor: pointer;">
                  <video src="/physio-video-1.mp4" class="w-100 h-100 object-fit-cover" muted loop onmouseenter="this.play()" onmouseleave="this.pause()" onclick="this.paused ? this.play() : this.pause()" preload="metadata"></video>
                </div>
                <h3 class="h5 text-white mb-2"><i class="bi bi-play-circle text-info me-2"></i>Targeted Joint Mobilization</h3>
                <p class="text-subtle small mb-0">Learn how our physiotherapists use precise hands-on methods to restore joint mobility, relieve stiffness, and stimulate the body's natural healing processes.</p>
              </div>
            </div>
            
            <div class="col-md-6">
              <div class="glass-card h-100 p-3 rounded-4 transition-hover text-center">
                <div class="rounded-3 overflow-hidden mb-3 position-relative bg-dark shadow-sm mx-auto" style="width: 300px; max-width: 100%; aspect-ratio: 9/16; cursor: pointer;">
                  <video src="/physio-video-2.mp4" class="w-100 h-100 object-fit-cover" muted loop onmouseenter="this.play()" onmouseleave="this.pause()" onclick="this.paused ? this.play() : this.pause()" preload="metadata"></video>
                </div>
                <h3 class="h5 text-white mb-2"><i class="bi bi-play-circle text-accent me-2"></i>Active Rehabilitation Exercise</h3>
                <p class="text-subtle small mb-0">Watch examples of functional exercise protocols designed specifically to strengthen vulnerable areas, improve balance, and prevent future injuries.</p>
              </div>
            </div>
          </div>
          
          <div class="d-flex justify-content-center mt-4 pt-3 border-top border-light border-opacity-10 position-relative z-1 slide-up-fade" style="animation-delay: 0.4s;">
             <a href="/contact" data-nav class="btn btn-outline-info auth-pill-btn px-4 py-2 hover-glow">
               <i class="bi bi-calendar-check me-2"></i>Book a Physiotherapy Session
             </a>
          </div>
        </div>
      </section>
    `
  }

  if (pathname === '/pilates') {
    return `
      <section class="page-screen container position-relative pilates-section">
        <div class="page-surface overflow-hidden position-relative p-md-5 z-1 mt-4">
          <!-- Floating Background Effects -->
          <div class="clouds-bg-wrapper position-absolute w-100 h-100 top-0 start-0 overflow-hidden" style="pointer-events: none; z-index: 0; border-radius: var(--radius-lg);">
            <div class="cloud-blob blur-blob-1" style="background: radial-gradient(circle, var(--accent), transparent 70%);"></div>
            <div class="cloud-blob blur-blob-2" style="background: radial-gradient(circle, rgba(131,232,187,0.4), transparent 70%);"></div>
          </div>
          
          <div class="position-relative z-1 text-center mb-5 slide-up-fade">
            <h1 class="page-title display-4 fw-bold mb-3"><i class="bi bi-person-arms-up text-accent me-2"></i>Pilates</h1>
            <p class="page-copy lead mb-4">
              Combining core strengthening, flexibility, and mindful movement to enhance body awareness and functional strength.
            </p>
            <div class="d-flex flex-wrap justify-content-center gap-2">
                <span class="badge glass-badge px-3 py-2"><i class="bi bi-circle me-1"></i>Reformer Equipment</span>
                <span class="badge glass-badge px-3 py-2"><i class="bi bi-heart-pulse me-1"></i>Clinical Pilates</span>
                <span class="badge glass-badge px-3 py-2"><i class="bi bi-lungs me-1"></i>Mindful Movement</span>
                <span class="badge glass-badge px-3 py-2"><i class="bi bi-arrow-repeat me-1"></i>Core Stability</span>
            </div>
          </div>

          <div class="row g-4 align-items-stretch mb-5 position-relative z-1 slide-up-fade" style="animation-delay: 0.2s;">
            <div class="col-12 text-center mb-3">
              <h2 class="h3 text-white">Experience Our Pilates Approach</h2>
              <p class="text-subtle">See how controlled movements and specialized equipment can transform your posture and strength.</p>
            </div>
            
            <div class="col-md-6">
              <div class="glass-card h-100 p-3 rounded-4 transition-hover text-center">
                <div class="rounded-3 overflow-hidden mb-3 position-relative bg-dark shadow-sm mx-auto" style="width: 300px; max-width: 100%; aspect-ratio: 9/16; cursor: pointer;">
                  <video src="/pilates-basic.mp4" class="w-100 h-100 object-fit-cover" muted loop onmouseenter="this.play()" onmouseleave="this.pause()" onclick="this.paused ? this.play() : this.pause()" preload="metadata"></video>
                </div>
                <h3 class="h5 text-white mb-2"><i class="bi bi-play-circle text-primary me-2"></i>Reformer Basics</h3>
                <p class="text-subtle small mb-0">Discover standard Reformer exercises focusing on alignment, control, and building deep core stability.</p>
              </div>
            </div>

            <div class="col-md-6">
              <div class="glass-card h-100 p-3 rounded-4 transition-hover text-center">
                <div class="rounded-3 overflow-hidden mb-3 position-relative bg-dark shadow-sm mx-auto" style="width: 300px; max-width: 100%; aspect-ratio: 9/16; cursor: pointer;">
                  <video src="/pilates-video-4.mp4" class="w-100 h-100 object-fit-cover" muted loop onmouseenter="this.play()" onmouseleave="this.pause()" onclick="this.paused ? this.play() : this.pause()" preload="metadata"></video>
                </div>
                <h3 class="h5 text-white mb-2"><i class="bi bi-play-circle text-warning me-2"></i>Core Awakening</h3>
                <p class="text-subtle small mb-0">Activate deep core muscles essential for a healthy spine and foundational stability using tailored spring tension.</p>
              </div>
            </div>

            <div class="col-md-6">
              <div class="glass-card h-100 p-3 rounded-4 transition-hover text-center">
                <div class="rounded-3 overflow-hidden mb-3 position-relative bg-dark shadow-sm mx-auto" style="width: 300px; max-width: 100%; aspect-ratio: 9/16; cursor: pointer;">
                  <video src="/pilates-video-3.mp4" class="w-100 h-100 object-fit-cover" muted loop onmouseenter="this.play()" onmouseleave="this.pause()" onclick="this.paused ? this.play() : this.pause()" preload="metadata"></video>
                </div>
                <h3 class="h5 text-white mb-2"><i class="bi bi-play-circle text-info me-2"></i>Clinical Correction</h3>
                <p class="text-subtle small mb-0">Targeted therapeutic movements addressing muscular imbalances and promoting injury recovery effectively.</p>
              </div>
            </div>

            <div class="col-md-6">
              <div class="glass-card h-100 p-3 rounded-4 transition-hover text-center">
                <div class="rounded-3 overflow-hidden mb-3 position-relative bg-dark shadow-sm mx-auto" style="width: 300px; max-width: 100%; aspect-ratio: 9/16; cursor: pointer;">
                  <video src="/pilates-video-5.mp4" class="w-100 h-100 object-fit-cover" muted loop onmouseenter="this.play()" onmouseleave="this.pause()" onclick="this.paused ? this.play() : this.pause()" preload="metadata"></video>
                </div>
                <h3 class="h5 text-white mb-2"><i class="bi bi-play-circle text-danger me-2"></i>Spinal Articulation</h3>
                <p class="text-subtle small mb-0">Fluid exercises to mobilize the spine segment by segment, creating space and relieving accumulated tightness.</p>
              </div>
            </div>

            <div class="col-md-6">
              <div class="glass-card h-100 p-3 rounded-4 transition-hover text-center">
                <div class="rounded-3 overflow-hidden mb-3 position-relative bg-dark shadow-sm mx-auto" style="width: 300px; max-width: 100%; aspect-ratio: 9/16; cursor: pointer;">
                  <video src="/pilates-video-6.mp4" class="w-100 h-100 object-fit-cover" muted loop onmouseenter="this.play()" onmouseleave="this.pause()" onclick="this.paused ? this.play() : this.pause()" preload="metadata"></video>
                </div>
                <h3 class="h5 text-white mb-2"><i class="bi bi-play-circle text-light me-2"></i>Full Body Tone</h3>
                <p class="text-subtle small mb-0">Strengthen arms, shoulders, and legs simultaneously with comprehensive, full-body functional movements.</p>
              </div>
            </div>

            <div class="col-md-6">
              <div class="glass-card h-100 p-3 rounded-4 transition-hover text-center">
                <div class="rounded-3 overflow-hidden mb-3 position-relative bg-dark shadow-sm mx-auto" style="width: 300px; max-width: 100%; aspect-ratio: 9/16; cursor: pointer;">
                  <video src="/pilates-video-2.mp4" class="w-100 h-100 object-fit-cover" muted loop onmouseenter="this.play()" onmouseleave="this.pause()" onclick="this.paused ? this.play() : this.pause()" preload="metadata"></video>
                </div>
                <h3 class="h5 text-white mb-2"><i class="bi bi-play-circle text-success me-2"></i>Dynamic Mobility</h3>
                <p class="text-subtle small mb-0">Watch smooth transitions that elevate your range of motion through active stretching combined with equipment routines.</p>
              </div>
            </div>

            <div class="col-md-6">
              <div class="glass-card h-100 p-3 rounded-4 transition-hover text-center">
                <div class="rounded-3 overflow-hidden mb-3 position-relative bg-dark shadow-sm mx-auto" style="width: 300px; max-width: 100%; aspect-ratio: 9/16; cursor: pointer;">
                  <video src="/pilates-video-7.mp4" class="w-100 h-100 object-fit-cover" muted loop onmouseenter="this.play()" onmouseleave="this.pause()" onclick="this.paused ? this.play() : this.pause()" preload="metadata"></video>
                </div>
                <h3 class="h5 text-white mb-2"><i class="bi bi-play-circle text-secondary me-2"></i>Lower Body Power</h3>
                <p class="text-subtle small mb-0">Target the hips, glutes, and legs intensely, building powerful lower-body resilience with Reformer resistance.</p>
              </div>
            </div>

            <div class="col-md-6">
              <div class="glass-card h-100 p-3 rounded-4 transition-hover text-center">
                <div class="rounded-3 overflow-hidden mb-3 position-relative bg-dark shadow-sm mx-auto" style="width: 300px; max-width: 100%; aspect-ratio: 9/16; cursor: pointer;">
                  <video src="/pilates-video-1.mp4" class="w-100 h-100 object-fit-cover" muted loop onmouseenter="this.play()" onmouseleave="this.pause()" onclick="this.paused ? this.play() : this.pause()" preload="metadata"></video>
                </div>
                <h3 class="h5 text-white mb-2"><i class="bi bi-play-circle text-accent me-2"></i>Advanced Reformer</h3>
                <p class="text-subtle small mb-0">Challenge your core strength, balance, and whole-body integration with these advanced movement sequences.</p>
              </div>
            </div>
          </div>
          
          <div class="d-flex justify-content-center mt-4 pt-3 border-top border-light border-opacity-10 position-relative z-1 slide-up-fade" style="animation-delay: 0.4s;">
             <a href="/contact" data-nav class="btn btn-outline-accent auth-pill-btn px-4 py-2 hover-glow" style="border-color: var(--accent); color: var(--accent);">
               <i class="bi bi-calendar-check me-2"></i>Book a Pilates Session
             </a>
          </div>
        </div>
      </section>
    `
  }

  if (pathname === '/contact') {
    return `
      <section class="page-screen container position-relative contact-section">
        <div class="page-surface overflow-hidden position-relative p-md-5 z-1 mt-4">
          <!-- Floating Clouds Background Effects -->
          <div class="clouds-bg-wrapper position-absolute w-100 h-100 top-0 start-0 overflow-hidden" style="pointer-events: none; z-index: 0; border-radius: var(--radius-lg);">
            <div class="cloud-blob blur-blob-1"></div>
            <div class="cloud-blob blur-blob-2"></div>
          </div>
          
          <div class="text-center mb-5 position-relative z-1">
              <h1 class="page-title display-4 fw-bold mb-3 slide-up-fade">
                <i class="bi bi-envelope-paper text-accent me-2"></i>Contact Us
              </h1>
              <p class="page-copy lead mb-4 slide-up-fade" style="animation-delay: 0.1s;">
                Get in touch with us for appointments, inquiries, or more information.
              </p>
          </div>

          <div class="row g-4 justify-content-center position-relative z-1 slide-up-fade" style="animation-delay: 0.3s;">
              <!-- Email Card -->
              <div class="col-md-6 col-lg-4">
                  <div class="glass-card h-100 p-4 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-center">
                      <div class="card-icon-wrapper mb-3 text-info fs-1">
                          <i class="bi bi-envelope"></i>
                      </div>
                      <h3 class="h4 text-white mb-3">Email Address</h3>
                      <p class="text-subtle mb-0 fs-5">
                        <a href="mailto:MovephysioCY@gmail.com" class="text-decoration-none text-info hover-glow">MovephysioCY@gmail.com</a>
                      </p>
                  </div>
              </div>

              <!-- Phone Numbers Card -->
              <div class="col-md-6 col-lg-4">
                  <div class="glass-card h-100 p-4 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-center">
                      <div class="card-icon-wrapper mb-3 text-success fs-1">
                          <i class="bi bi-telephone"></i>
                      </div>
                      <h3 class="h4 text-white mb-3">Phone Numbers</h3>
                      <div class="text-subtle mb-0 text-start w-100 px-3">
                        <div class="d-flex align-items-center justify-content-between mb-3 p-2 rounded bg-dark bg-opacity-25">
                            <span class="d-flex align-items-center">
                                <i class="bi bi-activity text-info me-2 fs-5"></i>
                                <strong class="text-white">Physiotherapy</strong>
                            </span>
                            <a href="tel:94604515" class="text-decoration-none text-success fs-5 fw-medium hover-glow">94604515</a>
                        </div>
                        <div class="d-flex align-items-center justify-content-between p-2 rounded bg-dark bg-opacity-25">
                            <span class="d-flex align-items-center">
                                <i class="bi bi-person-arms-up text-accent me-2 fs-5"></i>
                                <strong class="text-white">Pilates</strong>
                            </span>
                            <a href="tel:99865531" class="text-decoration-none text-success fs-5 fw-medium hover-glow">99865531</a>
                        </div>
                      </div>
                  </div>
              </div>

              <!-- Instagram Card -->
              <div class="col-md-6 col-lg-4">
                  <div class="glass-card h-100 p-4 rounded-4 transition-hover text-center d-flex flex-column align-items-center justify-content-center">
                      <div class="card-icon-wrapper mb-3 fs-1" style="color: #E1306C;">
                          <i class="bi bi-instagram"></i>
                      </div>
                      <h3 class="h4 text-white mb-3">Instagram</h3>
                      <p class="text-subtle mb-0 fs-5">
                        <a href="https://instagram.com/move.physio.pilates" target="_blank" rel="noopener noreferrer" class="text-decoration-none hover-glow" style="color: #E1306C;">@move.physio.pilates</a>
                      </p>
                  </div>
              </div>
          </div>

          <div class="row g-5 align-items-stretch position-relative z-1 mt-2 slide-up-fade" style="animation-delay: 0.4s;">
              <div class="col-12 text-center mb-2 mt-4">
                  <h2 class="h3 fw-bold text-white"><i class="bi bi-calendar-check text-success me-2"></i>Book an Appointment</h2>
              </div>
              <!-- Physiotherapy Appointments -->
              <div class="col-lg-6">
                  <div class="glass-card h-100 p-4 rounded-4 position-relative overflow-hidden" style="border-top: 4px solid var(--info);">
                      <div class="d-flex align-items-center mb-4 pb-3 border-bottom border-light border-opacity-10">
                          <div class="card-icon-wrapper text-info fs-3 me-3" style="width: 50px; height: 50px;">
                              <i class="bi bi-activity"></i>
                          </div>
                          <h3 class="h4 text-white mb-0">Physiotherapy Appointment</h3>
                      </div>
                      
                      <div class="service-manager" data-service-manager="physiotherapy">
                        <div class="service-card border-0 bg-transparent p-0">
                          <p class="service-note text-info" data-appointments-status><i class="spinner-border spinner-border-sm me-2"></i>Loading calendar...</p>
                          <div data-appointments-list></div>
                        </div>
                      </div>
                  </div>
              </div>

              <!-- Pilates Appointments -->
              <div class="col-lg-6">
                  <div class="glass-card h-100 p-4 rounded-4 position-relative overflow-hidden" style="border-top: 4px solid var(--accent);">
                      <div class="d-flex align-items-center mb-4 pb-3 border-bottom border-light border-opacity-10">
                          <div class="card-icon-wrapper text-accent fs-3 me-3" style="width: 50px; height: 50px;">
                              <i class="bi bi-person-arms-up"></i>
                          </div>
                          <h3 class="h4 text-white mb-0">Pilates Appointment</h3>
                      </div>
                      
                      <div class="service-manager" data-service-manager="pilates">
                        <div class="service-card border-0 bg-transparent p-0">
                          <p class="service-note text-accent" data-appointments-status><i class="spinner-border spinner-border-sm me-2"></i>Loading calendar...</p>
                          <div data-appointments-list></div>
                        </div>
                      </div>
                  </div>
              </div>
          </div>

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
