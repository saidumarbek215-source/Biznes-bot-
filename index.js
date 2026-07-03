import http from 'http'
import TelegramBot from 'node-telegram-bot-api'
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const PORT = process.env.PORT || 3000
http.createServer((req, res) => { res.writeHead(200); res.end('Bot is running!') }).listen(PORT)

const __dir = dirname(fileURLToPath(import.meta.url))

const TOKEN          = process.env.BOT_TOKEN
const OWNER_ID       = Number(process.env.OWNER_ID)
const GROUP_ID       = Number(process.env.GROUP_ID)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'

if (!TOKEN)    throw new Error("BOT_TOKEN .env faylida yo'q")
if (!GROUP_ID) throw new Error("GROUP_ID .env faylida yo'q")

const bot = new TelegramBot(TOKEN, { polling: true })

// ─── Config & Stats ───────────────────────────────────────────────────────────

const CONFIG_PATH = join(__dir, 'config.json')
const STATS_PATH  = join(__dir, 'stats.json')

function loadConfig() { return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) }
function saveConfig(cfg) { writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8') }
function loadStats() {
  try { return JSON.parse(readFileSync(STATS_PATH, 'utf-8')) }
  catch { return { total: 0, approved: 0, rejected: 0 } }
}
function incStat(key) {
  const s = loadStats()
  s[key]  = (s[key] || 0) + 1
  writeFileSync(STATS_PATH, JSON.stringify(s, null, 2), 'utf-8')
}

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  uz: {
    menu:           "📋 MENYU\n\nXabar turi:",
    menuSell:       "📢 Sotaman",
    menuBuy:        "🛒 Sotib olaman",
    menuService:    "🔧 Xizmat ko'rsataman",
    menuMyAds:      "📋 Mening e'lonlarim",
    menuAccount:    "💰 Mening hisobim",
    menuSettings:   "⚙️ Sozlamalar",
    chooseCategory: "📂 Kategoriyani tanlang:",
    askName:        "Kompaniyangiz yoki ismingiz? 👤",
    askPhone:       "📱 Telefon raqamingizni yuboring:",
    phoneBtn:       "📱 Telefon raqamimni yuborish",
    usePhoneBtn:    "Iltimos, quyidagi tugmani bosing 👇",
    askDescription: "Mahsulot yoki xizmat haqida yozing 📝",
    askPhoto:       "Rasm yuborasizmi? (/skip)",
    askPrice:       "Narx yoki shartlar? (/skip)",
    previewTitle:   "👀 E'loningizni tekshiring:",
    previewCat:     "📂 Kategoriya",
    previewType:    "📢 Turi",
    previewName:    "👤 Ism",
    previewPhone:   "📞 Telefon",
    previewDesc:    "📝 Tavsif",
    previewPrice:   "💰 Narx",
    previewPhoto:   "🖼 Rasm",
    photoYes:       "bor",
    photoNo:        "yo'q",
    previewQ:       "Hammasi to'g'rimi?",
    btnConfirm:     "✅ Ha, to'lovga o'tish",
    btnEdit:        "✏️ Tahrirlash",
    btnCancel:      "❌ Bekor qilish",
    editTitle:      "Nimani o'zgartirish?",
    editName:       "👤 Ism",
    editPhone:      "📞 Telefon",
    editDesc:       "📝 Tavsif",
    editPrice:      "💰 Narx",
    editPhoto:      "🖼 Rasm",
    editAskName:    "Yangi ism yuboring:",
    editAskPhone:   "Yangi telefon raqamini yuboring:",
    editAskDesc:    "Yangi tavsifni yuboring:",
    editAskPrice:   "Yangi narxni yuboring (/skip):",
    editAskPhoto:   "Yangi rasm yuboring (/skip):",
    payTitle:       "💳 To'lov ma'lumotlari:",
    payCard:        "Karta",
    payHolder:      "Egasi",
    payAmount:      "Summa",
    payInstruct:    "To'lovni amalga oshirib, chekni yuboring 📸",
    copyCard:       "📋 Karta raqamini nusxalash",
    waitReceipt:    "To'lov cheki (rasm) yuboring 📸",
    receiptSent:    "✅ Chek yuborildi! Admin tekshirib, tasdiqlaydi.\nKutib turing... ⏳",
    approved:       "🎉 To'lovingiz tasdiqlandi!\nArizangiz kanalga joylashtirildi ✅",
    rejected:       "❌ To'lovingiz tasdiqlanmadi.\nSavol uchun: @",
    cancelled:      "Bekor qilindi. /start ni bosing.",
    comingSoon:     "Bu funksiya tez orada qo'shiladi 🔜",
    noAds:          "Sizda hozircha e'lonlar yo'q.",
    sendPhotoOrSkip:"Rasm yuboring yoki /skip yozing",
    typeSell:       "Sotaman",
    typeBuy:        "Sotib olaman",
    typeService:    "Xizmat",
  },
  ru: {
    menu:           "📋 МЕНЮ\n\nТип сообщения:",
    menuSell:       "📢 Продам",
    menuBuy:        "🛒 Покупаю",
    menuService:    "🔧 Оказываю услугу",
    menuMyAds:      "📋 Мои объявления",
    menuAccount:    "💰 Мой счет",
    menuSettings:   "⚙️ Настройки",
    chooseCategory: "📂 Выберите категорию:",
    askName:        "Название компании или ваше имя? 👤",
    askPhone:       "📱 Отправьте ваш номер телефона:",
    phoneBtn:       "📱 Отправить мой номер телефона",
    usePhoneBtn:    "Пожалуйста, нажмите кнопку ниже 👇",
    askDescription: "Напишите о товаре или услуге 📝",
    askPhoto:       "Прикрепите фото? (/skip)",
    askPrice:       "Цена или условия? (/skip)",
    previewTitle:   "👀 Проверьте ваше объявление:",
    previewCat:     "📂 Категория",
    previewType:    "📢 Тип",
    previewName:    "👤 Имя",
    previewPhone:   "📞 Телефон",
    previewDesc:    "📝 Описание",
    previewPrice:   "💰 Цена",
    previewPhoto:   "🖼 Фото",
    photoYes:       "есть",
    photoNo:        "нет",
    previewQ:       "Всё верно?",
    btnConfirm:     "✅ Да, перейти к оплате",
    btnEdit:        "✏️ Редактировать",
    btnCancel:      "❌ Отмена",
    editTitle:      "Что изменить?",
    editName:       "👤 Имя",
    editPhone:      "📞 Телефон",
    editDesc:       "📝 Описание",
    editPrice:      "💰 Цену",
    editPhoto:      "🖼 Фото",
    editAskName:    "Введите новое имя:",
    editAskPhone:   "Отправьте новый номер:",
    editAskDesc:    "Введите новое описание:",
    editAskPrice:   "Введите новую цену (/skip):",
    editAskPhoto:   "Отправьте новое фото (/skip):",
    payTitle:       "💳 Реквизиты оплаты:",
    payCard:        "Карта",
    payHolder:      "Владелец",
    payAmount:      "Сумма",
    payInstruct:    "Сделайте перевод и отправьте чек 📸",
    copyCard:       "📋 Скопировать номер карты",
    waitReceipt:    "Отправьте фото чека об оплате 📸",
    receiptSent:    "✅ Чек отправлен! Администратор проверит и подтвердит.\nПодождите... ⏳",
    approved:       "🎉 Оплата подтверждена!\nВаше объявление опубликовано ✅",
    rejected:       "❌ Оплата не подтверждена.\nВопросы: @",
    cancelled:      "Отменено. Нажмите /start.",
    comingSoon:     "Эта функция скоро появится 🔜",
    noAds:          "У вас пока нет объявлений.",
    sendPhotoOrSkip:"Отправьте фото или напишите /skip",
    typeSell:       "Продам",
    typeBuy:        "Покупаю",
    typeService:    "Услуга",
  },
}

