import { CONTACT, FORM_ENDPOINT } from './config';

type FieldName = 'name' | 'email' | 'phone' | 'propertyType' | 'purpose' | 'message';
type FormValues = Record<FieldName, string>;
type Validator = (value: string) => string | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s/()-]{9,20}$/;

const FIELD_LABELS: Record<FieldName, string> = {
  name: 'Meno',
  email: 'E-mail',
  phone: 'Telefón',
  propertyType: 'Typ nehnuteľnosti',
  purpose: 'Účel ocenenia',
  message: 'Správa',
};

const VALIDATORS: Record<FieldName, Validator> = {
  name: (v) => {
    if (!v) return 'Zadajte, prosím, vaše meno.';
    if (v.length < 2) return 'Meno je príliš krátke – uveďte aspoň 2 znaky.';
    return null;
  },
  email: (v) => {
    if (!v) return 'Zadajte, prosím, e-mailovú adresu, na ktorú vám môžeme odpovedať.';
    if (!EMAIL_RE.test(v)) return 'E-mailová adresa nemá správny tvar, napríklad meno@domena.sk.';
    return null;
  },
  phone: (v) => {
    if (!v) return null;
    if (!PHONE_RE.test(v) || v.replace(/\D/g, '').length < 9) {
      return 'Telefónne číslo zadajte v tvare napr. 0900 123 456 alebo +421 900 123 456.';
    }
    return null;
  },
  propertyType: (v) => (v ? null : 'Vyberte, prosím, typ nehnuteľnosti.'),
  purpose: (v) => {
    if (!v) return 'Uveďte, prosím, na aký účel ocenenie potrebujete.';
    if (v.length < 3) return 'Účel ocenenia opíšte, prosím, podrobnejšie.';
    return null;
  },
  message: (v) => {
    if (!v) return 'Napíšte, prosím, krátku správu o vašej požiadavke.';
    if (v.length < 20) return `Správa je príliš krátka – doplňte ešte aspoň ${20 - v.length} znakov.`;
    return null;
  },
};

const FIELDS = Object.keys(VALIDATORS) as FieldName[];

function buildMailto(values: FormValues): string {
  const subject = `Požiadavka na ocenenie nehnuteľnosti – ${values.propertyType}`;
  const body = [
    'Dobrý deň,',
    '',
    'obraciam sa na vás s požiadavkou na ocenenie nehnuteľnosti.',
    '',
    `Meno: ${values.name}`,
    `E-mail: ${values.email}`,
    `Telefón: ${values.phone || '—'}`,
    `Typ nehnuteľnosti: ${values.propertyType}`,
    `Účel ocenenia: ${values.purpose}`,
    '',
    'Správa:',
    values.message,
    '',
    'Ďakujem.',
  ].join('\r\n');

  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;

  const summary = form.querySelector<HTMLElement>('[data-form-summary]');
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const submit = form.querySelector<HTMLButtonElement>('[data-form-submit]');
  const submitLabel = form.querySelector<HTMLElement>('[data-submit-label]');
  const note = form.querySelector<HTMLElement>('[data-form-note]');
  let attempted = false;

  const control = (name: FieldName) =>
    form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  if (FORM_ENDPOINT) {
    if (submitLabel) submitLabel.textContent = 'Odoslať požiadavku';
    if (note) {
      note.innerHTML = `Odoslaním formulára sa vaše údaje použijú výhradne na odpoveď na vašu požiadavku. Môžete tiež napísať priamo na <a href="mailto:${CONTACT.email}">${CONTACT.email}</a>.`;
    }
  }

  const readValues = (): FormValues =>
    Object.fromEntries(FIELDS.map((name) => [name, control(name).value.trim()])) as FormValues;

  const showFieldError = (name: FieldName, message: string | null) => {
    const input = control(name);
    const field = input.closest('.field');
    const error = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    field?.classList.toggle('is-invalid', Boolean(message));
    input.setAttribute('aria-invalid', String(Boolean(message)));
    if (error) error.textContent = message ?? '';
  };

  const validateField = (name: FieldName): string | null => {
    const message = VALIDATORS[name](control(name).value.trim());
    showFieldError(name, message);
    return message;
  };

  const setStatus = (html: string, isError = false) => {
    if (!status) return;
    status.classList.toggle('is-error', isError);
    status.innerHTML = html;
  };

  const renderSummary = (errors: [FieldName, string][]) => {
    if (!summary) return;
    if (!errors.length) {
      summary.hidden = true;
      summary.innerHTML = '';
      return;
    }
    const items = errors
      .map(([name, msg]) => `<li><a href="#${control(name).id}">${FIELD_LABELS[name]}</a>: ${msg}</li>`)
      .join('');
    summary.innerHTML = `<strong>Skontrolujte, prosím, vyplnené údaje (${errors.length}).</strong><ul>${items}</ul>`;
    summary.hidden = false;
  };

  summary?.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    event.preventDefault();
    document.querySelector<HTMLElement>(link.hash)?.focus();
  });

  FIELDS.forEach((name) => {
    const input = control(name);
    input.addEventListener('blur', () => {
      if (attempted || input.value.trim()) validateField(name);
    });
    input.addEventListener('input', () => {
      if (input.closest('.field')?.classList.contains('is-invalid')) validateField(name);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    attempted = true;
    setStatus('');

    const errors = FIELDS.map((name) => [name, validateField(name)] as const).filter(
      (entry): entry is [FieldName, string] => entry[1] !== null,
    );
    renderSummary(errors);

    if (errors.length) {
      summary?.focus();
      return;
    }

    const values = readValues();

    if (!FORM_ENDPOINT) {
      // Bez napojenej služby: pripravíme e-mail, ktorý návštevník odošle sám.
      window.location.href = buildMailto(values);
      setStatus(
        `Vo vašom e-mailovom programe by sa mala otvoriť predvyplnená správa – skontrolujte ju a odošlite. ` +
          `Ak sa neotvorila, napíšte priamo na <a href="mailto:${CONTACT.email}">${CONTACT.email}</a> ` +
          `alebo zavolajte na <a href="${CONTACT.phoneHref}">${CONTACT.phoneDisplay}</a>.`,
      );
      return;
    }

    if (submit) submit.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Odosiela sa…';

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      form.reset();
      attempted = false;
      setStatus('Ďakujeme, vaša požiadavka bola odoslaná. Znalec sa vám ozve na uvedený kontakt.');
    } catch {
      setStatus(
        `Požiadavku sa nepodarilo odoslať. Skúste to, prosím, znova alebo napíšte priamo na ` +
          `<a href="${buildMailto(values)}">${CONTACT.email}</a>.`,
        true,
      );
    } finally {
      if (submit) submit.disabled = false;
      if (submitLabel) submitLabel.textContent = 'Odoslať požiadavku';
    }
  });
}

/** Odkazy pri službách predvyplnia typ nehnuteľnosti vo formulári. */
export function initPropertyLinks(): void {
  const select = document.querySelector<HTMLSelectElement>('#f-type');
  if (!select) return;
  document.querySelectorAll<HTMLAnchorElement>('a[data-property]').forEach((link) => {
    link.addEventListener('click', () => {
      const value = link.dataset.property ?? '';
      if ([...select.options].some((o) => o.value === value)) {
        select.value = value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });
}
