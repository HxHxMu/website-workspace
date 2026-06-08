const {
  SupportError,
  generateReferenceId,
  normalizeEmail,
  normalizeText,
  requiredText,
  sendSupportRequest,
  validateHoneypot,
} = require('./_support-email');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    validateHoneypot(body);

    const name = requiredText(body, 'name', 'Name', 120);
    const email = normalizeEmail(body.email);
    const topic = requiredText(body, 'topic', 'Topic', 120);
    const message = requiredText(body, 'message', 'Message', 3000);
    const referenceId = generateReferenceId();

    const delivery = await sendSupportRequest({
      referenceId,
      customerEmail: email,
      customerName: name,
      staffSubject: `[${referenceId}] LEBE contact: ${topic}`,
      staffIntro: 'New general contact request from LEBE.life.',
      staffFields: {
        Name: name,
        Email: email,
        Topic: topic,
        Message: message,
      },
      customerSubject: `LEBE received your message — ${referenceId}`,
      customerIntro: 'Thanks for reaching out. This confirms your message was received.',
    });

    return res.status(200).json({ ok: true, referenceId, ...delivery });
  } catch (error) {
    console.error('contact support error:', error);
    if (error instanceof SupportError) {
      return res.status(error.status).json({ error: error.publicMessage });
    }
    return res.status(500).json({ error: 'We could not send your request right now. Please try again.' });
  }
};
