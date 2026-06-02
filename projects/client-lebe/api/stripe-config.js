module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    return res.status(500).json({ error: 'STRIPE_PUBLISHABLE_KEY is not set' });
  }

  res.status(200).json({ publishableKey: key });
};
