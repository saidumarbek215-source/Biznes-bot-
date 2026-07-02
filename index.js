import TelegramBot from 'node-telegram-bot-api'
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

const TOKEN          = process.env.BOT_TOKEN
const OWNER_ID       = Number(process.env.OWNER_ID)
const GROUP_ID       = Number(process.env.GROUP_ID)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'

if (!TOKEN)    throw new Error('BOT_TOKEN .env faylida yo\'q')
if (!GROUP_ID) throw new Error('GROUP_ID .env faylida yo\'q')

const bot = new TelegramBot(TOKEN, { polling: true })

// ─── Config ────────────────────────────────────────────────────────────────────

const CONFIG_PATH = join(__dir, 'config.json')
const STATS_PATH  = join(__dir, 'stats.json')

function loadConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
}

function saveConfig(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8')
}

function loadStats() {
  try { return JSON.parse(readFileSync(STATS_PATH, 'utf-8')) }
  catch { return { total: 0, approved: 0, rejected: 0 } }
}

function incStat(key) {
  const s = loadStats()
  s[key] = (s[key] || 0) + 1
  writeFileSync(STATS_PATH, JSON.stringify(s, null, 2), 'utf-8')
}

// ─── Dialog state ──────────────────────────────────────────────────────────────
// steps: name → phone → description → photo → conditions → waiting_receipt
// dialogs: userId → { step, categoryIdx, name, phone, description, adPhotoFileId, conditions }
// pending: userId → { ...dialog + userId, username, receiptFileId }

const dialogs    = new Map()
const pending    = new Map()
const adminState = new Map()  // OWNER_ID → { step, ...data }

function getDialog(uid)       { return dialogs.get(uid) ?? null }
function setDialog(uid, d)    { dialogs.set(uid, d) }
function clearDialog(uid)     { dialogs.delete(uid) }

// ─── Text builders ─────────────────────────────────────────────────────────────

function fmt(n) { return Number(n).toLocaleString('ru-RU') }

function categoryKeyboard(categories) {
  const rows = []
  for (let i = 0; i < categories.length; i += 2) {
    const row = [{ text: categories[i].name, callback_data: `cat_${i}` }]
    if (categories[i + 1]) row.push({ text: categories[i + 1].name, callback_data: `cat_${i + 1}` })
    rows.push(row)
  }
  return { inline_keyboard: rows }
}

async function showStart(chatId) {
  const { categories } = loadConfig()
  await bot.sendMessage(
    chatId,
    'Assalomu alaykum! Biznes Hamkorlar botiga xush kelibsiz! 🤝\n\n' +
    "Biznesingizni targ'ib qiling va yangi hamkorlar toping.\n\n" +
    'Kategoriyani tanlang 👇',
    { reply_markup: categoryKeyboard(categories) }
  )
}

function buildSummaryText(d, cfg) {
  const cat = cfg.categories[d.categoryIdx]
  return [
    '✅ <b>Arizangiz:</b>',
    '',
    `📂 Kategoriya: <b>${cat.name}</b>`,
    `👤 Ism: ${d.name}`,
    `📞 Telefon: ${d.phone}`,
    `📝 Ma'lumot: ${d.description}`,
    d.conditions ? `💰 Narx/shartlar: ${d.conditions}` : null,
    '',
    `💰 To'lov: <b>${fmt(cat.price)} so'm</b>`,
    '',
    "To'lov qilish uchun:",
    `💳 Karta: <code>${cfg.card_number}</code>`,
    `👤 Egasi: ${cfg.card_holder}`,
    '',
    "To'lovni amalga oshirib, chekni yuboring 📸",
  ].filter(l => l !== null).join('\n')
}

function buildOwnerText(p, cfg) {
  const cat     = cfg.categories[p.categoryIdx]
  const userStr = p.username ? `@${p.username}` : `#${p.userId}`
  return [
    "💳 <b>Yangi to'lov!</b>",
    '',
    `👤 ${p.name} (${userStr})`,
    `📞 ${p.phone}`,
    `📂 ${cat.name}`,
    `💰 ${fmt(cat.price)} so'm`,
  ].join('\n')
}

