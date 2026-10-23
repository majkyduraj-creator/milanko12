type FieldName = 'name' | 'email' | 'phone' | 'interest' | 'message' | 'privacy';
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s/()-]{9,20}$/;

const LABELS: Record<FieldName, string> = {
  name: 'Meno a priezvisko',
  email: 'E-mail',
  phone: 'Telefón',
  interest: 'Oblasť záujmu',
  message: 'Správa',
  privacy: 'Ochrana osobných údajov',
};

const RULES: Record<FieldName, (c: Control) => string | null> = {
  name: (c) => {
    const v = c.value.trim();
    if (!v) return 'Zadajte, prosím, vaše meno a priezvisko.';
    if (v.length < 3) return 'Meno a priezvisko je príliš krátke.';
    return null;
  },
  email: (c) => {
    const v = c.value.trim();
    if (!v) return 'Zadajte, prosím, váš e-mail, aby bolo možné vám odpovedať.';
    if (!EMAIL_RE.test(v)) return 'E-mailová adresa nemá správny tvar, napríklad meno@domena.sk.';
    return null;
  },
  phone: (c) => {
    const v = c.value.trim();
    if (!v) return null;
    if (!PHONE_RE.test(v) || v.replace(/\D/g, '').length < 9) {
      return 'Telefónne číslo zadajte v tvare napr. 0900 123 456 alebo +421 900 123 456.';
    }
    return null;
  },
  interest: (c) => (c.value ? null : 'Vyberte, prosím, oblasť, o ktorú máte záujem.'),
  message: (c) => {
    const v = c.value.trim();
    if (!v) return 'Napíšte, prosím, krátko, s čím vám môžem pomôcť.';
    if (v.length < 10) return 'Správa je príliš krátka – doplňte, prosím, aspoň pár slov.';
    return null;
  },
  privacy: (c) =>
    (c as HTMLInputElement).checked
      ? null
      : 'Pre odoslanie je potrebné potvrdiť oboznámenie sa so spracúvaním osobných údajov.',
};

const FIELDS = Object.keys(RULES) as FieldName[];

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** Tlačidlá „Konzultovať túto oblasť“ predvyplnia oblasť záujmu vo formulári. */
export function initInterestLinks(): void {
  const select = document.querySelector<HTMLSelectElement>('#f-interest');
  if (!select) return;
  document.querySelectorAll<HTMLAnchorElement>('a[data-interest]').forEach((link) => {
    link.addEventListener('click', () => {
      const value = link.dataset.interest ?? '';
      if ([...select.options].some((o) => o.value === value)) {
        select.value = value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Po doskrolovaní presunieme fokus do formulára (bez ďalšieho skoku stránky).
      window.setTimeout(() => document.querySelector<HTMLInputElement>('#f-name')?.focus({ preventScroll: true }), 700);
    });
  });
}

export function initForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-form]');
  if (!form) return;

  const summary = form.querySelector('[data-form-summary]') as HTMLElement;
  const status = form.querySelector('[data-form-status]') as HTMLElement;
  const submit = form.querySelector('[data-form-submit]') as HTMLButtonElement;
  const label = form.querySelector('[data-submit-label]') as HTMLElement;
  const control = (name: FieldName) => form.elements.namedItem(name) as Control;
  const startedAt = Date.now();
  let attempted = false;
  let sending = false;

  const showError = (name: FieldName, message: string | null) => {
    const c = control(name);
    c.closest('.field')?.classList.toggle('is-invalid', Boolean(message));
    c.setAttribute('aria-invalid', String(Boolean(message)));
    const error = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (error) error.textContent = message ?? '';
  };

  const check = (name: FieldName) => {
    const message = RULES[name](control(name));
    showError(name, message);
    return message;
  };

  const renderSummary = (errors: [FieldName, string][]) => {
    summary.hidden = errors.length === 0;
    summary.innerHTML = errors.length
      ? `<strong>Skontrolujte, prosím, formulár (${errors.length}).</strong><ul>${errors
          .map(([n, m]) => `<li><a href="#${control(n).id}">${LABELS[n]}</a>: ${escapeHtml(m)}</li>`)
          .join('')}</ul>`
      : '';
  };

  summary.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    event.preventDefault();
    document.querySelector<HTMLElement>(link.hash)?.focus();
  });

  FIELDS.forEach((name) => {
    const c = control(name);
    const revalidate = () => {
      if (c.closest('.field')?.classList.contains('is-invalid')) check(name);
    };
    c.addEventListener('input', revalidate);
    c.addEventListener('change', revalidate);
    c.addEventListener('blur', () => {
      if (attempted || (c.type !== 'checkbox' && c.value.trim())) check(name);
    });
  });

  const setStatus = (html: string, isError = false) => {
    status.classList.toggle('is-error', isError);
    status.innerHTML = html;
  };

  const setBusy = (busy: boolean) => {
    sending = busy;
    submit.disabled = busy;
    submit.setAttribute('aria-busy', String(busy));
    label.textContent = busy ? 'Odosielam…' : 'Odoslať žiadosť';
  };

  const fallback = () =>
    __SITE__.email
      ? ` Môžete mi tiež napísať priamo na <a href="mailto:${escapeHtml(__SITE__.email)}">${escapeHtml(__SITE__.email)}</a>.`
      : '';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return; // ochrana pred dvojitým odoslaním
    attempted = true;
    setStatus('');

    const errors = FIELDS.map((n) => [n, check(n)] as const).filter(
      (e): e is [FieldName, string] => e[1] !== null,
    );
    renderSummary(errors);
    if (errors.length) {
      summary.focus();
      return;
    }

    const payload = {
      name: control('name').value.trim(),
      email: control('email').value.trim(),
      phone: control('phone').value.trim(),
      interest: control('interest').value,
      message: control('message').value.trim(),
      privacy: (control('privacy') as HTMLInputElement).checked,
      website: (form.elements.namedItem('website') as HTMLInputElement).value,
      startedAt,
    };

    setBusy(true);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok: boolean; error?: string; fields?: Partial<Record<FieldName, string>> }
        | null;

      if (response.ok && data?.ok) {
        form.reset();
        attempted = false;
        setStatus(
          '<strong>Ďakujem, vaša žiadosť bola odoslaná.</strong> Ozvem sa vám čo najskôr, aby sme sa dohodli na ďalšom postupe.',
        );
        return;
      }

      if (data?.fields) {
        const serverErrors = Object.entries(data.fields) as [FieldName, string][];
        serverErrors.forEach(([n, m]) => showError(n, m));
        renderSummary(serverErrors);
      }
      setStatus(`${escapeHtml(data?.error ?? 'Žiadosť sa nepodarilo odoslať.')}${fallback()}`, true);
    } catch {
      setStatus(`Žiadosť sa nepodarilo odoslať – skontrolujte pripojenie a skúste to znova.${fallback()}`, true);
    } finally {
      setBusy(false);
    }
  });
}
