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

// ─── File operations ──────────────────────────────────────────────────────────

const CONFIG_PATH   = join(__dir, 'config.json')
const STATS_PATH    = join(__dir, 'stats.json')
const USER_ADS_PATH = join(__dir, 'user_ads.json')

function loadConfig()    { return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) }
function saveConfig(cfg) { writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8') }

function loadStats() {
  try { return JSON.parse(readFileSync(STATS_PATH, 'utf-8')) }
  catch { return { total: 0, approved: 0, rejected: 0 } }
}
function incStat(key) {
  const s = loadStats(); s[key] = (s[key] || 0) + 1
  writeFileSync(STATS_PATH, JSON.stringify(s, null, 2), 'utf-8')
}

function loadUserAds()     { try { return JSON.parse(readFileSync(USER_ADS_PATH, 'utf-8')) } catch { return {} } }
function saveUserAds(data) { writeFileSync(USER_ADS_PATH, JSON.stringify(data, null, 2), 'utf-8') }
function getUserAds(userId) { return loadUserAds()[String(userId)] ?? [] }

function addUserAd(userId, adData) {
  const all = loadUserAds(); const key = String(userId)
  if (!all[key]) all[key] = []
  all[key].unshift(adData); saveUserAds(all)
}
function updateUserAdStatus(userId, adId, status) {
  const all = loadUserAds(); const key = String(userId)
  const ad  = (all[key] ?? []).find(a => a.adId === adId)
  if (ad) { ad.status = status; saveUserAds(all) }
}
function removeUserAd(userId, adId) {
  const all = loadUserAds(); const key = String(userId)
  if (all[key]) { all[key] = all[key].filter(a => a.adId !== adId); saveUserAds(all) }
}

// ─── Translations ─────────────────────────────────────────────────────────────

const DIV = '――――――――――――――'

const T = {
  uz: {
    btnPost:     "📢 E'lon berish",
    btnMyAds:    "📋 Mening e'lonlarim",
    btnAccount:  "💰 Mening hisobim",
    btnSettings: "⚙️ Sozlamalar",

    adTypeTitle: `📢 <b>YANGI E'LON</b>\n${DIV}\n\nXabar turini tanlang:`,
    menuSell:    "📢 Sotaman",
    menuBuy:     "🛒 Sotib olaman",
    menuService: "🔧 Xizmat ko'rsataman",

    chooseCategory: "📂 <b>Kategoriyani tanlang:</b>",

    btnProceed:      "✅ Davom etish",
    btnCancelInline: "❌ Bekor qilish",

    askName:        "👤 <b>Kompaniyangiz yoki ismingiz?</b>",
    askPhone:       "📞 <b>Telefon raqamingizni yuboring:</b>",
    phoneBtn:       "📱 Telefon raqamimni yuborish",
    askDescription: "📝 <b>Mahsulot yoki xizmat haqida yozing:</b>",
    askPhoto:       "🖼 <b>Rasmlarni yuboring 📸 (maksimal 10 ta)</b>\n<i>Tugagandan keyin /done yuboring\n/skip — o'tkazib yuborish</i>",
    askPrice:       "💰 <b>Narx yoki shartlar?</b>\n<i>/skip — o'tkazib yuborish</i>",
    sendPhotoOrSkip:"Rasm yuboring, /done (tugash) yoki /skip (o'tkazib yuborish)",

    previewTitle: "👀 <b>E'loningizni tekshiring:</b>",
    previewCat:   "📂 Kategoriya",
    previewType:  "📢 Turi",
    previewName:  "👤 Ism",
    previewPhone: "📞 Telefon",
    previewDesc:  "📝 Tavsif",
    previewPrice: "💰 Narx",
    previewPhoto: "🖼 Rasm",
    photoYes:     "✅ bor",
    photoNo:      "❌ yo'q",
    previewQ:     "<i>Hammasi to'g'rimi?</i>",
    btnConfirm:   "✅ Ha, to'lovga o'tish",
    btnEdit:      "✏️ Tahrirlash",
    btnCancel:    "❌ Bekor qilish",

    editTitle:    "✏️ <b>Nimani o'zgartirish?</b>",
    editName:     "👤 Ism",
    editPhone:    "📞 Telefon",
    editDesc:     "📝 Tavsif",
    editPrice:    "💰 Narx",
    editPhoto:    "🖼 Rasm",
    editAskName:  "👤 Yangi ism yuboring:",
    editAskPhone: "📞 Yangi telefon raqamini yuboring:",
    editAskDesc:  "📝 Yangi tavsifni yuboring:",
    editAskPrice: "💰 Yangi narxni yuboring <i>(/skip)</i>:",
    editAskPhoto: "🖼 Yangi rasm yuboring <i>(/skip)</i>:",

    payTitle:    "💳 <b>To'lov ma'lumotlari:</b>",
    payCard:     "Karta",
    payHolder:   "Egasi",
    payAmount:   "Summa",
    payInstruct: "📲 To'lovni amalga oshirib, <b>chekni yuboring</b> 📸",
    copyCard:    "📋 Karta raqamini nusxalash",
    waitReceipt: "📸 <b>To'lov cheki (rasm) yuboring</b>",
    receiptSent: "✅ <b>Chek yuborildi!</b>\nAdmin tekshirib, tasdiqlaydi.\n<i>Kutib turing... ⏳</i>",
    approved:    "🎉 <b>To'lovingiz tasdiqlandi!</b>\nArizangiz kanalga joylashtirildi ✅",
    rejected:    "❌ <b>To'lovingiz tasdiqlanmadi.</b>\nSavol uchun: @",
    cancelled:   "❌ Bekor qilindi.",

    myAdsTitle:      "📋 <b>Sizning e'lonlaringiz:</b>",
    noAds:           "<i>Sizda hozircha e'lonlar yo'q.</i>\n\nBirinchi e'lon berish uchun <b>📢 E'lon berish</b> tugmasini bosing.",
    statusWaiting:   "⏳ To'lov kutilmoqda",
    statusReviewing: "🕐 Ko'rib chiqilmoqda",
    statusApproved:  "✅ Tasdiqlangan",
    statusRejected:  "❌ Rad etilgan",

    accountTitle:     "💰 <b>Sizning hisobingiz:</b>",
    accountTotal:     "📊 Jami e'lonlar",
    accountApproved:  "✅ Tasdiqlangan",
    accountRejected:  "❌ Rad etilgan",
    accountReviewing: "🕐 Ko'rib chiqilmoqda",
    accountWaiting:   "⏳ To'lov kutilmoqda",
    noActivity:       "<i>Hali birorta e'lon yo'q.</i>",

    settingsTitle:  `⚙️ <b>Sozlamalar</b>\n${DIV}`,
    btnChangeLang:  "🌐 Tilni o'zgartirish",
    btnChangePhone: "📞 Telefon raqamini yangilash",
    askNewPhone:    "📞 <b>Yangi telefon raqamingizni yuboring:</b>",
    phoneUpdated:   "✅ <b>Telefon raqamingiz yangilandi!</b>",

    typeSell:    "📢 Sotaman",
    typeBuy:     "🛒 Sotib olaman",
    typeService: "🔧 Xizmat",
  },

  ru: {
    btnPost:     "📢 Подать объявление",
    btnMyAds:    "📋 Мои объявления",
    btnAccount:  "💰 Мой счет",
    btnSettings: "⚙️ Настройки",

    adTypeTitle: `📢 <b>НОВОЕ ОБЪЯВЛЕНИЕ</b>\n${DIV}\n\nВыберите тип:`,
    menuSell:    "📢 Продам",
    menuBuy:     "🛒 Покупаю",
    menuService: "🔧 Оказываю услугу",

    chooseCategory: "📂 <b>Выберите категорию:</b>",

    btnProceed:      "✅ Продолжить",
    btnCancelInline: "❌ Отмена",

    askName:        "👤 <b>Название компании или ваше имя?</b>",
    askPhone:       "📞 <b>Отправьте ваш номер телефона:</b>",
    phoneBtn:       "📱 Отправить мой номер телефона",
    askDescription: "📝 <b>Напишите о товаре или услуге:</b>",
    askPhoto:       "🖼 <b>Отправьте фотографии 📸 (максимум 10)</b>\n<i>После загрузки отправьте /done\n/skip — пропустить</i>",
    askPrice:       "💰 <b>Цена или условия?</b>\n<i>/skip — пропустить</i>",
    sendPhotoOrSkip:"Отправьте фото, /done (завершить) или /skip (пропустить)",

    previewTitle: "👀 <b>Проверьте объявление:</b>",
    previewCat:   "📂 Категория",
    previewType:  "📢 Тип",
    previewName:  "👤 Имя",
    previewPhone: "📞 Телефон",
    previewDesc:  "📝 Описание",
    previewPrice: "💰 Цена",
    previewPhoto: "🖼 Фото",
    photoYes:     "✅ есть",
    photoNo:      "❌ нет",
    previewQ:     "<i>Всё верно?</i>",
    btnConfirm:   "✅ Да, перейти к оплате",
    btnEdit:      "✏️ Редактировать",
    btnCancel:    "❌ Отмена",

    editTitle:    "✏️ <b>Что изменить?</b>",
    editName:     "👤 Имя",
    editPhone:    "📞 Телефон",
    editDesc:     "📝 Описание",
    editPrice:    "💰 Цену",
    editPhoto:    "🖼 Фото",
    editAskName:  "👤 Введите новое имя:",
    editAskPhone: "📞 Отправьте новый номер:",
    editAskDesc:  "📝 Введите новое описание:",
    editAskPrice: "💰 Введите новую цену <i>(/skip)</i>:",
    editAskPhoto: "🖼 Отправьте новое фото <i>(/skip)</i>:",

    payTitle:    "💳 <b>Реквизиты оплаты:</b>",
    payCard:     "Карта",
    payHolder:   "Владелец",
    payAmount:   "Сумма",
    payInstruct: "📲 Сделайте перевод и <b>отправьте чек</b> 📸",
    copyCard:    "📋 Скопировать номер карты",
    waitReceipt: "📸 <b>Отправьте фото чека об оплате</b>",
    receiptSent: "✅ <b>Чек отправлен!</b>\nАдминистратор проверит и подтвердит.\n<i>Подождите... ⏳</i>",
    approved:    "🎉 <b>Оплата подтверждена!</b>\nВаше объявление опубликовано ✅",
    rejected:    "❌ <b>Оплата не подтверждена.</b>\nВопросы: @",
    cancelled:   "❌ Отменено.",

    myAdsTitle:      "📋 <b>Ваши объявления:</b>",
    noAds:           "<i>У вас пока нет объявлений.</i>\n\nЧтобы подать объявление, нажмите <b>📢 Подать объявление</b>.",
    statusWaiting:   "⏳ Ожидает оплаты",
    statusReviewing: "🕐 На проверке",
    statusApproved:  "✅ Опубликовано",
    statusRejected:  "❌ Отклонено",

    accountTitle:     "💰 <b>Ваш счет:</b>",
    accountTotal:     "📊 Всего объявлений",
    accountApproved:  "✅ Опубликовано",
    accountRejected:  "❌ Отклонено",
    accountReviewing: "🕐 На проверке",
    accountWaiting:   "⏳ Ожидает оплаты",
    noActivity:       "<i>Объявлений пока нет.</i>",

    settingsTitle:  `⚙️ <b>Настройки</b>\n${DIV}`,
    btnChangeLang:  "🌐 Изменить язык",
    btnChangePhone: "📞 Обновить номер телефона",
    askNewPhone:    "📞 <b>Отправьте новый номер телефона:</b>",
    phoneUpdated:   "✅ <b>Номер телефона обновлён!</b>",

    typeSell:    "📢 Продам",
    typeBuy:     "🛒 Покупаю",
    typeService: "🔧 Услуга",
  },
}

function tr(lang, key) { return T[lang]?.[key] ?? T.uz[key] ?? key }

// ─── Menu & back detection ────────────────────────────────────────────────────

function getMenuAction(text, lang) {
  if (text === tr(lang, 'btnPost'))     return 'post'
  if (text === tr(lang, 'btnMyAds'))    return 'myads'
  if (text === tr(lang, 'btnAccount'))  return 'account'
  if (text === tr(lang, 'btnSettings')) return 'settings'
  return null
}

function backBtn(lang)     { return lang === 'ru' ? '⬅️ Назад' : '⬅️ Orqaga' }
function isBackText(text)  { return text === '⬅️ Orqaga' || text === '⬅️ Назад' }
function pushHistory(d, s) { if (!d.history) d.history = []; d.history.push(s) }

// ─── State ────────────────────────────────────────────────────────────────────
// history[] tracks visited steps so goBack can pop and replay them
// Steps: ad_type → category → price_confirm → name → phone → description →
//        photo → price → preview → waiting_receipt
// Edit steps (come from preview): edit_name | edit_phone | edit_desc | edit_price | edit_photo
// Special: settings_phone

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

function persistentMenuKeyboard(lang) {
  return {
    keyboard: [
      [tr(lang, 'btnPost'),    tr(lang, 'btnMyAds')   ],
      [tr(lang, 'btnAccount'), tr(lang, 'btnSettings')],
    ],
    resize_keyboard: true,
    is_persistent:   true,
  }
}

// adTypeKeyboard includes ⬅️ back (→ idle / no more history)
function adTypeKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: tr(lang, 'menuSell'),    callback_data: 'menu_sell'    }],
      [{ text: tr(lang, 'menuBuy'),     callback_data: 'menu_buy'     }],
      [{ text: tr(lang, 'menuService'), callback_data: 'menu_service' }],
      [{ text: backBtn(lang),           callback_data: 'back'         }],
    ],
  }
}