function buildGroupPostText(p, cfg, botUsername) {
  const cat   = cfg.categories[p.categoryIdx]
  const lines = [
    `📂 <b>${cat.name.toUpperCase()}</b>`,
    '',
    `👤 ${p.name}`,
    `📞 ${p.phone}`,
    `📝 ${p.description}`,
  ]
  if (p.conditions) lines.push(`💰 ${p.conditions}`)
  lines.push('', '✅ Tasdiqlangan', '', `🤖 @${botUsername} orqali yuborildi`)
  return lines.join('\n')
}

// ─── Commands ──────────────────────────────────────────────────────────────────

bot.onText(/^\/start/, async (msg) => {
  if (msg.chat.type !== 'private') return
  clearDialog(msg.from.id)
  await showStart(msg.chat.id)
})

bot.onText(/^\/cancel/, async (msg) => {
  if (msg.chat.type !== 'private') return
  clearDialog(msg.from.id)
  adminState.delete(msg.from.id)
  await bot.sendMessage(msg.chat.id, 'Bekor qilindi.')
  if (Number(msg.from.id) !== OWNER_ID) await showStart(msg.chat.id)
})

// Admin: show prices list
bot.onText(/^\/prices/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const cfg = loadConfig()
  const lines = ['📋 <b>Kategoriyalar narxlari:</b>', '']
  cfg.categories.forEach((cat, i) => {
    lines.push(`${i + 1}. ${cat.name} — <b>${fmt(cat.price)} so'm</b>`)
  })
  const buttons = cfg.categories.map((cat, i) => [{ text: `✏️ ${i + 1}. ${cat.name}`, callback_data: `edit_price_${i}` }])
  await bot.sendMessage(msg.chat.id, lines.join('\n'), {
    parse_mode:   'HTML',
    reply_markup: { inline_keyboard: buttons },
  })
})

// Admin: /setprice <num> <price>
bot.onText(/^\/setprice\s+(\d+)\s+(\d+)/, async (msg, match) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const idx   = Number(match[1]) - 1
  const price = Number(match[2])
  const cfg   = loadConfig()
  if (idx < 0 || idx >= cfg.categories.length) {
    await bot.sendMessage(msg.chat.id, `❌ Raqam 1–${cfg.categories.length} oralig'ida bo'lishi kerak.`)
    return
  }
  cfg.categories[idx].price = price
  saveConfig(cfg)
  await bot.sendMessage(
    msg.chat.id,
    `✅ <b>${cfg.categories[idx].name}</b> narxi <b>${fmt(price)} so'm</b>ga o'zgartirildi`,
    { parse_mode: 'HTML' }
  )
})

// Admin: /setcard <card_number>
bot.onText(/^\/setcard (.+)/, async (msg, match) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const cfg = loadConfig()
  cfg.card_number = match[1].trim()
  saveConfig(cfg)
  await bot.sendMessage(msg.chat.id, `✅ Karta raqami: <code>${cfg.card_number}</code>`, { parse_mode: 'HTML' })
})

// Admin: /settopic <num> <thread_id> — set group topic ID for a category
bot.onText(/^\/settopic\s+(\d+)\s+(\d+)/, async (msg, match) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const idx      = Number(match[1]) - 1
  const threadId = Number(match[2])
  const cfg      = loadConfig()
  if (idx < 0 || idx >= cfg.categories.length) {
    await bot.sendMessage(msg.chat.id, `❌ Raqam 1–${cfg.categories.length} oralig'ida bo'lishi kerak.`)
    return
  }
  cfg.categories[idx].topic_id = threadId
  saveConfig(cfg)
  await bot.sendMessage(
    msg.chat.id,
    `✅ <b>${cfg.categories[idx].name}</b> uchun mavzu ID = <code>${threadId}</code>`,
    { parse_mode: 'HTML' }
  )
})

