/**
 * POST /api/escalate
 * Body: { transcript, ticketSummary, category, language, screenshots: [{mediaType,data}] }
 * Returns: { ticketId, isPayment, delivered: { email, telegram, razorpayLooped } }
 */
const nodemailer = require('nodemailer');

function makeTicketId() {
  return 'TCK-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function sendEscalationEmail({ ticketId, transcript, ticketSummary, category, language, screenshots, isPayment }) {
  const { SMTP_HOST, SMTP_PORT = 587, SMTP_USER, SMTP_PASS, SUPPORT_EMAIL, RAZORPAY_SUPPORT_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SUPPORT_EMAIL) return { sent: false, reason: 'SMTP not configured' };

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const cc = isPayment && RAZORPAY_SUPPORT_EMAIL ? RAZORPAY_SUPPORT_EMAIL : undefined;

  await transporter.sendMail({
    from: SMTP_USER,
    to: SUPPORT_EMAIL,
    cc,
    subject: `[${ticketId}] Support escalation — ${category || 'general'}`,
    text: `${ticketSummary}\n\nLanguage: ${language}\n\n--- Full transcript ---\n${transcript}`,
    attachments: (screenshots || []).map((s, i) => ({
      filename: `screenshot-${i + 1}.png`,
      content: Buffer.from(s.data, 'base64'),
      contentType: s.mediaType || 'image/png',
    })),
  });
  return { sent: true, cc: Boolean(cc) };
}

async function sendEscalationTelegram({ ticketId, ticketSummary, screenshots }) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return { sent: false, reason: 'Telegram not configured' };

  let text = `🎫 *${ticketId}*\n${ticketSummary}`;
  if (text.length > 4000) {
    text = text.slice(0, 3997) + '...';
  }
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
  });

  if (screenshots && screenshots.length) {
    const first = screenshots[0];
    const form = new FormData();
    form.append('chat_id', TELEGRAM_CHAT_ID);
    form.append('caption', `${ticketId} — attached screenshot`);
    form.append('photo', new Blob([Buffer.from(first.data, 'base64')], { type: first.mediaType || 'image/png' }), 'screenshot.png');
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: form });
  }
  return { sent: true };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { transcript, ticketSummary, category, language, screenshots } = req.body || {};
  if (!transcript || !ticketSummary) {
    res.status(400).json({ error: 'transcript and ticketSummary are required' });
    return;
  }

  const isPayment = /payment|refund|razorpay|charge|transaction/i.test(`${category || ''} ${ticketSummary}`);
  const ticketId = makeTicketId();

  const [emailResult, telegramResult] = await Promise.all([
    sendEscalationEmail({ ticketId, transcript, ticketSummary, category, language, screenshots, isPayment }).catch((e) => ({ sent: false, error: String(e) })),
    sendEscalationTelegram({ ticketId, ticketSummary, screenshots }).catch((e) => ({ sent: false, error: String(e) })),
  ]);

  res.status(200).json({
    ticketId,
    isPayment,
    delivered: {
      email: emailResult.sent,
      telegram: telegramResult.sent,
      razorpayLooped: isPayment && Boolean(emailResult.cc),
    },
  });
};
