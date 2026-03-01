import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config.js'

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
const hasConfig =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !/your-project-ref|your-anon-key|your-publishable-key/i.test(`${supabaseUrl} ${supabaseAnonKey}`)
const supabase = hasConfig ? createClient(supabaseUrl, supabaseAnonKey) : null

let siteChatState = null
let adminChatState = null

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getCurrentUserContact(user) {
  const metadata = user?.user_metadata || {}
  const metaContact = String(metadata.contact || '').trim()
  const email = String(user?.email || '').trim()
  const phone = String(user?.phone || '').trim()

  if (email) return email.toLowerCase()
  if (metaContact) return metaContact
  if (phone) return phone
  return `user-${String(user?.id || '').slice(0, 8)}`
}

function toTimeLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function setUnreadBadge(toggleButton, count) {
  if (!toggleButton) return
  const badge = toggleButton.querySelector('.chat-unread-badge')
  if (!badge) return

  if (count > 0) {
    badge.textContent = String(count)
    badge.classList.remove('d-none')
    toggleButton.classList.add('is-blinking')
  } else {
    badge.textContent = ''
    badge.classList.add('d-none')
    toggleButton.classList.remove('is-blinking')
  }
}

function setChatStatus(panel, message = '', type = 'info') {
  const statusElement = panel?.querySelector('.chat-status')
  if (!statusElement) return

  statusElement.textContent = String(message || '')
  statusElement.dataset.type = type
}

function ensurePanel(mode) {
  const panelId = mode === 'admin' ? 'admin-chat-panel' : 'site-chat-panel'
  let panel = document.querySelector(`#${panelId}`)
  if (panel) return panel

  const adminInbox = mode === 'admin'
    ? `
      <aside class="chat-conversation-list-wrap">
        <p class="chat-inbox-title mb-2">User Conversations</p>
        <div class="chat-conversation-list" id="admin-chat-conversation-list"></div>
      </aside>
    `
    : ''

  const title = mode === 'admin' ? 'Admin Chat' : 'Chat'

  panel = document.createElement('aside')
  panel.id = panelId
  panel.className = 'chat-slide-panel'
  panel.setAttribute('aria-hidden', 'true')
  panel.innerHTML = `
    <div class="chat-panel-head">
      <h3 class="chat-panel-title mb-0"><i class="bi bi-chat-dots me-2"></i>${title}</h3>
      <button type="button" class="chat-close-btn" data-chat-close="${panelId}" aria-label="Close chat">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="chat-panel-body">
      ${adminInbox}
      <div class="chat-thread-wrap">
        <div class="chat-thread" id="${mode}-chat-thread"></div>
        <p class="chat-status mb-0" aria-live="polite"></p>
        <form class="chat-input-row" id="${mode}-chat-form">
          <textarea id="${mode}-chat-input" rows="2" maxlength="1200" placeholder="Type your message..." required></textarea>
          <button type="submit" class="chat-send-btn" aria-label="Send message">
            <i class="bi bi-send-fill"></i>
          </button>
        </form>
      </div>
    </div>
  `

  document.body.appendChild(panel)
  return panel
}

async function fetchUserMessages(userId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, sender_user_id, recipient_user_id, sender_contact, body, is_read, created_at')
    .or(`sender_user_id.eq.${userId},recipient_user_id.eq.${userId}`)
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) throw new Error(error.message)
  return data || []
}

async function fetchAdminMessages() {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, sender_user_id, recipient_user_id, sender_contact, body, is_read, created_at')
    .order('created_at', { ascending: true })
    .limit(1000)

  if (error) throw new Error(error.message)
  return data || []
}

function renderThread(threadElement, messages, actorUserId, mode) {
  if (!threadElement) return

  if (!messages.length) {
    threadElement.innerHTML = '<p class="chat-empty mb-0">No messages yet.</p>'
    return
  }

  threadElement.innerHTML = messages
    .map((message) => {
      const mine = message.sender_user_id === actorUserId
      const senderLabel = mode === 'admin'
        ? (mine ? 'Admin' : 'User')
        : (mine ? 'You' : 'Support')

      return `
        <article class="chat-bubble ${mine ? 'is-mine' : ''}">
          <div class="chat-bubble-meta">
            <span>${senderLabel}</span>
            <small>${toTimeLabel(message.created_at)}</small>
          </div>
          <p class="chat-bubble-body mb-0">${escapeHtml(message.body)}</p>
        </article>
      `
    })
    .join('')

  threadElement.scrollTop = threadElement.scrollHeight
}