function tr(lang, key) { return T[lang]?.[key] ?? T.uz[key] ?? key }

// ─── State ────────────────────────────────────────────────────────────────────
// Steps: lang_select → menu → category → name → phone → description →
//        photo → price → preview → waiting_receipt
// Edit steps: edit_name | edit_phone | edit_desc | edit_price | edit_photo

const dialogs    = new Map()
const pending    = new Map()
const adminState = new Map()

function getDialog(uid)    { return dialogs.get(uid) ?? null }
function setDialog(uid, d) { dialogs.set(uid, d) }
function clearDialog(uid)  { dialogs.delete(uid) }
function getUserLang(uid)  { return dialogs.get(uid)?.lang ?? 'uz' }

// ─── Keyboards ────────────────────────────────────────────────────────────────

function langKeyboard() {
  return {
    inline_keyboard: [[
      { text: "🇺🇿 O'zbek",    callback_data: 'lang_uz' },
      { text: '🇷🇺 Русский', callback_data: 'lang_ru' },
    ]],
  }
}

function mainMenuKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: tr(lang, 'menuSell'),     callback_data: 'menu_sell'     }],
      [{ text: tr(lang, 'menuBuy'),      callback_data: 'menu_buy'      }],
      [{ text: tr(lang, 'menuService'),  callback_data: 'menu_service'  }],
      [{ text: tr(lang, 'menuMyAds'),    callback_data: 'menu_myads'    }],
      [{ text: tr(lang, 'menuAccount'),  callback_data: 'menu_account'  }],
      [{ text: tr(lang, 'menuSettings'), callback_data: 'menu_settings' }],
    ],
  }
}