// categoryKeyboard: pass lang to append ⬅️ row
function categoryKeyboard(categories, lang) {
  const rows = []
  for (let i = 0; i < categories.length; i += 2) {
    const row = [{ text: categories[i].name, callback_data: `cat_${i}` }]
    if (categories[i + 1]) row.push({ text: categories[i + 1].name, callback_data: `cat_${i + 1}` })
    rows.push(row)
  }
  if (lang) rows.push([{ text: backBtn(lang), callback_data: 'back' }])
  return { inline_keyboard: rows }
}

function priceConfirmKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: tr(lang, 'btnProceed'), callback_data: 'confirm_price' }],
      [
        { text: backBtn(lang),             callback_data: 'back'           },
        { text: tr(lang, 'btnCancelInline'), callback_data: 'preview_cancel' },
      ],
    ],
  }
}

function previewKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: tr(lang, 'btnConfirm'), callback_data: 'preview_confirm' }],
      [{ text: tr(lang, 'btnEdit'),    callback_data: 'preview_edit'    }],
      [
        { text: backBtn(lang),          callback_data: 'back'           },
        { text: tr(lang, 'btnCancel'), callback_data: 'preview_cancel' },
      ],
    ],
  }
}

// Payment page: copy card + ⬅️ back to preview + ❌ cancel
function paymentKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: tr(lang, 'copyCard'),  callback_data: 'copy_card'      }],
      [
        { text: backBtn(lang),         callback_data: 'back'           },
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
      [{ text: tr(lang, 'editPhoto'), callback_data: 'ef_photo' }],
    ],
  }
}

