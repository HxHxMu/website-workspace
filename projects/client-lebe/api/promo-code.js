const Stripe = require('stripe');
const {
  CheckoutError,
  amountFromCents,
  resolvePromotionDiscount,
} = require('./_checkout-utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const code = String(req.body?.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'Please enter a discount code.' });
  }

  try {
    const stripe = Stripe(STRIPE_SECRET_KEY);
    const subtotalCents = Math.max(0, Math.round((Number(req.body?.subtotal) || 0) * 100));
    const promo = await resolvePromotionDiscount(stripe, {
      code,
      subtotalCents,
      currency: 'usd',
    });

    return res.status(200).json({
      discount: promo.summary,
      discountAmount: amountFromCents(promo.discountCents),
    });
  } catch (error) {
    console.error('promo-code error:', error);
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ error: error.publicMessage });
    }
    return res.status(500).json({ error: 'We couldn’t validate that discount code right now.' });
  }
};