function categoryKeyboard(categories) {
  const rows = []
  for (let i = 0; i < categories.length; i += 2) {
    const row = [{ text: categories[i].name, callback_data: `cat_${i}` }]
    if (categories[i + 1]) row.push({ text: categories[i + 1].name, callback_data: `cat_${i + 1}` })
    rows.push(row)
  }
  return { inline_keyboard: rows }
}

function previewKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: tr(lang, 'btnConfirm'), callback_data: 'preview_confirm' }],
      [
        { text: tr(lang, 'btnEdit'),   callback_data: 'preview_edit'   },
        { text: tr(lang, 'btnCancel'), callback_data: 'preview_cancel' },
      ],
    ],
  }
}

function editFieldKeyboard(lang) {
  return {
    inline_keyboard: [
      [
        { text: tr(lang, 'editName'),  callback_data: 'ef_name'  },
        { text: tr(lang, 'editPhone'), callback_data: 'ef_phone' },
      ],
      [
        { text: tr(lang, 'editDesc'),  callback_data: 'ef_desc'  },
        { text: tr(lang, 'editPrice'), callback_data: 'ef_price' },
      ],
      [
        { text: tr(lang, 'editPhoto'), callback_data: 'ef_photo' },
      ],
    ],
  }
}

function phoneKeyboard(lang) {
  return {
    keyboard: [[{ text: tr(lang, 'phoneBtn'), request_contact: true }]],
    resize_keyboard:   true,
    one_time_keyboard: true,
  }
}

// ─── Text builders ────────────────────────────────────────────────────────────

function fmt(n) { return Number(n).toLocaleString('ru-RU') }

function adTypeName(lang, adType) {
  if (adType === 'sell')    return tr(lang, 'typeSell')
  if (adType === 'buy')     return tr(lang, 'typeBuy')
  if (adType === 'service') return tr(lang, 'typeService')
  return adType
}

function buildPreviewText(d, cfg, lang) {
  const cat = cfg.categories[d.categoryIdx]
  return [
    `<b>${tr(lang, 'previewTitle')}</b>`,
    '',
    `${tr(lang, 'previewCat')}: <b>${cat.name}</b>`,
    `${tr(lang, 'previewType')}: ${adTypeName(lang, d.adType)}`,
    `${tr(lang, 'previewName')}: ${d.name}`,
    `${tr(lang, 'previewPhone')}: ${d.phone}`,
    `${tr(lang, 'previewDesc')}: ${d.description}`,
    `${tr(lang, 'previewPrice')}: ${d.conditions ?? '—'}`,
    `${tr(lang, 'previewPhoto')}: ${d.adPhotoFileId ? tr(lang, 'photoYes') : tr(lang, 'photoNo')}`,
    '',
    tr(lang, 'previewQ'),
  ].join('\n')
}

