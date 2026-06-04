const Stripe = require('stripe');

function buildDiscountSummary(promotionCode) {
  const coupon = promotionCode?.coupon || {};
  return {
    promotionCodeId: promotionCode.id,
    code: promotionCode.code,
    couponId: coupon.id || null,
    name: coupon.name || promotionCode.code,
    percentOff: Number.isFinite(Number(coupon.percent_off)) ? Number(coupon.percent_off) : null,
    amountOff: Number.isFinite(Number(coupon.amount_off)) ? Number(coupon.amount_off) / 100 : null,
    currency: coupon.currency || 'usd',
  };
}

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
    const result = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
      expand: ['data.coupon'],
    });

    const promotionCode = result.data?.[0];
    if (!promotionCode || !promotionCode.active || !promotionCode.coupon) {
      return res.status(404).json({ error: 'This discount code is invalid or expired.' });
    }

    return res.status(200).json({
      discount: buildDiscountSummary(promotionCode),
    });
  } catch (error) {
    console.error('promo-code error:', error);
    return res.status(500).json({ error: 'We couldn’t validate that discount code right now.' });
  }
};
