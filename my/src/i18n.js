const STORAGE_KEY = 'movephysio-language'
const LANGUAGE_CHANGE_EVENT = 'movephysio:languagechange'
const SUPPORTED_LANGUAGES = new Set(['en', 'el'])

const textNodeOriginals = new WeakMap()
const attributeOriginals = new WeakMap()

let activeLanguage = 'en'
let initialized = false

const exactTranslations = {
  Home: 'Αρχική',
  Physiotherapy: 'Φυσικοθεραπεία',
  Pilates: 'Πιλάτες',
  About: 'Σχετικά',
  Contact: 'Επικοινωνία',
  Services: 'Υπηρεσίες',
  Logout: 'Αποσύνδεση',
  Register: 'Εγγραφή',
  Login: 'Σύνδεση',
  'Register / Login': 'Εγγραφή / Σύνδεση',
  'Create Account': 'Δημιουργία Λογαριασμού',
  'Sign In': 'Είσοδος',
  Username: 'Όνομα χρήστη',
  Password: 'Κωδικός πρόσβασης',
  'Phone Number or Email': 'Τηλέφωνο ή Email',
  'Choose a username': 'Επιλέξτε όνομα χρήστη',
  'Create a secure password': 'Δημιουργήστε ασφαλή κωδικό',
  'Your password': 'Ο κωδικός σας',
  'Welcome to Move Physio': 'Καλωσήρθατε στο Move Physio',
  'About Move Physio': 'Σχετικά με το Move Physio',
  'Our current core services include:': 'Οι βασικές υπηρεσίες μας περιλαμβάνουν:',
  'Appointment Calendar': 'Ημερολόγιο Ραντεβού',
  'Page Not Found': 'Η Σελίδα Δεν Βρέθηκε',
  home: 'αρχική',
  'All rights reserved.': 'Με επιφύλαξη παντός δικαιώματος.',
  'Access Denied': 'Η πρόσβαση απορρίφθηκε',
  'Return to Home': 'Επιστροφή στην Αρχική',
  'Admin Panel': 'Πίνακας Διαχείρισης',
  'Task Workspace': 'Χώρος Εργασίας Εργασιών',
  'Back to Site': 'Επιστροφή στον Ιστότοπο',
  'Task Overview': 'Επισκόπηση Εργασιών',
  Total: 'Σύνολο',
  Pending: 'Εκκρεμείς',
  Completed: 'Ολοκληρωμένες',
  Overdue: 'Καθυστερημένες',
  Daily: 'Ημερήσιες',
  Weekly: 'Εβδομαδιαίες',
  Monthly: 'Μηνιαίες',
  'Create Task': 'Δημιουργία Εργασίας',
  'Task title': 'Τίτλος εργασίας',
  Description: 'Περιγραφή',
  'Add Task': 'Προσθήκη Εργασίας',
  Done: 'Έγινε',
  Reopen: 'Επαναφορά',
  Edit: 'Επεξεργασία',
  Delete: 'Διαγραφή',
  Name: 'Όνομα',
  Phone: 'Τηλέφωνο',
  Email: 'Email',
  Date: 'Ημερομηνία',
  Service: 'Υπηρεσία',
  'Upload File': 'Αρχείο',
  'Quick add task': 'Γρήγορη προσθήκη εργασίας',
  'New Task': 'Νέα Εργασία',
  'Task Board': 'Πίνακας Εργασιών',
  'Drag & Drop': 'Μεταφορά & Απόθεση',
  'Active Tasks': 'Ενεργές Εργασίες',
  'Done Tasks': 'Ολοκληρωμένες Εργασίες',
  'Overdue Tasks': 'Καθυστερημένες Εργασίες',
  'No active tasks.': 'Δεν υπάρχουν ενεργές εργασίες.',
  'No completed tasks yet.': 'Δεν υπάρχουν ολοκληρωμένες εργασίες ακόμη.',
  'No overdue tasks.': 'Δεν υπάρχουν καθυστερημένες εργασίες.',
  'Loading...': 'Φόρτωση...',
  'Verifying admin access...': 'Έλεγχος πρόσβασης διαχειριστή...',
  'Loading task workspace...': 'Φόρτωση χώρου εργασίας εργασιών...',
  'Supabase not configured': 'Το Supabase δεν έχει ρυθμιστεί',
  'Not authenticated': 'Δεν είστε συνδεδεμένος',
  'No role found': 'Δεν βρέθηκε ρόλος',
  'physiotherapy': 'φυσικοθεραπεία',
  'pilates': 'πιλάτες',
  pending: 'εκκρεμής',
  completed: 'ολοκληρωμένη',
  overdue: 'καθυστερημένη'
}