async function markConversationReadAsAdmin(userId) {
  if (!userId) return

  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('sender_user_id', userId)
    .is('recipient_user_id', null)
    .eq('is_read', false)
}

function closePanel(panel) {
  if (!panel) return
  panel.classList.remove('is-open')
  panel.setAttribute('aria-hidden', 'true')
}

function openPanel(panel) {
  if (!panel) return
  panel.classList.add('is-open')
  panel.setAttribute('aria-hidden', 'false')
}

export function teardownSiteChat() {
  if (siteChatState?.channel) {
    siteChatState.channel.unsubscribe()
  }
  if (siteChatState?.toggle) {
    siteChatState.toggle.classList.remove('is-blinking')
  }
  document.querySelector('#site-chat-panel')?.remove()
  siteChatState = null
}

export function teardownAdminChat() {
  if (adminChatState?.channel) {
    adminChatState.channel.unsubscribe()
  }
  if (adminChatState?.toggle) {
    adminChatState.toggle.classList.remove('is-blinking')
  }
  document.querySelector('#admin-chat-panel')?.remove()
  adminChatState = null
}

export async function initSiteChat() {
  teardownSiteChat()

  const toggle = document.querySelector('#chat-toggle-btn')
  if (!toggle || !supabase) return

  const { data: sessionData, error } = await supabase.auth.getSession()
  const user = sessionData?.session?.user
  if (error || !user) {
    toggle.classList.add('d-none')
    return
  }

  toggle.classList.remove('d-none')

  const panel = ensurePanel('site')
  const thread = panel.querySelector('#site-chat-thread')
  const form = panel.querySelector('#site-chat-form')
  const input = panel.querySelector('#site-chat-input')
  const closeButton = panel.querySelector('[data-chat-close="site-chat-panel"]')

  let messages = []

  const loadAndRender = async () => {
    try {
      messages = await fetchUserMessages(user.id)
      renderThread(thread, messages, user.id, 'site')
      setChatStatus(panel)

      const unreadCount = messages.filter((item) => item.sender_user_id !== user.id && !item.is_read).length
      setUnreadBadge(toggle, unreadCount)
    } catch (error) {
      setChatStatus(panel, `Chat load failed: ${error.message}`, 'error')
    }
  }

  const handleToggle = () => {
    const open = panel.classList.contains('is-open')
    if (open) {
      closePanel(panel)
    } else {
      openPanel(panel)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const body = String(input?.value || '').trim()
    if (!body) return

    try {
      const { error: insertError } = await supabase.from('chat_messages').insert({
        sender_user_id: user.id,
        recipient_user_id: null,
        sender_contact: getCurrentUserContact(user),
        body
      })

      if (insertError) {
        setChatStatus(panel, `Send failed: ${insertError.message}`, 'error')
        return
      }

      if (input) input.value = ''
      setChatStatus(panel)
      await loadAndRender()
    } catch (error) {
      setChatStatus(panel, `Send failed: ${error.message}`, 'error')
    }
  }

  const handleInputKeydown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    form?.requestSubmit()
  }

  toggle.addEventListener('click', handleToggle)
  closeButton?.addEventListener('click', () => closePanel(panel))
  form?.addEventListener('submit', handleSubmit)
  input?.addEventListener('keydown', handleInputKeydown)

  const channel = supabase
    .channel(`site-chat-${user.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, loadAndRender)
    .subscribe()

  siteChatState = { channel, toggle }
  await loadAndRender()
}

export async function initAdminChat() {
  teardownAdminChat()

  const toggle = document.querySelector('#admin-chat-toggle-btn')
  if (!toggle || !supabase) return

  const { data: sessionData, error } = await supabase.auth.getSession()
  const user = sessionData?.session?.user
  if (error || !user) {
    toggle.classList.add('d-none')
    return
  }

  toggle.classList.remove('d-none')

  const panel = ensurePanel('admin')
  const thread = panel.querySelector('#admin-chat-thread')
  const form = panel.querySelector('#admin-chat-form')
  const input = panel.querySelector('#admin-chat-input')
  const inbox = panel.querySelector('#admin-chat-conversation-list')
  const closeButton = panel.querySelector('[data-chat-close="admin-chat-panel"]')

  let allMessages = []
  let selectedUserId = ''

  const buildConversationModel = () => {
    const conversations = new Map()

    allMessages.forEach((item) => {
      const userId = item.recipient_user_id ? item.recipient_user_id : item.sender_user_id
      if (!userId || userId === user.id) return

      const model = conversations.get(userId) || {
        userId,
        contact: item.sender_contact || `user-${String(userId).slice(0, 8)}`,
        unread: false,
        latest: item
      }

      if (!model.contact || model.contact.startsWith('user-')) {
        if (item.sender_user_id === userId && item.sender_contact) {
          model.contact = item.sender_contact
        }
      }

      if (!model.latest || new Date(item.created_at) > new Date(model.latest.created_at)) {
        model.latest = item
      }

      if (item.sender_user_id === userId && item.recipient_user_id == null && !item.is_read) {
        model.unread = true
      }

      conversations.set(userId, model)
    })

    return [...conversations.values()].sort(
      (a, b) => new Date(b.latest?.created_at || 0).getTime() - new Date(a.latest?.created_at || 0).getTime()
    )
  }

  const renderInbox = (conversations) => {
    if (!inbox) return

    if (!conversations.length) {
      inbox.innerHTML = '<p class="chat-empty mb-0">No user messages yet.</p>'
      return
    }

    inbox.innerHTML = conversations
      .map((conversation) => {
        const activeClass = conversation.userId === selectedUserId ? 'is-active' : ''
        const unreadDot = conversation.unread ? '<span class="chat-conversation-dot"></span>' : ''

        return `
          <button type="button" class="chat-conversation-chip ${activeClass}" data-user-id="${conversation.userId}">
            <span class="chat-conversation-email">${escapeHtml(conversation.contact)}</span>
            ${unreadDot}
          </button>
        `
      })
      .join('')
  }

  const renderCurrentThread = () => {
    const threadMessages = allMessages.filter(
      (item) =>
        selectedUserId && (
          (item.sender_user_id === selectedUserId && item.recipient_user_id == null) ||
          (item.sender_user_id === user.id && item.recipient_user_id === selectedUserId)
        )
    )

    renderThread(thread, threadMessages, user.id, 'admin')
  }

  const syncAndRender = async () => {
    try {
      allMessages = await fetchAdminMessages()
      const conversations = buildConversationModel()

      if (!selectedUserId && conversations.length) {
        selectedUserId = conversations[0].userId
      }

      renderInbox(conversations)
      renderCurrentThread()
      setChatStatus(panel)

      const unreadUsersCount = conversations.filter((item) => item.unread).length
      setUnreadBadge(toggle, unreadUsersCount)
    } catch (error) {
      setChatStatus(panel, `Chat load failed: ${error.message}`, 'error')
    }
  }

  const handleToggle = async () => {
    const open = panel.classList.contains('is-open')
    if (open) {
      closePanel(panel)
      return
    }

    openPanel(panel)

    if (selectedUserId) {
      await markConversationReadAsAdmin(selectedUserId)
      await syncAndRender()
    }
  }

  const handleInboxClick = async (event) => {
    const button = event.target.closest('.chat-conversation-chip')
    if (!button) return

    selectedUserId = String(button.dataset.userId || '').trim()
    if (!selectedUserId) return

    await markConversationReadAsAdmin(selectedUserId)
    await syncAndRender()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const body = String(input?.value || '').trim()
    if (!body || !selectedUserId) return

    try {
      const { error: insertError } = await supabase.from('chat_messages').insert({
        sender_user_id: user.id,
        recipient_user_id: selectedUserId,
        sender_contact: 'Admin',
        body,
        is_read: true
      })

      if (insertError) {
        setChatStatus(panel, `Send failed: ${insertError.message}`, 'error')
        return
      }

      if (input) input.value = ''
      setChatStatus(panel)
      await syncAndRender()
    } catch (error) {
      setChatStatus(panel, `Send failed: ${error.message}`, 'error')
    }
  }

  const handleInputKeydown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    form?.requestSubmit()
  }

  toggle.addEventListener('click', handleToggle)
  closeButton?.addEventListener('click', () => closePanel(panel))
  inbox?.addEventListener('click', handleInboxClick)
  form?.addEventListener('submit', handleSubmit)
  input?.addEventListener('keydown', handleInputKeydown)

  const channel = supabase
    .channel(`admin-chat-${user.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, syncAndRender)
    .subscribe()

  adminChatState = { channel, toggle }
  await syncAndRender()
}
