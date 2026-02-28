import './style.css'
import { initAuth } from './auth.js'
import { renderApp } from './app.js'
import { initServiceFeatures } from './serviceFeatures.js'
import { applyTranslations, initI18n } from './i18n.js'

function initLiveBackground(canvas) {
  if (!canvas) return () => {}

  const context = canvas.getContext('2d')
  const particles = []
  const particleCount = 70
  let frameId = 0

  const setSize = () => {
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(window.innerWidth * ratio)
    canvas.height = Math.floor(window.innerHeight * ratio)
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
  }

  const random = (min, max) => Math.random() * (max - min) + min

  for (let index = 0; index < particleCount; index += 1) {
    particles.push({
      x: random(0, window.innerWidth),
      y: random(0, window.innerHeight),
      vx: random(-0.6, 0.6),
      vy: random(-0.5, 0.5),
      radius: random(1.2, 2.8)
    })
  }

  const animate = () => {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight)

    const gradient = context.createLinearGradient(0, 0, window.innerWidth, window.innerHeight)
    gradient.addColorStop(0, 'rgba(15, 28, 45, 0.95)')
    gradient.addColorStop(0.5, 'rgba(19, 38, 63, 0.88)')
    gradient.addColorStop(1, 'rgba(0, 166, 255, 0.25)')

    context.fillStyle = gradient
    context.fillRect(0, 0, window.innerWidth, window.innerHeight)

    particles.forEach((particle, firstIndex) => {
      particle.x += particle.vx
      particle.y += particle.vy

      if (particle.x <= 0 || particle.x >= window.innerWidth) particle.vx *= -1
      if (particle.y <= 0 || particle.y >= window.innerHeight) particle.vy *= -1

      context.beginPath()
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
      context.fillStyle = 'rgba(120, 219, 255, 0.8)'
      context.fill()

      for (let secondIndex = firstIndex + 1; secondIndex < particles.length; secondIndex += 1) {
        const nextParticle = particles[secondIndex]
        const dx = particle.x - nextParticle.x
        const dy = particle.y - nextParticle.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 130) {
          context.beginPath()
          context.moveTo(particle.x, particle.y)
          context.lineTo(nextParticle.x, nextParticle.y)
          context.strokeStyle = `rgba(153, 229, 255, ${1 - distance / 130})`
          context.lineWidth = 0.5
          context.stroke()
        }
      }
    })

    frameId = requestAnimationFrame(animate)
  }

  setSize()
  animate()
  window.addEventListener('resize', setSize)

  return () => {
    cancelAnimationFrame(frameId)
    window.removeEventListener('resize', setSize)
  }
}

function bootstrap() {
  const root = document.querySelector('#app')
  if (!root) return

  initI18n()

  let cleanupBackground = () => {}

  const renderRoute = () => {
    cleanupBackground()
    
    // Cleanup any orphaned Bootstrap backdrops or body classes from closing modals/offcanvas during navigation
    document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach(el => el.remove())
    document.body.classList.remove('modal-open')
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''

    root.innerHTML = renderApp(window.location.pathname)

    const backgroundCanvas = document.querySelector('#live-bg-canvas')
    cleanupBackground = initLiveBackground(backgroundCanvas)
    initAuth()
    initServiceFeatures(window.location.pathname)
    applyTranslations(root)
  }

  root.addEventListener('click', (event) => {
    const navLink = event.target.closest('a[data-nav]')
    if (!navLink) return

    const href = navLink.getAttribute('href')
    if (!href) return

    event.preventDefault()
    if (href === window.location.pathname) return

    window.history.pushState({}, '', href)
    renderRoute()
  })

  window.addEventListener('popstate', renderRoute)
  renderRoute()
}

bootstrap()