// Phone keyboard with ⬅️ as a reply-keyboard text button
// one_time_keyboard hides it automatically on any button press
function phoneWithBackKeyboard(lang) {
  return {
    keyboard: [
      [{ text: tr(lang, 'phoneBtn'), request_contact: true }],
      [{ text: backBtn(lang) }],
    ],
    resize_keyboard:   true,
    one_time_keyboard: true,
  }
}

function settingsKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: tr(lang, 'btnChangeLang'),  callback_data: 'settings_lang'  }],
      [{ text: tr(lang, 'btnChangePhone'), callback_data: 'settings_phone' }],
    ],
  }
}

// Single ⬅️ row used in text-input steps
function backRow(lang) { return [{ text: backBtn(lang), callback_data: 'back' }] }

// ─── Text builders ────────────────────────────────────────────────────────────

function fmt(n) { return Number(n).toLocaleString('ru-RU') }
function fmtDate(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

function adTypeName(lang, adType) {
  if (adType === 'sell')    return tr(lang, 'typeSell')
  if (adType === 'buy')     return tr(lang, 'typeBuy')
  if (adType === 'service') return tr(lang, 'typeService')
  return adType
}

function adStatusText(lang, status) {
  return { waiting_payment: tr(lang,'statusWaiting'), reviewing: tr(lang,'statusReviewing'),
           approved: tr(lang,'statusApproved'), rejected: tr(lang,'statusRejected') }[status] ?? status
}

function buildPriceConfirmText(lang, catName, price) {
  const so  = lang === 'ru' ? 'сум' : "so'm"
  const lbl = lang === 'ru' ? 'Стоимость объявления' : "E'lon narxi"
  const q   = lang === 'ru' ? '<i>Продолжить?</i>' : "<i>Davom etasizmi?</i>"
  return `📂 <b>${catName}</b>\n${DIV}\n\n💰 <i>${lbl}:</i> <b>${fmt(price)} ${so}</b>\n\n${q}`
}

function buildPreviewText(d, cfg, lang) {
  const cat = cfg.categories[d.categoryIdx]
  return [
    tr(lang, 'previewTitle'), DIV, '',
    `${tr(lang, 'previewCat')}: <b>${cat.name}</b>`,
    `${tr(lang, 'previewType')}: ${adTypeName(lang, d.adType)}`,
    `${tr(lang, 'previewName')}: <b>${d.name}</b>`,
    `${tr(lang, 'previewPhone')}: <code>${d.phone}</code>`,
    `${tr(lang, 'previewDesc')}: ${d.description}`,
    `${tr(lang, 'previewPrice')}: ${d.conditions ?? '—'}`,
    `${tr(lang, 'previewPhoto')}: ${(d.photos?.length ?? 0) > 0 ? `🖼 Rasmlar: ${d.photos.length} ta` : tr(lang, 'photoNo')}`,
    '', DIV, tr(lang, 'previewQ'),
  ].join('\n')
}

function buildPaymentText(d, cfg, lang) {
  const cat = cfg.categories[d.categoryIdx]
  const so  = lang === 'ru' ? 'сум' : "so'm"
  return [
    tr(lang, 'payTitle'), DIV, '',
    `${tr(lang, 'payCard')}: <code>${cfg.card_number}</code>`,
    `${tr(lang, 'payHolder')}: <b>${cfg.card_holder}</b>`,
    `${tr(lang, 'payAmount')}: <b>${fmt(cat.price)} ${so}</b>`,
    '', DIV, tr(lang, 'payInstruct'),
  ].join('\n')
}

function buildOwnerText(p, cfg) {
  const cat     = cfg.categories[p.categoryIdx]
  const userStr = p.username ? `@${p.username}` : `#${p.userId}`
  return [
    "💳 <b>Yangi to'lov!</b>", DIV, '',
    `👤 <b>${p.name}</b> (${userStr})`,
    `📞 <code>${p.phone}</code>`,
    `📂 ${cat.name}`,
    `📢 ${adTypeName('uz', p.adType)}`,
    `💰 <b>${fmt(cat.price)} so'm</b>`,
  ].join('\n')
}

function buildGroupPostText(p, cfg, botUsername) {
  const cat   = cfg.categories[p.categoryIdx]
  const lines = [
    `📂 <b>${cat.name.toUpperCase()}</b>`,
    `📢 <i>${adTypeName('uz', p.adType)}</i>`,
    DIV, '',
    `👤 <b>${p.name}</b>`,
    `📞 <code>${p.phone}</code>`,
    `📝 ${p.description}`,
  ]
  if (p.conditions) lines.push(`💰 ${p.conditions}`)
  lines.push('', DIV, '✅ <i>Tasdiqlangan</i>', '', `🤖 @${botUsername} orqali yuborildi`)
  return lines.join('\n')
}

// ─── Flow helpers ─────────────────────────────────────────────────────────────

async function showLangSelect(chatId) {
  await bot.sendMessage(chatId, 'Tilni tanlang / Выберите язык:', { reply_markup: langKeyboard() })
}

async function showPersistentMenu(chatId, lang, text) {
  await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: persistentMenuKeyboard(lang) })
}