const regexTranslations = [
  [/^Open Physiotherapy page$/i, 'Άνοιγμα σελίδας Φυσικοθεραπείας'],
  [/^Open Pilates page$/i, 'Άνοιγμα σελίδας Πιλάτες'],
  [/^GESY logo$/i, 'Λογότυπο ΓΕΣΥ'],
  [/^Move Physio logo$/i, 'Λογότυπο Move Physio'],
  [/^Select a day from the calendar to see busy and available hours\.$/i, 'Επιλέξτε ημέρα από το ημερολόγιο για να δείτε κατειλημμένες και διαθέσιμες ώρες.'],
  [/^Holiday \/ no Pilates classes for this day\.$/i, 'Αργία / δεν υπάρχουν μαθήματα Πιλάτες για αυτή την ημέρα.'],
  [/^You do not have permission to access the admin panel\.$/i, 'Δεν έχετε δικαίωμα πρόσβασης στον πίνακα διαχείρισης.'],
  [/^This area is restricted to administrators only\.$/i, 'Αυτή η περιοχή είναι διαθέσιμη μόνο για διαχειριστές.'],
  [/^You do not have permission to access this workspace\.$/i, 'Δεν έχετε δικαίωμα πρόσβασης σε αυτόν τον χώρο εργασίας.'],
  [/^Dedicated single page for daily, weekly and monthly admin operations\.$/i, 'Αφιερωμένη σελίδα για ημερήσιες, εβδομαδιαίες και μηνιαίες διαχειριστικές εργασίες.'],
  [/^Create and manage all admin tasks from this workspace\.$/i, 'Δημιουργήστε και διαχειριστείτε όλες τις διαχειριστικές εργασίες από αυτόν τον χώρο.'],
  [/^Task created successfully\.$/i, 'Η εργασία δημιουργήθηκε επιτυχώς.'],
  [/^Task updated successfully\.$/i, 'Η εργασία ενημερώθηκε επιτυχώς.'],
  [/^Task deleted successfully\.$/i, 'Η εργασία διαγράφηκε επιτυχώς.'],
  [/^Task marked as done\.$/i, 'Η εργασία σημειώθηκε ως ολοκληρωμένη.'],
  [/^Task moved back to pending\.$/i, 'Η εργασία μεταφέρθηκε ξανά στις εκκρεμείς.'],
  [/^Task marked as completed\.$/i, 'Η εργασία σημειώθηκε ως ολοκληρωμένη.'],
  [/^Task moved to active tasks\.$/i, 'Η εργασία μεταφέρθηκε στις ενεργές εργασίες.'],
  [/^Task moved to overdue tasks\.$/i, 'Η εργασία μεταφέρθηκε στις καθυστερημένες εργασίες.'],
  [/^Please provide required task values\.$/i, 'Παρακαλώ συμπληρώστε τα απαιτούμενα στοιχεία εργασίας.'],
  [/^Please provide valid values\.$/i, 'Παρακαλώ δώστε έγκυρες τιμές.'],
  [/^Role must be user or admin\.$/i, 'Ο ρόλος πρέπει να είναι user ή admin.'],
  [/^User role saved successfully\.$/i, 'Ο ρόλος χρήστη αποθηκεύτηκε επιτυχώς.'],
  [/^User updated successfully\.$/i, 'Ο χρήστης ενημερώθηκε επιτυχώς.'],
  [/^User removed successfully\.$/i, 'Ο χρήστης αφαιρέθηκε επιτυχώς.'],
  [/^Please complete all required fields\.$/i, 'Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία.'],
  [/^Unable to load appointment details\.$/i, 'Αδυναμία φόρτωσης στοιχείων ραντεβού.'],
  [/^Appointment created successfully\.$/i, 'Το ραντεβού δημιουργήθηκε επιτυχώς.'],
  [/^Appointment updated successfully\.$/i, 'Το ραντεβού ενημερώθηκε επιτυχώς.'],
  [/^Appointment deleted successfully\.$/i, 'Το ραντεβού διαγράφηκε επιτυχώς.'],
  [/^Unable to read bucket files\. Please apply storage read policy for admin users\.$/i, 'Αδυναμία ανάγνωσης αρχείων bucket. Εφαρμόστε πολιτική ανάγνωσης storage για διαχειριστές.'],
  [/^Delete this task\?$/i, 'Να διαγραφεί αυτή η εργασία;'],
  [/^Remove this user role entry\?$/i, 'Να αφαιρεθεί αυτή η εγγραφή ρόλου χρήστη;'],
  [/^Updated\s+/i, 'Ενημερώθηκε '],
  [/^Time adjusted to match (\d+)-minute slot boundaries\.$/i, 'Η ώρα προσαρμόστηκε ώστε να ταιριάζει σε διαστήματα $1 λεπτών.'],
  [/^Failed to logout:\s*/i, 'Αποτυχία αποσύνδεσης: '],
  [/^Failed to update user role:\s*/i, 'Αποτυχία ενημέρωσης ρόλου χρήστη: '],
  [/^Registration successful\. Verify your contact method if required\.$/i, 'Η εγγραφή ολοκληρώθηκε επιτυχώς. Επιβεβαιώστε το στοιχείο επικοινωνίας αν απαιτείται.'],
  [/^Login successful\. Welcome back\.$/i, 'Η σύνδεση ολοκληρώθηκε επιτυχώς. Καλώς ήρθατε ξανά.'],
  [/^You are logged out\.$/i, 'Έχετε αποσυνδεθεί.'],
  [/^Username is required\.$/i, 'Το όνομα χρήστη είναι υποχρεωτικό.'],
  [/^Phone number or email is required\.$/i, 'Το τηλέφωνο ή το email είναι υποχρεωτικό.'],
  [/^Enter a valid phone number or email\.$/i, 'Εισάγετε έγκυρο τηλέφωνο ή email.'],
  [/^Authentication failed\. Please try again\.$/i, 'Η ταυτοποίηση απέτυχε. Παρακαλώ δοκιμάστε ξανά.'],
  [/^Cannot reach Supabase\. Check your URL\/key in my\/.env and make sure they are real project values\.$/i, 'Αδυναμία σύνδεσης με το Supabase. Ελέγξτε URL/key στο my/.env και βεβαιωθείτε ότι είναι πραγματικές τιμές.'],
  [/^Supabase config is missing or still using placeholders\. In my\/.env set VITE_SUPABASE_URL and either VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY, then restart the dev server\.$/i, 'Η ρύθμιση του Supabase λείπει ή χρησιμοποιεί placeholders. Στο my/.env ορίστε VITE_SUPABASE_URL και είτε VITE_SUPABASE_ANON_KEY είτε VITE_SUPABASE_PUBLISHABLE_KEY και επανεκκινήστε τον dev server.']
]