function buildPaymentText(d, cfg, lang) {
  const cat = cfg.categories[d.categoryIdx]
  return [
    `<b>${tr(lang, 'payTitle')}</b>`,
    `${tr(lang, 'payCard')}: <code>${cfg.card_number}</code>`,
    `${tr(lang, 'payHolder')}: ${cfg.card_holder}`,
    `${tr(lang, 'payAmount')}: <b>${fmt(cat.price)} so'm</b>`,
    '',
    tr(lang, 'payInstruct'),
  ].join('\n')
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
    `📢 ${adTypeName('uz', p.adType)}`,
    `💰 ${fmt(cat.price)} so'm`,
  ].join('\n')
}

function buildGroupPostText(p, cfg, botUsername) {
  const cat   = cfg.categories[p.categoryIdx]
  const lines = [
    `📂 <b>${cat.name.toUpperCase()}</b>`,
    `📢 ${adTypeName('uz', p.adType)}`,
    '',
    `👤 ${p.name}`,
    `📞 ${p.phone}`,
    `📝 ${p.description}`,
  ]
  if (p.conditions) lines.push(`💰 ${p.conditions}`)
  lines.push('', '✅ Tasdiqlangan', '', `🤖 @${botUsername} orqali yuborildi`)
  return lines.join('\n')
}

// ─── Flow helpers ─────────────────────────────────────────────────────────────

async function showLangSelect(chatId) {
  await bot.sendMessage(chatId, 'Tilni tanlang / Выберите язык:', {
    reply_markup: langKeyboard(),
  })
}

async function showMainMenu(chatId, lang) {
  await bot.sendMessage(chatId, tr(lang, 'menu'), {
    parse_mode:   'HTML',
    reply_markup: mainMenuKeyboard(lang),
  })
}

async function askPhone(chatId, lang) {
  await bot.sendMessage(chatId, tr(lang, 'askPhone'), {
    reply_markup: phoneKeyboard(lang),
  })
}

async function removeKeyboard(chatId, text) {
  await bot.sendMessage(chatId, text, {
    reply_markup: { remove_keyboard: true },
  })
}

async function showPreview(chatId, d) {
  const cfg  = loadConfig()
  const lang = d.lang
  const text = buildPreviewText(d, cfg, lang)
  d.step = 'preview'
  setDialog(d._uid, d)
  if (d.adPhotoFileId) {
    await bot.sendPhoto(chatId, d.adPhotoFileId, {
      caption:      text,
      parse_mode:   'HTML',
      reply_markup: previewKeyboard(lang),
    })
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode:   'HTML',
      reply_markup: previewKeyboard(lang),
    })
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

bot.onText(/^\/start/, async (msg) => {
  if (msg.chat.type !== 'private') return
  console.log(`[START] User: ${msg.from.id} @${msg.from.username}`)
  clearDialog(msg.from.id)
  adminState.delete(msg.from.id)
  await showLangSelect(msg.chat.id)
})

bot.onText(/^\/cancel/, async (msg) => {
  if (msg.chat.type !== 'private') return
  const lang = getUserLang(msg.from.id)
  clearDialog(msg.from.id)
  adminState.delete(msg.from.id)
  await bot.sendMessage(msg.chat.id, tr(lang, 'cancelled'), {
    reply_markup: { remove_keyboard: true },
  })
})

// ─── Admin commands ───────────────────────────────────────────────────────────

bot.onText(/^\/prices/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const cfg     = loadConfig()
  const lines   = ['📋 <b>Kategoriyalar narxlari:</b>', '']
  cfg.categories.forEach((cat, i) => {
    lines.push(`${i + 1}. ${cat.name} — <b>${fmt(cat.price)} so'm</b>`)
  })
  const buttons = cfg.categories.map((cat, i) => [{
    text: `✏️ ${i + 1}. ${cat.name}`, callback_data: `admin_editprice_${i}`,
  }])
  await bot.sendMessage(msg.chat.id, lines.join('\n'), {
    parse_mode:   'HTML',
    reply_markup: { inline_keyboard: buttons },
  })
})

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
  await bot.sendMessage(msg.chat.id,
    `✅ <b>${cfg.categories[idx].name}</b> narxi <b>${fmt(price)} so'm</b>ga o'zgartirildi`,
    { parse_mode: 'HTML' }
  )
})