async function removeKeyboard(chatId, text) {
  await bot.sendMessage(chatId, text, { reply_markup: { remove_keyboard: true } })
}

async function showPreview(chatId, userId, d) {
  const cfg    = loadConfig()
  const lang   = d.lang
  const text   = buildPreviewText(d, cfg, lang)
  const photos = d.photos ?? []
  d.step = 'preview'
  setDialog(userId, d)
  if (photos.length === 1) {
    await bot.sendPhoto(chatId, photos[0], {
      caption: text, parse_mode: 'HTML', reply_markup: previewKeyboard(lang),
    })
  } else if (photos.length > 1) {
    const media = photos.map((fid, i) => ({
      type: 'photo', media: fid, ...(i === 0 ? { caption: text, parse_mode: 'HTML' } : {}),
    }))
    await bot.sendMediaGroup(chatId, media)
    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: previewKeyboard(lang) })
  } else {
    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: previewKeyboard(lang) })
  }
}

async function showMyAds(chatId, userId, lang) {
  const ads = getUserAds(userId)
  if (ads.length === 0) {
    await bot.sendMessage(chatId, `${tr(lang,'myAdsTitle')}\n${DIV}\n\n${tr(lang,'noAds')}`, { parse_mode:'HTML' })
    return
  }
  const lines = [tr(lang, 'myAdsTitle'), DIV, '']
  ads.slice(0, 10).forEach((ad, i) => {
    lines.push(`<b>${i + 1}.</b> ${ad.categoryName}`)
    lines.push(`     ${adStatusText(lang, ad.status)}  •  <i>${fmtDate(ad.createdAt)}</i>`)
    lines.push('')
  })
  await bot.sendMessage(chatId, lines.join('\n'), { parse_mode: 'HTML' })
}

async function showMyAccount(chatId, userId, lang) {
  const ads       = getUserAds(userId)
  const total     = ads.length
  const approved  = ads.filter(a => a.status === 'approved').length
  const rejected  = ads.filter(a => a.status === 'rejected').length
  const reviewing = ads.filter(a => a.status === 'reviewing').length
  const waiting   = ads.filter(a => a.status === 'waiting_payment').length
  if (total === 0) {
    await bot.sendMessage(chatId, `${tr(lang,'accountTitle')}\n${DIV}\n\n${tr(lang,'noActivity')}`, { parse_mode:'HTML' })
    return
  }
  await bot.sendMessage(chatId, [
    tr(lang, 'accountTitle'), DIV, '',
    `${tr(lang,'accountTotal')}: <b>${total}</b> ta`,
    `${tr(lang,'accountApproved')}: <b>${approved}</b> ta`,
    `${tr(lang,'accountRejected')}: <b>${rejected}</b> ta`,
    `${tr(lang,'accountReviewing')}: <b>${reviewing}</b> ta`,
    `${tr(lang,'accountWaiting')}: <b>${waiting}</b> ta`,
  ].join('\n'), { parse_mode: 'HTML' })
}

async function showSettings(chatId, lang) {
  await bot.sendMessage(chatId, tr(lang, 'settingsTitle'), {
    parse_mode: 'HTML', reply_markup: settingsKeyboard(lang),
  })
}

// ─── Step renderer — used by both forward flow and goBack ─────────────────────
// Sets d.step, calls setDialog, then sends the right UI for that step.

async function showStep(chatId, userId, step, d) {
  const lang = d.lang
  const cfg  = loadConfig()
  d.step = step
  setDialog(userId, d)

  switch (step) {
    case 'ad_type':
      await bot.sendMessage(chatId, tr(lang, 'adTypeTitle'), {
        parse_mode: 'HTML', reply_markup: adTypeKeyboard(lang),
      })
      break

    case 'category':
      await bot.sendMessage(chatId, tr(lang, 'chooseCategory'), {
        parse_mode: 'HTML', reply_markup: categoryKeyboard(cfg.categories, lang),
      })
      break

    case 'price_confirm': {
      const cat = cfg.categories[d.categoryIdx]
      await bot.sendMessage(chatId, buildPriceConfirmText(lang, cat.name, cat.price), {
        parse_mode: 'HTML', reply_markup: priceConfirmKeyboard(lang),
      })
      break
    }

    case 'name':
      await bot.sendMessage(chatId, tr(lang, 'askName'), {
        parse_mode: 'HTML', reply_markup: { inline_keyboard: [backRow(lang)] },
      })
      break

    case 'phone':
      await bot.sendMessage(chatId, tr(lang, 'askPhone'), {
        parse_mode: 'HTML', reply_markup: phoneWithBackKeyboard(lang),
      })
      break

    case 'description':
      await bot.sendMessage(chatId, tr(lang, 'askDescription'), {
        parse_mode: 'HTML', reply_markup: { inline_keyboard: [backRow(lang)] },
      })
      break

    case 'photo':
      d.photos = []
      setDialog(userId, d)
      await bot.sendMessage(chatId, tr(lang, 'askPhoto'), {
        parse_mode: 'HTML', reply_markup: { inline_keyboard: [backRow(lang)] },
      })
      break

    case 'price':
      await bot.sendMessage(chatId, tr(lang, 'askPrice'), {
        parse_mode: 'HTML', reply_markup: { inline_keyboard: [backRow(lang)] },
      })
      break

    case 'preview':
      await showPreview(chatId, userId, d)
      break

    default:
      // Safety fallback
      d.step = 'ad_type'; d.history = []; setDialog(userId, d)
      await bot.sendMessage(chatId, tr(lang, 'adTypeTitle'), {
        parse_mode: 'HTML', reply_markup: adTypeKeyboard(lang),
      })
  }
}

