function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderEmailLayout({
  kicker = 'lebe communication',
  title,
  asideKicker = 'customer care.',
  asideText = 'Made-to-order.',
  children = '',
  footer = 'LEBE customer care',
}) {
  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background:#ffffff; color:#050505;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapeHtml(title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#ffffff;">
      <tr>
        <td align="center" style="padding:0 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:820px; border-collapse:collapse;">
            <tr>
              <td style="padding:34px 0 30px; border-bottom:1px solid #e3e3e3;">
                <div style="font-family:Georgia, 'Times New Roman', serif; font-size:28px; font-style:italic; font-weight:700; letter-spacing:-0.06em; color:#050505;">lebe.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:70px 0 34px; border-bottom:1px solid #050505;">
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:1.4; letter-spacing:0.42em; text-transform:uppercase; font-weight:700; color:#8d8d8d; margin-bottom:24px;">${escapeHtml(kicker)}</div>
                <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:72px; line-height:0.92; letter-spacing:-0.065em; font-weight:700; color:#050505;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:44px 0 56px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td valign="top" width="235" style="padding:0 56px 28px 0;">
                      <div style="font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:1.6; letter-spacing:0.42em; text-transform:uppercase; font-weight:700; color:#8d8d8d; margin-bottom:18px;">${escapeHtml(asideKicker)}</div>
                      <div style="font-family:Georgia, 'Times New Roman', serif; font-size:18px; line-height:1.45; font-style:italic; font-weight:700; color:#9a9a9a;">${escapeHtml(asideText)}</div>
                    </td>
                    <td valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.85; color:rgba(5,5,5,0.68);">
                      ${children}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 0 44px; border-top:1px solid #d8d8d8; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.7; color:#9a9a9a;">
                ${escapeHtml(footer)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderSection(title, body) {
  return `
    <section style="margin:0 0 42px;">
      <h2 style="margin:0 0 14px; font-family:Georgia, 'Times New Roman', serif; font-size:28px; line-height:1.15; letter-spacing:-0.04em; font-weight:700; color:#050505;">${escapeHtml(title)}</h2>
      <div>${body}</div>
    </section>
  `;
}

function renderParagraph(value) {
  return `<p style="margin:0 0 16px;">${escapeHtml(value)}</p>`;
}

function renderRule() {
  return '<div style="height:1px; line-height:1px; background:#d8d8d8; margin:30px 0;">&nbsp;</div>';
}

function renderRows(rows = []) {
  return rows
    .filter((row) => row && row.value !== undefined && row.value !== null && String(row.value).trim())
    .map((row) => `
      <tr>
        <td style="padding:8px 18px 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:1.4; letter-spacing:0.32em; text-transform:uppercase; font-weight:700; color:#8d8d8d;">${escapeHtml(row.label)}</td>
        <td align="right" style="padding:8px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.4; font-weight:700; color:#050505;">${escapeHtml(row.value)}</td>
      </tr>
    `).join('');
}

function renderDataTable({ headers = [], rows = [] }) {
  const headingRow = headers.length ? `
    <tr>
      ${headers.map((header, index) => `<th align="${index === headers.length - 1 ? 'right' : 'left'}" style="padding:0 0 10px; border-bottom:1px solid #050505; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:1.4; letter-spacing:0.28em; text-transform:uppercase; font-weight:700; color:#050505;">${escapeHtml(header)}</th>`).join('')}
    </tr>
  ` : '';

  const bodyRows = rows.map((row) => `
    <tr>
      ${row.map((cell, index) => `<td align="${index === row.length - 1 ? 'right' : 'left'}" style="padding:14px 0; border-bottom:1px solid #e3e3e3; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.5; color:${index === 0 ? '#050505' : 'rgba(5,5,5,0.68)'}; font-weight:${index === 0 || index === row.length - 1 ? '700' : '400'};">${escapeHtml(cell)}</td>`).join('')}
    </tr>
  `).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${headingRow}${bodyRows}</table>`;
}

function renderButton({ href, label }) {
  if (!href) return '';
  return `
    <p style="margin:22px 0 0;">
      <a href="${escapeHtml(href)}" style="display:inline-block; padding:16px 24px; background:#050505; color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:1; letter-spacing:0.34em; text-transform:uppercase; font-weight:700; text-decoration:none;">${escapeHtml(label)}</a>
    </p>
  `;
}

module.exports = {
  escapeHtml,
  renderButton,
  renderDataTable,
  renderEmailLayout,
  renderParagraph,
  renderRows,
  renderRule,
  renderSection,
};
