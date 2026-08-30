# Lumen Support

AI-first customer support that replies in your language, reads your screenshots, and hands off to a real person the moment it should.

**Live site:** [lumen-support-six.vercel.app](https://lumen-support-six.vercel.app)

---

## What it does

Lumen Support is a multilingual AI chat widget that handles customer support automatically. It resolves most issues in the chat — in whatever language the customer opens with — and escalates the rest to real humans via email, Telegram, and Razorpay.

### How a conversation flows

1. **Describe it, or show it** — The customer types the issue in any language, or attaches a screenshot.
2. **Resolved in the chat** — Payment status checks, refund timelines, account questions — handled directly.
3. **Ticket drafted** — When something genuinely needs a person, a clean summary is written automatically.
4. **Routed for real** — The ticket goes to your support inbox and Telegram ops channel. Payment-gateway issues also loop in Razorpay support.

### Supported languages

English, Chinese, Hindi, Spanish, French, Arabic, Portuguese, Japanese, Korean, Russian, German — plus auto-detection for any language the customer types in.

---

## Features

| Feature | Status |
|---|---|
| Live AI chat, any language | Works out of the box |
| Ticket drafting on escalation | Works out of the box |
| Email delivery | Needs SMTP setup |
| Telegram delivery | Needs Telegram bot setup |
| Razorpay CC on payment issues | Needs Razorpay support email |
| Razorpay payment status lookup | Needs Razorpay API keys |

---

## Project structure

```
index.html          Landing page
styles.css          Landing page + widget styles
support-widget.js   Floating chat bubble/panel, works on any page
api/
  chat.js           AI replies via Hugging Face
  lookup-payment.js Razorpay payment status lookup
  escalate.js       Email + Telegram escalation
```

---

## Setup

### 1. Get a free Hugging Face token

1. Sign up at [huggingface.co](https://huggingface.co) (free, no card)
2. Go to **Settings → Access Tokens**
3. Create a new token with **Make calls to Inference Providers** permission
4. Copy the token

### 2. Deploy on Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo
3. Framework preset: leave as **Other**
4. Add environment variable: `HF_TOKEN` = your Hugging Face token
5. Click **Deploy**

### 3. Optional: Add escalation channels

Add these in Vercel **Settings → Environment Variables** as needed:

| Variable | Purpose |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email delivery |
| `SUPPORT_EMAIL` | Where escalation emails are sent |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Telegram delivery |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payment status lookups |
| `RAZORPAY_SUPPORT_EMAIL` | Razorpay support CC on payment issues |

See `.env.example` for the full list.

---

## Embedding the widget

Add these two files to any page:

```html
<link rel="stylesheet" href="styles.css">
<script src="support-widget.js" defer></script>
```

Then add `data-open-widget` to any button you want to open the chat:

```html
<button data-open-widget>Chat with us</button>
```

---

## Security

- All secrets (`HF_TOKEN`, `RAZORPAY_KEY_SECRET`, `SMTP_PASS`, `TELEGRAM_BOT_TOKEN`) stay in Vercel's environment variables — never in frontend code.
- Consider adding rate limiting (e.g. Upstash Ratelist) before pointing real traffic at `/api/chat` and `/api/escalate`.