// ─── Back navigation ──────────────────────────────────────────────────────────

async function goBack(chatId, userId) {
  const d = getDialog(userId)
  if (!d) return
  const lang = d.lang

  // Edit steps always return to preview (no history used)
  if (d.step?.startsWith('edit_')) {
    d.step = 'preview'; setDialog(userId, d)
    await showPreview(chatId, userId, d)
    return
  }

  // Settings phone → back to settings panel
  if (d.step === 'settings_phone') {
    d.step = 'idle'; setDialog(userId, d)
    await showSettings(chatId, lang)
    return
  }

  if (!d.history || d.history.length === 0) {
    // No history left — return to idle; persistent menu is always visible
    setDialog(userId, { lang, step: 'idle' })
    await bot.sendMessage(chatId, tr(lang, 'cancelled'), { parse_mode: 'HTML' })
    return
  }

  const prevStep = d.history.pop()
  await showStep(chatId, userId, prevStep, d)
}

// ─── Menu button handler ──────────────────────────────────────────────────────

async function handleMenuButton(chatId, userId, action) {
  const lang = getUserLang(userId)
  if (action === 'post') {
    setDialog(userId, { lang, step: 'ad_type', history: [] })
    await bot.sendMessage(chatId, tr(lang, 'adTypeTitle'), {
      parse_mode: 'HTML', reply_markup: adTypeKeyboard(lang),
    })
    return
  }
  if (action === 'myads')   { await showMyAds(chatId, userId, lang);    return }
  if (action === 'account') { await showMyAccount(chatId, userId, lang); return }
  if (action === 'settings'){ await showSettings(chatId, lang);          return }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

bot.onText(/^\/start/, async (msg) => {
  if (msg.chat.type !== 'private') return
  console.log(`[START] User: ${msg.from.id} @${msg.from.username}`)
  clearDialog(msg.from.id); adminState.delete(msg.from.id)
  await showLangSelect(msg.chat.id)
})

bot.onText(/^\/cancel/, async (msg) => {
  if (msg.chat.type !== 'private') return
  const lang = getUserLang(msg.from.id)
  clearDialog(msg.from.id); adminState.delete(msg.from.id)
  await bot.sendMessage(msg.chat.id, tr(lang, 'cancelled'), {
    parse_mode: 'HTML', reply_markup: { remove_keyboard: true },
  })
})

// ─── Admin commands ───────────────────────────────────────────────────────────

bot.onText(/^\/prices/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const cfg   = loadConfig()
  const lines = ['📋 <b>Kategoriyalar narxlari:</b>', DIV, '']
  cfg.categories.forEach((cat, i) => lines.push(`${i+1}. ${cat.name} — <b>${fmt(cat.price)} so'm</b>`))
  const buttons = cfg.categories.map((cat, i) => [{
    text: `✏️ ${i+1}. ${cat.name}`, callback_data: `admin_editprice_${i}`,
  }])
  await bot.sendMessage(msg.chat.id, lines.join('\n'), {
    parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons },
  })
})

bot.onText(/^\/setprice\s+(\d+)\s+(\d+)/, async (msg, match) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const idx = Number(match[1]) - 1; const price = Number(match[2])
  const cfg = loadConfig()
  if (idx < 0 || idx >= cfg.categories.length) {
    await bot.sendMessage(msg.chat.id, `❌ Raqam 1–${cfg.categories.length} oralig'ida bo'lishi kerak.`); return
  }
  cfg.categories[idx].price = price; saveConfig(cfg)
  await bot.sendMessage(msg.chat.id,
    `✅ <b>${cfg.categories[idx].name}</b> narxi <b>${fmt(price)} so'm</b>ga o'zgartirildi`,
    { parse_mode: 'HTML' })
})

bot.onText(/^\/setcard (.+)/, async (msg, match) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const cfg = loadConfig(); cfg.card_number = match[1].trim(); saveConfig(cfg)
  await bot.sendMessage(msg.chat.id, `✅ Karta raqami: <code>${cfg.card_number}</code>`, { parse_mode: 'HTML' })
})

bot.onText(/^\/settopic\s+(\d+)\s+(\d+)/, async (msg, match) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const idx = Number(match[1]) - 1; const threadId = Number(match[2])
  const cfg = loadConfig()
  if (idx < 0 || idx >= cfg.categories.length) {
    await bot.sendMessage(msg.chat.id, `❌ Raqam 1–${cfg.categories.length} oralig'ida bo'lishi kerak.`); return
  }
  cfg.categories[idx].topic_id = threadId; saveConfig(cfg)
  await bot.sendMessage(msg.chat.id,
    `✅ <b>${cfg.categories[idx].name}</b> uchun mavzu ID = <code>${threadId}</code>`, { parse_mode: 'HTML' })
})

bot.onText(/^\/threadid/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const tid = msg.message_thread_id ?? null
  await bot.sendMessage(msg.chat.id,
    tid ? `Thread ID: <code>${tid}</code>` : "Bu oddiy chat — thread_id aniqlanmadi.",
    { parse_mode: 'HTML', ...(tid ? { message_thread_id: tid } : {}) })
})

bot.onText(/^\/stats/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  const s = loadStats()
  await bot.sendMessage(msg.chat.id, [
    `📊 <b>Statistika:</b>\n${DIV}`, '',
    `📨 Jami cheklar: <b>${s.total}</b>`,
    `✅ Tasdiqlangan: <b>${s.approved}</b>`,
    `❌ Rad etilgan: <b>${s.rejected}</b>`,
  ].join('\n'), { parse_mode: 'HTML' })
})

bot.onText(/^\/admin/, async (msg) => {
  if (Number(msg.from?.id) !== OWNER_ID) return
  adminState.delete(OWNER_ID); await showAdminMenu(msg.chat.id)
})

// ─── Admin panel ──────────────────────────────────────────────────────────────