bot.onText(/^\/setcard (.+)/, async (msg, match) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const cfg = loadConfig()
  cfg.card_number = match[1].trim()
  saveConfig(cfg)
  await bot.sendMessage(msg.chat.id, `✅ Karta raqami: <code>${cfg.card_number}</code>`, { parse_mode: 'HTML' })
})

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
  await bot.sendMessage(msg.chat.id,
    `✅ <b>${cfg.categories[idx].name}</b> uchun mavzu ID = <code>${threadId}</code>`,
    { parse_mode: 'HTML' }
  )
})

bot.onText(/^\/threadid/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const tid = msg.message_thread_id ?? null
  await bot.sendMessage(msg.chat.id,
    tid ? `Thread ID: <code>${tid}</code>` : "Bu oddiy chat — thread_id aniqlanmadi.",
    { parse_mode: 'HTML', ...(tid ? { message_thread_id: tid } : {}) }
  )
})

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

bot.onText(/^\/admin/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  adminState.delete(OWNER_ID)
  await showAdminMenu(msg.chat.id)
})

// ─── Admin panel ──────────────────────────────────────────────────────────────

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

// ─── Message handler ──────────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.from || msg.chat.type !== 'private') return

  const userId = msg.from.id
  const text   = (msg.text || '').trim()

  // Admin flow takes priority for owner
  if (userId === OWNER_ID && text && !text.startsWith('/')) {
    const as = adminState.get(OWNER_ID)
    if (as) { await handleAdminInput(msg.chat.id, text, as); return }
  }

  // Contact (phone sharing)
  if (msg.contact) {
    const d = getDialog(userId)
    if (!d) return
    const phone = msg.contact.phone_number
    const lang  = d.lang
    if (d.step === 'phone') {
      d.phone = phone
      d.step  = 'description'
      setDialog(userId, d)
      await removeKeyboard(msg.chat.id, '✅')
      await bot.sendMessage(msg.chat.id, tr(lang, 'askDescription'))
    } else if (d.step === 'edit_phone') {
      d.phone = phone
      d.step  = 'preview'
      setDialog(userId, d)
      await removeKeyboard(msg.chat.id, '✅')
      await showPreview(msg.chat.id, d)
    }
    return
  }

  // Only /skip passes through; other commands handled by onText
  if (text.startsWith('/')) {
    const d       = getDialog(userId)
    const skipOk  = d && text === '/skip' &&
      ['photo', 'price', 'edit_price', 'edit_photo'].includes(d.step)
    if (!skipOk) return
  }

  const d = getDialog(userId)
  if (!d) return

  const lang = d.lang

  // Photo messages
  if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id
    if (d.step === 'photo') {
      d.adPhotoFileId = fileId
      d.step          = 'price'
      setDialog(userId, d)
      await bot.sendMessage(msg.chat.id, tr(lang, 'askPrice'))
      return
    }
    if (d.step === 'edit_photo') {
      d.adPhotoFileId = fileId
      setDialog(userId, d)
      await showPreview(msg.chat.id, d)
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
      await askPhone(msg.chat.id, lang)
      break

    case 'phone':
      // User typed text instead of using the contact button
      await askPhone(msg.chat.id, lang)
      break

    case 'description':
      d.description = text
      d.step        = 'photo'
      setDialog(userId, d)
      await bot.sendMessage(msg.chat.id, tr(lang, 'askPhoto'))
      break

    case 'photo':
      if (text === '/skip') {
        d.adPhotoFileId = null
        d.step          = 'price'
        setDialog(userId, d)
        await bot.sendMessage(msg.chat.id, tr(lang, 'askPrice'))
      } else {
        await bot.sendMessage(msg.chat.id, tr(lang, 'sendPhotoOrSkip'))
      }
      break

    case 'price':
      d.conditions = text === '/skip' ? null : text
      setDialog(userId, d)
      await showPreview(msg.chat.id, d)
      break

    case 'edit_name':
      d.name = text
      setDialog(userId, d)
      await showPreview(msg.chat.id, d)
      break

    case 'edit_phone':
      // User typed text instead of using the contact button
      await askPhone(msg.chat.id, lang)
      break

    case 'edit_desc':
      d.description = text
      setDialog(userId, d)
      await showPreview(msg.chat.id, d)
      break

    case 'edit_price':
      d.conditions = text === '/skip' ? null : text
      setDialog(userId, d)
      await showPreview(msg.chat.id, d)
      break

    case 'edit_photo':
      if (text === '/skip') {
        d.adPhotoFileId = null
        setDialog(userId, d)
        await showPreview(msg.chat.id, d)
      } else {
        await bot.sendMessage(msg.chat.id, tr(lang, 'sendPhotoOrSkip'))
      }
      break

    case 'waiting_receipt':
      await bot.sendMessage(msg.chat.id, tr(lang, 'waitReceipt'))
      break
  }
})

