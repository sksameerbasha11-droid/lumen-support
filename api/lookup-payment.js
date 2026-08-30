/**
 * POST /api/lookup-payment
 * Body: { paymentId: string }
 * Returns real payment status/details from Razorpay — useful context to hand
 * the AI or a human agent when a user reports a stuck/failed charge.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    res.status(500).json({ error: 'Server is missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET' });
    return;
  }

  const { paymentId } = req.body || {};
  if (!paymentId) {
    res.status(400).json({ error: 'paymentId is required' });
    return;
  }

  try {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const upstream = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.description || 'Payment not found' });
      return;
    }
    res.status(200).json({
      id: data.id,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      error_code: data.error_code,
      error_description: data.error_description,
      order_id: data.order_id,
      created_at: data.created_at,
    });
  } catch (err) {
    console.error('lookup-payment error', err);
    res.status(502).json({ error: 'Failed to reach Razorpay' });
  }
};