async function showAdminMenu(chatId) {
  await bot.sendMessage(chatId, `⚙️ <b>Admin panel</b>\n${DIV}`, {
    parse_mode: 'HTML',
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
    await bot.sendMessage(chatId, "Karta egasining ismini yuboring:"); return
  }
  if (as.step === 'card_holder') {
    cfg.card_number = as.card_number; cfg.card_holder = text; saveConfig(cfg)
    adminState.delete(OWNER_ID)
    await bot.sendMessage(chatId, "✅ Karta ma'lumotlari yangilandi!", { parse_mode: 'HTML' })
    await showAdminMenu(chatId); return
  }
  if (as.step === 'price_input') {
    const price = Number(String(text).replace(/\s/g, ''))
    if (!price || isNaN(price) || price <= 0) {
      await bot.sendMessage(chatId, "❌ Noto'g'ri raqam. Faqat son yuboring:"); return
    }
    cfg.categories[as.categoryIdx].price = price; saveConfig(cfg)
    adminState.delete(OWNER_ID)
    await bot.sendMessage(chatId, `✅ Narx yangilandi: <b>${fmt(price)} so'm</b>`, { parse_mode: 'HTML' })
    await showAdminMenu(chatId); return
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.from || msg.chat.type !== 'private') return

  const userId = msg.from.id
  const text   = (msg.text || '').trim()

  // 1. Admin flow takes priority
  if (userId === OWNER_ID && text && !text.startsWith('/')) {
    const as = adminState.get(OWNER_ID)
    if (as) { await handleAdminInput(msg.chat.id, text, as); return }
  }

  // 2. Contact (phone sharing via request_contact button)
  if (msg.contact) {
    const d = getDialog(userId)
    if (!d) return
    const phone = msg.contact.phone_number
    const lang  = d.lang

    if (d.step === 'phone') {
      d.phone = phone
      pushHistory(d, 'phone')
      setDialog(userId, d)
      await removeKeyboard(msg.chat.id, '✅')
      await showStep(msg.chat.id, userId, 'description', d)
    } else if (d.step === 'edit_phone') {
      d.phone = phone; setDialog(userId, d)
      await removeKeyboard(msg.chat.id, '✅')
      await showPreview(msg.chat.id, userId, d)
    } else if (d.step === 'settings_phone') {
      clearDialog(userId); setDialog(userId, { lang })
      await removeKeyboard(msg.chat.id, tr(lang, 'phoneUpdated'))
    }
    return
  }

  // 3. /skip and /done pass only in valid steps; other commands handled by onText
  if (text.startsWith('/')) {
    const d      = getDialog(userId)
    const skipOk = d && (
      (text === '/skip' && ['photo', 'price', 'edit_price', 'edit_photo'].includes(d.step)) ||
      (text === '/done' && d.step === 'photo')
    )
    if (!skipOk) return
  }

  const d    = getDialog(userId)
  const lang = d?.lang ?? 'uz'

  // 4. ⬅️ back text button (sent from phoneWithBackKeyboard reply keyboard)
  //    one_time_keyboard auto-hides it — no extra removeKeyboard needed
  if (isBackText(text) && d && ['phone', 'edit_phone', 'settings_phone'].includes(d.step)) {
    await goBack(msg.chat.id, userId)
    return
  }

  // 5. Persistent bottom menu buttons
  if (text && !text.startsWith('/')) {
    const action = getMenuAction(text, lang)
    if (action) {
      if (d?.step === 'waiting_receipt') {
        await bot.sendMessage(msg.chat.id, tr(lang, 'waitReceipt'), { parse_mode: 'HTML' })
      } else {
        await handleMenuButton(msg.chat.id, userId, action)
      }
      return
    }
  }

  if (!d) return

  // 6. Photo messages
  if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id
    if (d.step === 'photo') {
      if (!d.photos) d.photos = []
      if (d.photos.length >= 10) {
        await bot.sendMessage(msg.chat.id,
          lang === 'ru' ? "Maksimal 10 ta rasm. /done yuboring" : "Maksimal 10 ta rasm. /done yuboring")
        return
      }
      d.photos.push(fileId)
      setDialog(userId, d)
      await bot.sendMessage(msg.chat.id, `✅ Rasm qabul qilindi (${d.photos.length} ta)`)
      return
    }
    if (d.step === 'edit_photo') {
      d.photos = [fileId]; setDialog(userId, d)
      await showPreview(msg.chat.id, userId, d); return
    }
    if (d.step === 'waiting_receipt') {
      await handleReceipt(msg, fileId, d); return
    }
    return
  }

  if (!text) return

  // 7. Text input for form steps
  switch (d.step) {
    case 'name':
      d.name = text
      pushHistory(d, 'name')
      await showStep(msg.chat.id, userId, 'phone', d)
      break

    case 'phone':
      // User typed text instead of using the contact button — re-prompt
      await bot.sendMessage(msg.chat.id, tr(lang, 'askPhone'), {
        parse_mode: 'HTML', reply_markup: phoneWithBackKeyboard(lang),
      })
      break

    case 'description':
      d.description = text
      pushHistory(d, 'description')
      await showStep(msg.chat.id, userId, 'photo', d)
      break

    case 'photo':
      if (text === '/skip' || text === '/done') {
        if (!d.photos) d.photos = []
        pushHistory(d, 'photo')
        await showStep(msg.chat.id, userId, 'price', d)
      } else {
        await bot.sendMessage(msg.chat.id, tr(lang, 'sendPhotoOrSkip'), {
          reply_markup: { inline_keyboard: [backRow(lang)] },
        })
      }
      break

    case 'price':
      d.conditions = text === '/skip' ? null : text
      pushHistory(d, 'price')
      setDialog(userId, d)
      await showPreview(msg.chat.id, userId, d)
      break

    // Edit steps — back goes to preview via goBack
    case 'edit_name':
      d.name = text; setDialog(userId, d)
      await showPreview(msg.chat.id, userId, d)
      break

    case 'edit_phone':
      await bot.sendMessage(msg.chat.id, tr(lang, 'editAskPhone'), {
        parse_mode: 'HTML', reply_markup: phoneWithBackKeyboard(lang),
      })
      break

    case 'edit_desc':
      d.description = text; setDialog(userId, d)
      await showPreview(msg.chat.id, userId, d)
      break

    case 'edit_price':
      d.conditions = text === '/skip' ? null : text; setDialog(userId, d)
      await showPreview(msg.chat.id, userId, d)
      break

    case 'edit_photo':
      if (text === '/skip') {
        d.photos = []; setDialog(userId, d)
        await showPreview(msg.chat.id, userId, d)
      } else {
        await bot.sendMessage(msg.chat.id, tr(lang, 'sendPhotoOrSkip'), {
          reply_markup: { inline_keyboard: [backRow(lang)] },
        })
      }
      break

    case 'waiting_receipt':
      await bot.sendMessage(msg.chat.id, tr(lang, 'waitReceipt'), { parse_mode: 'HTML' })
      break
  }
})

// ─── Receipt handler ──────────────────────────────────────────────────────────

