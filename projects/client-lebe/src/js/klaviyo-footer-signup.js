(() => {
  const form = document.querySelector('[data-klaviyo-signup]');
  if (!form) return;

  const companyId = form.getAttribute('data-company-id');
  const listId = form.getAttribute('data-list-id');
  if (!companyId || !listId) return;

  const status = form.querySelector('[data-form-status]');
  const input = form.querySelector('input[type="email"]');
  const submit = form.querySelector('[type="submit"]');

  function setStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
    status.classList.toggle('is-success', !isError && Boolean(message));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = input?.value.trim();
    if (!email) return;

    if (submit) submit.disabled = true;
    setStatus('');

    try {
      const response = await fetch(`https://a.klaviyo.com/client/subscriptions/?company_id=${encodeURIComponent(companyId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', revision: '2024-10-15' },
        body: JSON.stringify({
          data: {
            type: 'subscription',
            attributes: { profile: { data: { type: 'profile', attributes: { email } } } },
            relationships: { list: { data: { type: 'list', id: listId } } },
          },
        }),
      });

      if (!response.ok) throw new Error('Subscription request failed');

      form.reset();
      setStatus('You’re on the list.');
    } catch (_) {
      setStatus('Something went wrong. Please try again.', true);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
})();