function normalizeLanguage(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : 'en'
}

function readStoredLanguage() {
  try {
    return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY) || 'en')
  } catch {
    return 'en'
  }
}

function persistLanguage(language) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // no-op
  }
}

function withOriginalSpacing(source, translated) {
  const lead = source.match(/^\s*/)?.[0] || ''
  const tail = source.match(/\s*$/)?.[0] || ''
  return `${lead}${translated}${tail}`
}

function translateString(value, language = activeLanguage) {
  if (language !== 'el') return value

  const source = String(value ?? '')
  const trimmed = source.trim()
  if (!trimmed) return source

  const exact = exactTranslations[trimmed]
  if (exact) {
    return withOriginalSpacing(source, exact)
  }

  let transformed = source
  regexTranslations.forEach(([pattern, replacement]) => {
    transformed = transformed.replace(pattern, replacement)
  })
  return transformed
}

function translateTextNode(node, language) {
  if (!textNodeOriginals.has(node)) {
    textNodeOriginals.set(node, node.nodeValue || '')
  }

  const original = textNodeOriginals.get(node) || ''
  node.nodeValue = language === 'el' ? translateString(original, language) : original
}

function ensureAttributeOriginals(element) {
  if (attributeOriginals.has(element)) return attributeOriginals.get(element)

  const map = new Map()
  attributeOriginals.set(element, map)
  return map
}