async function handleReceipt(msg, fileId, d) {
  const userId   = msg.from.id
  const username = msg.from.username ?? null
  const cfg      = loadConfig()
  const adId     = d.adId ?? `${Date.now()}_${userId}`
  const p        = { ...d, userId, username, receiptFileId: fileId, adId }

  console.log(`[PAYMENT] User: ${userId} отправил чек`)
  updateUserAdStatus(userId, adId, 'reviewing')

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
  clearDialog(userId); setDialog(userId, { lang: d.lang })
  incStat('total')
  await bot.sendMessage(msg.chat.id, tr(d.lang, 'receiptSent'), { parse_mode: 'HTML' })
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
    setDialog(fromId, { lang, step: 'idle' })
    await bot.answerCallbackQuery(query.id)
    const welcome = lang === 'uz'
      ? "✅ <b>O'zbek tili tanlandi!</b>\n\nQuyidagi menyu orqali e'lon bering 👇"
      : "✅ <b>Русский язык выбран!</b>\n\nИспользуйте меню ниже 👇"
    await showPersistentMenu(chatId, lang, welcome)
    return
  }

  // ── ⬅️ Back ─────────────────────────────────────────────────────────────────
  if (data === 'back') {
    const d = getDialog(fromId)
    if (!d) { await bot.answerCallbackQuery(query.id); return }

    // Remove pending ad record if going back from payment page
    if (d.step === 'waiting_receipt' && d.adId) {
      removeUserAd(fromId, d.adId)
      d.adId = undefined; setDialog(fromId, d)
    }

    await bot.answerCallbackQuery(query.id)
    await goBack(chatId, fromId)
    return
  }

  // ── Ad type selection ───────────────────────────────────────────────────────
  if (data.startsWith('menu_')) {
    const d       = getDialog(fromId)
    const lang    = d?.lang ?? 'uz'
    const adTypeMap = { menu_sell: 'sell', menu_buy: 'buy', menu_service: 'service' }
    const adType  = adTypeMap[data]
    if (!adType) { await bot.answerCallbackQuery(query.id); return }

    const history = [...(d?.history ?? []), 'ad_type']
    setDialog(fromId, { lang, step: 'category', adType, history })
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, tr(lang, 'chooseCategory'), {
      parse_mode: 'HTML', reply_markup: categoryKeyboard(loadConfig().categories, lang),
    })
    return
  }

  // ── Category selection ──────────────────────────────────────────────────────
  if (data.startsWith('cat_')) {
    const idx = Number(data.slice(4))
    const cfg = loadConfig()
    if (idx < 0 || idx >= cfg.categories.length) { await bot.answerCallbackQuery(query.id); return }

    const d       = getDialog(fromId)
    const lang    = d?.lang ?? 'uz'
    const history = [...(d?.history ?? []), 'category']

    console.log(`[CATEGORY] User: ${fromId} выбрал: ${cfg.categories[idx].name}`)
    setDialog(fromId, {
      lang, step: 'price_confirm', adType: d?.adType ?? 'sell', categoryIdx: idx,
      name: null, phone: null, description: null, photos: [], conditions: null,
      history,
    })
    await bot.answerCallbackQuery(query.id)
    const cat = cfg.categories[idx]
    await bot.sendMessage(chatId, buildPriceConfirmText(lang, cat.name, cat.price), {
      parse_mode: 'HTML', reply_markup: priceConfirmKeyboard(lang),
    })
    return
  }

  // ── Price confirmed → start form ────────────────────────────────────────────
  if (data === 'confirm_price') {
    const d = getDialog(fromId)
    if (!d) { await bot.answerCallbackQuery(query.id); return }
    pushHistory(d, 'price_confirm')
    await bot.answerCallbackQuery(query.id)
    await showStep(chatId, fromId, 'name', d)
    return
  }

  // ── Copy card number ────────────────────────────────────────────────────────
  if (data === 'copy_card') {
    const cardNumber = loadConfig().card_number.replace(/\s/g, '')
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, `<code>${cardNumber}</code>`, { parse_mode: 'HTML' })
    return
  }

  // ── Preview: confirm → payment ──────────────────────────────────────────────
  if (data === 'preview_confirm') {
    const d = getDialog(fromId)
    if (!d) { await bot.answerCallbackQuery(query.id); return }

    const adId = `${Date.now()}_${fromId}`
    const cfg  = loadConfig()
    const cat  = cfg.categories[d.categoryIdx]

    addUserAd(fromId, {
      adId, categoryIdx: d.categoryIdx, categoryName: cat.name,
      adType: d.adType, status: 'waiting_payment', createdAt: new Date().toISOString(),
    })

    pushHistory(d, 'preview')
    d.step = 'waiting_receipt'; d.adId = adId
    setDialog(fromId, d)

    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, buildPaymentText(d, cfg, d.lang), {
      parse_mode: 'HTML', reply_markup: paymentKeyboard(d.lang),
    })
    return
  }

  // ── Preview: edit ───────────────────────────────────────────────────────────
  if (data === 'preview_edit') {
    const d = getDialog(fromId)
    if (!d) { await bot.answerCallbackQuery(query.id); return }
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, tr(d.lang, 'editTitle'), {
      parse_mode: 'HTML', reply_markup: editFieldKeyboard(d.lang),
    })
    return
  }

  // ── Preview / payment: cancel ───────────────────────────────────────────────
  if (data === 'preview_cancel') {
    const lang = getUserLang(fromId)
    setDialog(fromId, { lang, step: 'idle' })
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, tr(lang, 'cancelled'), { parse_mode: 'HTML' })
    return
  }

  // ── Edit field selection ────────────────────────────────────────────────────
  if (data.startsWith('ef_')) {
    const d = getDialog(fromId)
    if (!d) { await bot.answerCallbackQuery(query.id); return }
    const lang = d.lang
    const fieldMap = {
      ef_name:  { step: 'edit_name',  ask: 'editAskName'  },
      ef_phone: { step: 'edit_phone', ask: 'editAskPhone' },
      ef_desc:  { step: 'edit_desc',  ask: 'editAskDesc'  },
      ef_price: { step: 'edit_price', ask: 'editAskPrice' },
      ef_photo: { step: 'edit_photo', ask: 'editAskPhoto' },
    }
    const fm = fieldMap[data]
    if (!fm) { await bot.answerCallbackQuery(query.id); return }
    d.step = fm.step; setDialog(fromId, d)
    await bot.answerCallbackQuery(query.id)
    // Edit phone uses reply keyboard with back; all others use inline back button
    if (data === 'ef_phone') {
      await bot.sendMessage(chatId, tr(lang, fm.ask), {
        parse_mode: 'HTML', reply_markup: phoneWithBackKeyboard(lang),
      })
    } else {
      await bot.sendMessage(chatId, tr(lang, fm.ask), {
        parse_mode: 'HTML', reply_markup: { inline_keyboard: [backRow(lang)] },
      })
    }
    return
  }

  // ── Settings ────────────────────────────────────────────────────────────────
  if (data === 'settings_lang') {
    const lang = getUserLang(fromId)
    setDialog(fromId, { lang, step: 'idle' })
    await bot.answerCallbackQuery(query.id)
    await showLangSelect(chatId)
    return
  }

  if (data === 'settings_phone') {
    const lang = getUserLang(fromId)
    setDialog(fromId, { lang, step: 'settings_phone' })
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, tr(lang, 'askNewPhone'), {
      parse_mode: 'HTML', reply_markup: phoneWithBackKeyboard(lang),
    })
    return
  }

  // ── Admin panel ─────────────────────────────────────────────────────────────
  if (data === 'admin_main') {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    adminState.delete(OWNER_ID); await bot.answerCallbackQuery(query.id)
    await showAdminMenu(chatId); return
  }

  if (data === 'admin_card') {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    adminState.set(OWNER_ID, { step: 'card_number' }); await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, "Yangi karta raqamini yuboring:"); return
  }

  if (data === 'admin_prices') {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const cfg     = loadConfig()
    const buttons = cfg.categories.map((cat, i) => [{
      text: `${i+1}. ${cat.name} — ${fmt(cat.price)} so'm`, callback_data: `admin_cat_${i}`,
    }])
    buttons.push([{ text: '🔙 Orqaga', callback_data: 'admin_main' }])
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, `💰 <b>Kategoriyalar narxlari:</b>\n${DIV}`, {
      parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons },
    }); return
  }

  if (data.startsWith('admin_cat_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const idx = Number(data.slice(10)); const cfg = loadConfig(); const cat = cfg.categories[idx]
    if (!cat) { await bot.answerCallbackQuery(query.id); return }
    adminState.set(OWNER_ID, { step: 'price_input', categoryIdx: idx })
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId,
      `<b>${cat.name}</b>\nJoriy narx: <b>${fmt(cat.price)} so'm</b>\n\nYangi narxni yuboring:`,
      { parse_mode: 'HTML' }); return
  }

  if (data === 'admin_stats') {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const s = loadStats(); await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, [
      `📊 <b>Statistika:</b>\n${DIV}`, '',
      `✅ Tasdiqlangan: <b>${s.approved}</b> ta`,
      `❌ Rad etilgan: <b>${s.rejected}</b> ta`,
      `⏳ Kutilmoqda: <b>${pending.size}</b> ta`,
    ].join('\n'), { parse_mode: 'HTML' }); return
  }

  if (data.startsWith('admin_editprice_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const idx = Number(data.slice(16)); const cfg = loadConfig(); const cat = cfg.categories[idx]
    if (!cat) { await bot.answerCallbackQuery(query.id); return }
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId,
      `${idx+1}. <b>${cat.name}</b>\nJoriy narx: <b>${fmt(cat.price)} so'm</b>\n\n` +
      `Yangi narx:\n<code>/setprice ${idx+1} YANGI_NARX</code>`, { parse_mode: 'HTML' }); return
  }

  // ── Approve ─────────────────────────────────────────────────────────────────
  if (data.startsWith('approve_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const targetId = Number(data.slice(8)); const p = pending.get(targetId)
    if (!p) { await bot.answerCallbackQuery(query.id, { text: "Ariza topilmadi (eskirgan)" }); return }

    console.log(`[ADMIN] approve User: ${targetId}`)
    await bot.answerCallbackQuery(query.id, { text: '✅ Tasdiqlandi' })
    pending.delete(targetId); incStat('approved')
    if (p.adId) updateUserAdStatus(targetId, p.adId, 'approved')

    try {
      const me = await bot.getMe(); const cfg = loadConfig()
      const cat = cfg.categories[p.categoryIdx]; const postText = buildGroupPostText(p, cfg, me.username)
      const threadOpt = cat.topic_id ? { message_thread_id: Number(cat.topic_id) } : {}
      const photos = p.photos ?? []
      if (photos.length === 1) {
        await bot.sendPhoto(GROUP_ID, photos[0], { caption: postText, parse_mode: 'HTML', ...threadOpt })
      } else if (photos.length > 1) {
        const media = photos.map((fid, i) => ({
          type: 'photo', media: fid, ...(i === 0 ? { caption: postText, parse_mode: 'HTML' } : {}),
        }))
        await bot.sendMediaGroup(GROUP_ID, media, threadOpt)
      } else {
        await bot.sendMessage(GROUP_ID, postText, { parse_mode: 'HTML', ...threadOpt })
      }
      console.log(`[PUBLISHED] ${cat.name} topic:${cat.topic_id ?? '-'}`)
    } catch (err) { console.error(`[ERROR] publish: ${err.message}`) }

    try {
      await bot.editMessageCaption(
        (query.message.caption || '') + '\n\n✅ Tasdiqlandi',
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
      )
    } catch {}

    await bot.sendMessage(targetId, tr(p.lang ?? 'uz', 'approved'), { parse_mode: 'HTML' })
    return
  }

  // ── Reject ──────────────────────────────────────────────────────────────────
  if (data.startsWith('reject_')) {
    if (fromId !== OWNER_ID) { await bot.answerCallbackQuery(query.id); return }
    const targetId = Number(data.slice(7)); const p = pending.get(targetId)
    if (!p) { await bot.answerCallbackQuery(query.id, { text: "Ariza topilmadi" }); return }

    console.log(`[ADMIN] reject User: ${targetId}`)
    await bot.answerCallbackQuery(query.id, { text: '❌ Rad etildi' })
    pending.delete(targetId); incStat('rejected')
    if (p.adId) updateUserAdStatus(targetId, p.adId, 'rejected')

    try {
      await bot.editMessageCaption(
        (query.message.caption || '') + '\n\n❌ Rad etildi',
        { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }
      )
    } catch {}

    await bot.sendMessage(targetId, tr(p.lang ?? 'uz', 'rejected') + ADMIN_USERNAME, { parse_mode: 'HTML' })
    return
  }

  await bot.answerCallbackQuery(query.id)
})

// ─── Error handling ───────────────────────────────────────────────────────────

bot.on('polling_error', (err) => console.error(`[ERROR] polling: ${err.code} ${err.message}`))
bot.on('error',         (err) => console.error(`[ERROR] ${err.message}`))

console.log('✅ Biznes Hamkorlar bot ishga tushdi')
