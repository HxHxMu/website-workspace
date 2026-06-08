const {
  SupportError,
  generateReferenceId,
  normalizeEmail,
  normalizeText,
  requiredText,
  sendSupportRequest,
  validateHoneypot,
} = require('./_support-email');

const ISSUE_TYPES = new Set([
  'damaged',
  'defective',
  'incorrect',
  'missing',
  'other',
]);

function normalizeIssueType(value) {
  const issueType = normalizeText(value, 60).toLowerCase();
  if (!ISSUE_TYPES.has(issueType)) {
    throw new SupportError(400, 'Please choose an issue type.');
  }
  return issueType;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    validateHoneypot(body);

    const orderNumber = requiredText(body, 'orderNumber', 'Order number', 80);
    const name = requiredText(body, 'name', 'Name', 120);
    const email = normalizeEmail(body.email);
    const issueType = normalizeIssueType(body.issueType);
    const description = requiredText(body, 'description', 'Description', 3000);
    const photoLinks = normalizeText(body.photoLinks, 1500);
    const referenceId = generateReferenceId();

    await sendSupportRequest({
      referenceId,
      customerEmail: email,
      customerName: name,
      staffSubject: `[${referenceId}] LEBE order issue: ${orderNumber}`,
      staffIntro: 'New order issue request from LEBE.life.',
      staffFields: {
        'Order number': orderNumber,
        Name: name,
        Email: email,
        'Issue type': issueType,
        Description: description,
        'Photo links': photoLinks || 'No photo links provided',
      },
      customerSubject: `LEBE received your order issue — ${referenceId}`,
      customerIntro: 'Thanks for sending the details. If photos are needed, we’ll request them in our reply.',
    });

    return res.status(200).json({ ok: true, referenceId });
  } catch (error) {
    console.error('order issue support error:', error);
    if (error instanceof SupportError) {
      return res.status(error.status).json({ error: error.publicMessage });
    }
    return res.status(500).json({ error: 'We could not send your request right now. Please try again.' });
  }
};
