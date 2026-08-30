# Lumen Support

A landing page with a live, multilingual AI support chat embedded (bottom-right
bubble). Chat runs on Hugging Face's **free** Inference API; unresolved issues
get escalated by email, Telegram, and — for payment issues — CC'd to Razorpay
support. No paid API required.

```
index.html          landing page
styles.css          landing page + widget styles
support-widget.js   the floating chat bubble/panel, injected on any page that includes it
api/
  chat.js           talks to Hugging Face for AI replies
  lookup-payment.js looks up a real payment's status on Razorpay
  escalate.js       sends the real email + Telegram message when a human is needed
```

## 1. Get a free Hugging Face token

1. Create a free account at [huggingface.co](https://huggingface.co).
2. Settings → Access Tokens → **New token** → type **Read** → copy it.
   No card, no payment info required.

That's the only credential you *need* to get the chat working. Email,
Telegram, and Razorpay are optional add-ons for the escalation step — leave
them unset and escalation still runs, it'll just tell the user delivery isn't
wired up yet, instead of pretending it sent something.

## 2. Push to GitHub

```bash
cd lumen-support
git init
git add .
git commit -m "Lumen Support site"
git branch -M main
git remote add origin https://github.com/<your-username>/lumen-support.git
git push -u origin main
```

(Create the empty repo on GitHub first if you haven't — github.com/new.)

## 3. Deploy on Vercel

**Option A — dashboard (no CLI):**
1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo.
2. Framework preset: leave as **Other** — no build step needed, this is a
   plain static site with serverless functions in `/api`.
3. Before clicking Deploy, open **Environment Variables** and add at minimum:
   - `HF_TOKEN` = your Hugging Face token
   - `HF_MODEL` = `Qwen/Qwen2.5-7B-Instruct` (or leave unset, that's the default)
   - Add the Razorpay/SMTP/Telegram ones too if you want real escalation delivery (see `.env.example`).
4. Click **Deploy**. You'll get a live `https://your-project.vercel.app` URL.

**Option B — CLI:**
```bash
npm i -g vercel
vercel login
vercel          # first deploy, follow the prompts
vercel env add HF_TOKEN
# repeat vercel env add for any other variables you're using
vercel --prod
```

## 4. Try it

Open your deployed URL, click the chat bubble bottom-right, and talk to it in
any language. Attach a screenshot too — the free model can't see images, but
it'll ask you to describe it rather than making something up, and the image
still gets forwarded to your support team if you escalate.

## What's real vs. what needs setup

| Feature | Status |
|---|---|
| Live AI chat, any language | Works as soon as `HF_TOKEN` is set |
| Screenshot understanding | **Not available** on this free text-only model — see below |
| Ticket drafting on escalation | Works as soon as `HF_TOKEN` is set |
| Email delivery | Works once `SMTP_*` / `SUPPORT_EMAIL` are set |
| Telegram delivery | Works once `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` are set |
| Razorpay CC on payment issues | Works once `RAZORPAY_SUPPORT_EMAIL` is set |
| Real Razorpay payment status lookup | `/api/lookup-payment` works once `RAZORPAY_KEY_ID`/`SECRET` are set — not yet wired into the chat flow automatically, but ready to call |

### About the "no tokens" trade-off

Free almost always means *some* limit. Hugging Face's free Inference API needs
one signup and one token (not a payment method), and:

- **The default model is text-only.** It can't actually look at screenshots.
  If real image understanding matters more than staying free, swap `HF_MODEL`
  for a hosted vision-capable model on a paid provider, or ask me to wire the
  Anthropic version back in (already built, see the standalone demo from
  earlier in this conversation) — that one genuinely reads screenshots.
- **Free-tier models can be slower and less consistent** at following the
  formatting instructions (like the hidden status marker that drives the
  resolution meter) than a frontier model. It'll mostly work; expect the
  occasional rough edge.
- **Cold starts**: if a model hasn't been called in a while, Hugging Face can
  take several seconds to spin it up. `api/chat.js` already retries once
  automatically when that happens, so the first message of the day might just
  feel a bit slower.
- **Rate limits** on the free tier are modest and can change without much
  notice — fine for a demo or low-traffic site, worth monitoring before
  pointing real customer traffic at it.

## Security notes

- Never put `HF_TOKEN`, `RAZORPAY_KEY_SECRET`, `SMTP_PASS`, or
  `TELEGRAM_BOT_TOKEN` in frontend code — they only ever belong in Vercel's
  environment variables, which is exactly where this setup keeps them.
- Consider adding rate limiting in front of `/api/chat` and `/api/escalate`
  before pointing real traffic at this (e.g. Vercel's Edge Config + a counter,
  or a service like Upstash Ratelimit) — the free HF quota is easy to exhaust
  if someone hammers the endpoint.
