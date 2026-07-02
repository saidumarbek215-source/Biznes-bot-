# Biznes Hamkorlar Bot

Telegram bot — pullik ariza qabul qiladi, to'lovni admin tasdiqlaydi, guruh mavzusiga joylaydi.

## Fayl tuzilmasi

```
biznes-bot/
├── index.js       — asosiy bot
├── config.json    — kategoriyalar, narxlar, karta
├── stats.json     — statistika (avtomatik yaratiladi)
├── .env           — maxfiy kalitlar
└── package.json
```

## O'rnatish

```bash
cd biznes-bot
npm install
```

## .env sozlash

```
BOT_TOKEN=bot_token
OWNER_ID=telegram_user_id
GROUP_ID=-100group_id
ADMIN_USERNAME=admin_username   # rad etilganda ko'rsatiladi
```

## config.json — karta va narxlarni tahrirlash

```json
{
  "card_number": "8600 1234 5678 9012",
  "card_holder": "FAMILIYA ISM",
  "categories": [
    { "name": "Qurilish maxsulotlari", "price": 50000, "topic_id": null }
  ]
}
```

`topic_id` — guruh mavzusining thread ID si. `/settopic` buyrug'i bilan to'ldiriladi.

## Guruh mavzulari (topic_id) ni sozlash

1. Botni guruhga **admin** sifatida qo'shing (xabar yuborish huquqi bilan)
2. Guruhda **Mavzular (Topics)** yoqilgan bo'lishi kerak
3. Har bir mavzu ichiga kiring va `/threadid` yuboring — bot thread ID sini ko'rsatadi
4. `/settopic 1 12345` buyrug'ini yuboring (1 = kategoriya raqami, 12345 = thread ID)

## Admin buyruqlari

| Buyruq | Vazifasi |
|--------|----------|
| `/prices` | Barcha kategoriyalar va narxlar ro'yxati |
| `/setprice 1 100000` | 1-kategoriya narxini 100 000 ga o'zgartirish |
| `/setcard 8600 1234 5678 9012` | Karta raqamini yangilash |
| `/settopic 3 67890` | 3-kategoriya uchun guruh mavzusi ID ni saqlash |
| `/threadid` | Guruh mavzusida thread ID ni ko'rsatish |
| `/stats` | Statistika: jami / tasdiqlangan / rad etilgan |

## Bot flow

```
/start
  → kategoriya tanlash
  → ism → telefon → tavsif → rasm (ixtiyoriy) → narx/shartlar (ixtiyoriy)
  → to'lov ma'lumotlari + karta raqami
  → foydalanuvchi chek yuboradi
  → admin tasdiqlash/rad etish
      ✅ Tasdiqlash → guruh mavzusiga joylash + foydalanuvchiga xabar
      ❌ Rad etish  → foydalanuvchiga xabar
```

## Ishga tushirish

```bash
node index.js
```

## PM2 bilan server deploy

```bash
npm install -g pm2
pm2 start index.js --name biznes-bot
pm2 startup && pm2 save

# Holat
pm2 logs biznes-bot
pm2 status
```