// Admin: /threadid — send inside a group topic to discover its thread_id
bot.onText(/^\/threadid/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const tid = msg.message_thread_id ?? null
  await bot.sendMessage(
    msg.chat.id,
    tid ? `Thread ID: <code>${tid}</code>` : "Bu oddiy chat — thread_id aniqlanmadi.",
    { parse_mode: 'HTML', ...(tid ? { message_thread_id: tid } : {}) }
  )
})

// Admin: /stats
bot.onText(/^\/stats/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const s = loadStats()
  await bot.sendMessage(msg.chat.id, [
    '📊 <b>Statistika:</b>',
    '',
    `📨 Jami cheklar: <b>${s.total}</b>`,
    `✅ Tasdiqlangan: <b>${s.approved}</b>`,
    `❌ Rad etilgan: <b>${s.rejected}</b>`,
  ].join('\n'), { parse_mode: 'HTML' })
})

// Admin: /admin — interactive panel
bot.onText(/^\/admin/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  adminState.delete(OWNER_ID)
  await showAdminMenu(msg.chat.id)
})

async function showAdminMenu(chatId) {
  await bot.sendMessage(chatId, '⚙️ <b>Admin panel</b>', {
    parse_mode:   'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Kartani o'zgartirish",   callback_data: 'admin_card'   }],
        [{ text: "💰 Narxlarni o'zgartirish", callback_data: 'admin_prices' }],
        [{ text: '📊 Statistika',              callback_data: 'admin_stats'  }],
      ],
    },
  })
}

async function handleAdminInput(chatId, text, as) {
  const cfg = loadConfig()

  if (as.step === 'card_number') {
    adminState.set(OWNER_ID, { step: 'card_holder', card_number: text })
    await bot.sendMessage(chatId, "Karta egasining ismini yuboring:")
    return
  }

  if (as.step === 'card_holder') {
    cfg.card_number = as.card_number
    cfg.card_holder = text
    saveConfig(cfg)
    adminState.delete(OWNER_ID)
    await bot.sendMessage(chatId, "✅ Karta ma'lumotlari yangilandi!")
    await showAdminMenu(chatId)
    return
  }

  if (as.step === 'price_input') {
    const price = Number(String(text).replace(/\s/g, ''))
    if (!price || isNaN(price) || price <= 0) {
      await bot.sendMessage(chatId, "❌ Noto'g'ri raqam. Faqat son yuboring:")
      return
    }
    cfg.categories[as.categoryIdx].price = price
    saveConfig(cfg)
    adminState.delete(OWNER_ID)
    await bot.sendMessage(chatId, `✅ Narx yangilandi: <b>${fmt(price)} so'm</b>`, { parse_mode: 'HTML' })
    await showAdminMenu(chatId)
    return
  }
}

