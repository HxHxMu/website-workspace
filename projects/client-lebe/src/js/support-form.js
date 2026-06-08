(() => {
  const forms = document.querySelectorAll('[data-support-form]');
  if (!forms.length) return;

  function setStatus(form, message, isError = false) {
    const status = form.querySelector('[data-form-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
    status.classList.toggle('is-success', !isError && Boolean(message));
  }

  async function parseResponse(response) {
    const raw = await response.text();
    try {
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  forms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const endpoint = form.getAttribute('action');
      const submit = form.querySelector('[type="submit"]');
      const originalLabel = submit?.textContent || 'Send.';
      const payload = Object.fromEntries(new FormData(form).entries());

      setStatus(form, '');
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Sending.';
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await parseResponse(response);

        if (!response.ok) {
          throw new Error(data.error || 'We could not send this right now. Please try again.');
        }

        form.reset();
        setStatus(form, `Received. Reference ${data.referenceId}.`);
      } catch (error) {
        setStatus(form, error.message || 'We could not send this right now. Please try again.', true);
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = originalLabel;
        }
      }
    });
  });
})();