// ─── Receipt handler ──────────────────────────────────────────────────────────

async function handleReceipt(msg, fileId, d) {
  const userId   = msg.from.id
  const username = msg.from.username ?? null
  const cfg      = loadConfig()
  const p        = { ...d, userId, username, receiptFileId: fileId }

  console.log(`[PAYMENT] User: ${userId} отправил чек`)

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

  await bot.sendMessage(msg.chat.id, tr(d.lang, 'receiptSent'))
}

// ─── Callback query handler ───────────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const fromId = query.from.id
  const chatId = query.message?.chat?.id
  const msgId  = query.message?.message_id
  const data   = query.data || ''

  // ── Language selection ──────────────────────────────────────────────────────
  if (data === 'lang_uz' || data === 'lang_ru') {
    const lang = data === 'lang_uz' ? 'uz' : 'ru'
    setDialog(fromId, { lang, step: 'menu', _uid: fromId })
    await bot.answerCallbackQuery(query.id)
    await showMainMenu(chatId, lang)
    return
  }

  // ── Main menu ───────────────────────────────────────────────────────────────
  if (data.startsWith('menu_')) {
    const d    = getDialog(fromId)
    const lang = d?.lang ?? 'uz'

    if (data === 'menu_myads') {
      await bot.answerCallbackQuery(query.id)
      await bot.sendMessage(chatId, tr(lang, 'noAds'))
      return
    }
    if (data === 'menu_account' || data === 'menu_settings') {
      await bot.answerCallbackQuery(query.id)
      await bot.sendMessage(chatId, tr(lang, 'comingSoon'))
      return
    }

    const adTypeMap = { menu_sell: 'sell', menu_buy: 'buy', menu_service: 'service' }
    const adType    = adTypeMap[data]
    if (!adType) { await bot.answerCallbackQuery(query.id); return }

    setDialog(fromId, { lang, step: 'category', adType, _uid: fromId })
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, tr(lang, 'chooseCategory'), {
      reply_markup: categoryKeyboard(loadConfig().categories),
    })
    return
  }

  // ── Category selection ──────────────────────────────────────────────────────
  if (data.startsWith('cat_')) {
    const idx = Number(data.slice(4))
    const cfg = loadConfig()
    if (idx < 0 || idx >= cfg.categories.length) { await bot.answerCallbackQuery(query.id); return }

    const d    = getDialog(fromId)
    const lang = d?.lang ?? 'uz'

    console.log(`[CATEGORY] User: ${fromId} выбрал: ${cfg.categories[idx].name}`)
    setDialog(fromId, {
      _uid: fromId, lang, step: 'name',
      adType: d?.adType ?? 'sell', categoryIdx: idx,
      name: null, phone: null, description: null,
      adPhotoFileId: null, conditions: null,
    })
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, tr(lang, 'askName'))
    return
  }

  // ── Copy card ───────────────────────────────────────────────────────────────
  if (data === 'copy_card') {
    const cardNumber = loadConfig().card_number.replace(/\s/g, '')
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, cardNumber)
    return
  }

  // ── Preview actions ─────────────────────────────────────────────────────────
  if (data === 'preview_confirm') {
    const d = getDialog(fromId)
    if (!d) { await bot.answerCallbackQuery(query.id); return }
    d.step = 'waiting_receipt'
    setDialog(fromId, d)
    const cfg  = loadConfig()
    const lang = d.lang
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, buildPaymentText(d, cfg, lang), {
      parse_mode:   'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: tr(lang, 'copyCard'), callback_data: 'copy_card' }]],
      },
    })
    return
  }

  if (data === 'preview_edit') {
    const d = getDialog(fromId)
    if (!d) { await bot.answerCallbackQuery(query.id); return }
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, tr(d.lang, 'editTitle'), {
      reply_markup: editFieldKeyboard(d.lang),
    })
    return
  }

  if (data === 'preview_cancel') {
    const lang = getUserLang(fromId)
    clearDialog(fromId)
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, tr(lang, 'cancelled'))
    return
  }

  // ── Edit field selection ────────────────────────────────────────────────────
  if (data.startsWith('ef_')) {
    const d = getDialog(fromId)
    if (!d) { await bot.answerCallbackQuery(query.id); return }
    const lang    = d.lang
    const fieldMap = {
      ef_name:  { step: 'edit_name',  ask: 'editAskName'  },
      ef_phone: { step: 'edit_phone', ask: 'editAskPhone' },
      ef_desc:  { step: 'edit_desc',  ask: 'editAskDesc'  },
      ef_price: { step: 'edit_price', ask: 'editAskPrice' },
      ef_photo: { step: 'edit_photo', ask: 'editAskPhoto' },
    }
    const fm = fieldMap[data]
    if (!fm) { await bot.answerCallbackQuery(query.id); return }
    d.step = fm.step
    setDialog(fromId, d)
    await bot.answerCallbackQuery(query.id)
    if (data === 'ef_phone') {
      await askPhone(chatId, lang)
    } else {
      await bot.sendMessage(chatId, tr(lang, fm.ask))
    }
    return
  }

  // ── Admin panel callbacks ───────────────────────────────────────────────────
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
      text: `${i + 1}. ${cat.name} — ${fmt(cat.price)} so'm`, callback_data: `admin_cat_${i}`,
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

  if (data.startsWith('admin_editprice_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const idx = Number(data.slice(16))
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

  // ── Approve ─────────────────────────────────────────────────────────────────
  if (data.startsWith('approve_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const targetId = Number(data.slice(8))
    const p        = pending.get(targetId)
    if (!p) { await bot.answerCallbackQuery(query.id, { text: "Ariza topilmadi (eskirgan)" }); return }

    console.log(`[ADMIN] approve заявка от User: ${targetId}`)
    await bot.answerCallbackQuery(query.id, { text: '✅ Tasdiqlandi' })
    pending.delete(targetId)
    incStat('approved')

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
      console.log(`[PUBLISHED] Категория: ${cat.name} тема: ${cat.topic_id ?? 'нет'}`)
    } catch (err) {
      console.error(`[ERROR] publish: ${err.message}`)
    }

    try {
      await bot.editMessageCaption(
        (query.message.caption || '') + '\n\n✅ Tasdiqlandi',
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
      )
    } catch {}

    await bot.sendMessage(targetId, tr(p.lang ?? 'uz', 'approved'))
    return
  }

  // ── Reject ──────────────────────────────────────────────────────────────────
  if (data.startsWith('reject_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const targetId = Number(data.slice(7))
    const p        = pending.get(targetId)
    if (!p) { await bot.answerCallbackQuery(query.id, { text: "Ariza topilmadi" }); return }

    console.log(`[ADMIN] reject заявка от User: ${targetId}`)
    await bot.answerCallbackQuery(query.id, { text: '❌ Rad etildi' })
    pending.delete(targetId)
    incStat('rejected')

    try {
      await bot.editMessageCaption(
        (query.message.caption || '') + '\n\n❌ Rad etildi',
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
      )
    } catch {}

    await bot.sendMessage(targetId, tr(p.lang ?? 'uz', 'rejected') + ADMIN_USERNAME)
    return
  }

  await bot.answerCallbackQuery(query.id)
})

// ─── Error handling ───────────────────────────────────────────────────────────

bot.on('polling_error', (err) => console.error(`[ERROR] polling: ${err.code} ${err.message}`))
bot.on('error',         (err) => console.error(`[ERROR] ${err.message}`))

console.log('✅ Biznes Hamkorlar bot ishga tushdi')