// ─── Message handler ───────────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.from || msg.chat.type !== 'private') return

  const userId = msg.from.id
  const text   = (msg.text || '').trim()

  // Admin input takes priority for owner
  if (userId === OWNER_ID && text && !text.startsWith('/')) {
    const as = adminState.get(OWNER_ID)
    if (as) { await handleAdminInput(msg.chat.id, text, as); return }
  }

  // Let only /skip pass to dialog steps; all other commands are handled by onText above
  if (text.startsWith('/')) {
    const d     = getDialog(userId)
    const okSkip = d && (d.step === 'photo' || d.step === 'conditions') && text === '/skip'
    if (!okSkip) return
  }

  const d = getDialog(userId)
  if (!d) return

  // Photo message
  if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id
    if (d.step === 'photo') {
      d.adPhotoFileId = fileId
      d.step = 'conditions'
      setDialog(userId, d)
      await bot.sendMessage(msg.chat.id, "Narx yoki hamkorlik shartlari? (/skip)")
      return
    }
    if (d.step === 'waiting_receipt') {
      await handleReceipt(msg, fileId, d)
      return
    }
    return
  }

  if (!text) return

  switch (d.step) {
    case 'name':
      d.name = text
      d.step = 'phone'
      setDialog(userId, d)
      await bot.sendMessage(msg.chat.id, 'Telefon raqamingiz? 📞')
      break

    case 'phone':
      d.phone = text
      d.step  = 'description'
      setDialog(userId, d)
      await bot.sendMessage(msg.chat.id, "Mahsulot/xizmat haqida yozing 📝")
      break

    case 'description':
      d.description = text
      d.step        = 'photo'
      setDialog(userId, d)
      await bot.sendMessage(msg.chat.id, "Rasm yuborasizmi? (/skip)")
      break

    case 'photo':
      if (text === '/skip') {
        d.adPhotoFileId = null
        d.step = 'conditions'
        setDialog(userId, d)
        await bot.sendMessage(msg.chat.id, "Narx yoki hamkorlik shartlari? (/skip)")
      } else {
        await bot.sendMessage(msg.chat.id, "Rasm yuboring yoki /skip yozing")
      }
      break

    case 'conditions':
      d.conditions = text === '/skip' ? null : text
      d.step       = 'waiting_receipt'
      setDialog(userId, d)
      await bot.sendMessage(msg.chat.id, buildSummaryText(d, loadConfig()), { parse_mode: 'HTML' })
      break

    case 'waiting_receipt':
      await bot.sendMessage(msg.chat.id, "To'lov cheki (rasm) yuboring 📸")
      break
  }
})

async function handleReceipt(msg, fileId, d) {
  const userId   = msg.from.id
  const username = msg.from.username ?? null
  const cfg      = loadConfig()
  const p        = { ...d, userId, username, receiptFileId: fileId }

  const ownerMsg = await bot.sendPhoto(OWNER_ID, fileId, {
    caption:      buildOwnerText(p, cfg),
    parse_mode:   'HTML',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Tasdiqlash', callback_data: `approve_${userId}` },
        { text: '❌ Rad etish',  callback_data: `reject_${userId}`  },
      ]],
    },
  })

  pending.set(userId, { ...p, ownerMsgId: ownerMsg.message_id })
  clearDialog(userId)
  incStat('total')

  await bot.sendMessage(msg.chat.id, "✅ Chek yuborildi! Admin tekshirib, tasdiqlaydi.\nKutib turing... ⏳")
}