function translateElementAttributes(element, language) {
  const attributeNames = ['placeholder', 'aria-label', 'title']
  const originals = ensureAttributeOriginals(element)

  attributeNames.forEach((attributeName) => {
    if (!element.hasAttribute(attributeName)) return

    if (!originals.has(attributeName)) {
      originals.set(attributeName, element.getAttribute(attributeName) || '')
    }

    const original = originals.get(attributeName) || ''
    const translated = language === 'el' ? translateString(original, language) : original
    element.setAttribute(attributeName, translated)
  })
}

function shouldSkipNode(node) {
  const parent = node.parentElement
  if (!parent) return true
  if (parent.closest('[data-i18n-ignore="true"]')) return true
  const tag = parent.tagName
  return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT'
}

export function applyTranslations(root = document.body) {
  const walkRoot = root && root.nodeType ? root : document.body
  if (!walkRoot) return

  const language = activeLanguage
  const textNodeFilter = typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_TEXT : 4
  const walker = document.createTreeWalker(walkRoot, textNodeFilter)
  let current = walker.nextNode()

  while (current) {
    if (!shouldSkipNode(current)) {
      translateTextNode(current, language)
    }
    current = walker.nextNode()
  }

  const elements = typeof walkRoot.querySelectorAll === 'function' ? walkRoot.querySelectorAll('*') : []
  elements.forEach((element) => translateElementAttributes(element, language))
}

function renderSelectorLabel(language) {
  return language === 'el' ? 'Γλώσσα' : 'Language'
}

function ensureLanguageSelector() {
  let box = document.querySelector('#language-switcher-box')
  if (!box) {
    box = document.createElement('div')
    box.id = 'language-switcher-box'
    box.className = 'language-switcher-box'
    box.setAttribute('data-i18n-ignore', 'true')
    box.innerHTML = `
      <label for="language-switcher" class="language-switcher-label">Language</label>
      <select id="language-switcher" class="form-select form-select-sm language-switcher-select" aria-label="Language selector">
        <option value="en">English</option>
        <option value="el">Ελληνικά</option>
      </select>
    `
    document.body.appendChild(box)
  }

  const label = box.querySelector('.language-switcher-label')
  const select = box.querySelector('#language-switcher')
  if (!label || !select) return

  label.textContent = renderSelectorLabel(activeLanguage)
  select.value = activeLanguage

  if (!select.dataset.boundChange) {
    select.dataset.boundChange = 'true'
    select.addEventListener('change', (event) => {
      const nextLanguage = normalizeLanguage(event.target.value)
      setLanguage(nextLanguage)
    })
  }
}

export function getCurrentLanguage() {
  return activeLanguage
}

export function setLanguage(language) {
  const nextLanguage = normalizeLanguage(language)
  if (nextLanguage === activeLanguage) return

  activeLanguage = nextLanguage
  persistLanguage(activeLanguage)
  document.documentElement.lang = activeLanguage
  ensureLanguageSelector()
  applyTranslations(document.body)
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { language: activeLanguage } }))
}

export function onLanguageChange(listener) {
  if (typeof listener !== 'function') return () => {}

  const handler = (event) => listener(event.detail?.language || activeLanguage)
  window.addEventListener(LANGUAGE_CHANGE_EVENT, handler)
  return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handler)
}

export function initI18n() {
  if (initialized) {
    ensureLanguageSelector()
    applyTranslations(document.body)
    return
  }

  activeLanguage = readStoredLanguage()
  document.documentElement.lang = activeLanguage
  ensureLanguageSelector()
  applyTranslations(document.body)
  initialized = true
}