// ─── Callback query handler ────────────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const fromId = query.from.id
  const chatId = query.message?.chat?.id
  const msgId  = query.message?.message_id
  const data   = query.data || ''

  // Category selection
  if (data.startsWith('cat_')) {
    const idx = Number(data.slice(4))
    const cfg = loadConfig()
    if (idx < 0 || idx >= cfg.categories.length) { await bot.answerCallbackQuery(query.id); return }

    clearDialog(fromId)
    setDialog(fromId, {
      step: 'name', categoryIdx: idx,
      name: null, phone: null, description: null, adPhotoFileId: null, conditions: null,
    })
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, 'Kompaniyangiz/ismingiz? 👤')
    return
  }

  // ── Admin panel callbacks ──────────────────────────────────────────────────

  if (data === 'admin_main') {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    adminState.delete(OWNER_ID)
    await bot.answerCallbackQuery(query.id)
    await showAdminMenu(chatId)
    return
  }

  if (data === 'admin_card') {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    adminState.set(OWNER_ID, { step: 'card_number' })
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, "Yangi karta raqamini yuboring:")
    return
  }

  if (data === 'admin_prices') {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const cfg     = loadConfig()
    const buttons = cfg.categories.map((cat, i) => [{
      text:          `${i + 1}. ${cat.name} — ${fmt(cat.price)} so'm`,
      callback_data: `admin_cat_${i}`,
    }])
    buttons.push([{ text: '🔙 Orqaga', callback_data: 'admin_main' }])
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, "💰 <b>Kategoriyalar narxlari:</b>", {
      parse_mode:   'HTML',
      reply_markup: { inline_keyboard: buttons },
    })
    return
  }

  if (data.startsWith('admin_cat_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const idx = Number(data.slice(10))
    const cfg = loadConfig()
    const cat = cfg.categories[idx]
    if (!cat) { await bot.answerCallbackQuery(query.id); return }
    adminState.set(OWNER_ID, { step: 'price_input', categoryIdx: idx })
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId,
      `<b>${cat.name}</b> uchun yangi narxni yuboring:\n(Joriy: ${fmt(cat.price)} so'm)`,
      { parse_mode: 'HTML' }
    )
    return
  }

  if (data === 'admin_stats') {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const s = loadStats()
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, [
      '📊 <b>Statistika:</b>',
      '',
      `✅ Tasdiqlangan: <b>${s.approved}</b> ta`,
      `❌ Rad etilgan: <b>${s.rejected}</b> ta`,
      `⏳ Kutilmoqda: <b>${pending.size}</b> ta`,
    ].join('\n'), { parse_mode: 'HTML' })
    return
  }

  // Edit price prompt (admin, legacy /prices command)
  if (data.startsWith('edit_price_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const idx = Number(data.slice(11))
    const cfg = loadConfig()
    const cat = cfg.categories[idx]
    if (!cat) { await bot.answerCallbackQuery(query.id); return }
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId,
      `${idx + 1}. <b>${cat.name}</b>\nJoriy narx: <b>${fmt(cat.price)} so'm</b>\n\n` +
      `Yangi narx:\n<code>/setprice ${idx + 1} YANGI_NARX</code>`,
      { parse_mode: 'HTML' }
    )
    return
  }

  // Approve (admin only)
  if (data.startsWith('approve_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const targetId = Number(data.slice(8))
    const p = pending.get(targetId)
    if (!p) { await bot.answerCallbackQuery(query.id, { text: "Ariza topilmadi (eskirgan)" }); return }

    await bot.answerCallbackQuery(query.id, { text: '✅ Tasdiqlandi' })
    pending.delete(targetId)
    incStat('approved')

    // Post to group
    try {
      const me        = await bot.getMe()
      const cfg       = loadConfig()
      const cat       = cfg.categories[p.categoryIdx]
      const postText  = buildGroupPostText(p, cfg, me.username)
      const threadOpt = cat.topic_id ? { message_thread_id: Number(cat.topic_id) } : {}

      if (p.adPhotoFileId) {
        await bot.sendPhoto(GROUP_ID, p.adPhotoFileId, { caption: postText, parse_mode: 'HTML', ...threadOpt })
      } else {
        await bot.sendMessage(GROUP_ID, postText, { parse_mode: 'HTML', ...threadOpt })
      }
    } catch (err) {
      console.error('Group post failed:', err.message)
    }

    // Update owner message
    try {
      await bot.editMessageCaption(
        (query.message.caption || '') + '\n\n✅ Tasdiqlandi',
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
      )
    } catch {}

    await bot.sendMessage(targetId, "🎉 To'lovingiz tasdiqlandi!\nArizangiz kanalga joylashtirildi ✅")
    return
  }

  // Reject (admin only)
  if (data.startsWith('reject_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const targetId = Number(data.slice(7))
    const p = pending.get(targetId)
    if (!p) { await bot.answerCallbackQuery(query.id, { text: "Ariza topilmadi" }); return }

    await bot.answerCallbackQuery(query.id, { text: '❌ Rad etildi' })
    pending.delete(targetId)
    incStat('rejected')

    try {
      await bot.editMessageCaption(
        (query.message.caption || '') + '\n\n❌ Rad etildi',
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
      )
    } catch {}

    await bot.sendMessage(
      targetId,
      `❌ To'lovingiz tasdiqlanmadi.\nSavol uchun adminga yozing: @${ADMIN_USERNAME}`
    )
    return
  }

  await bot.answerCallbackQuery(query.id)
})

// ─── Error handling ────────────────────────────────────────────────────────────

bot.on('polling_error', (err) => console.error('[polling]', err.code, err.message))
bot.on('error',         (err) => console.error('[error]',   err.message))

console.log('✅ Biznes Hamkorlar bot ishga tushdi')
