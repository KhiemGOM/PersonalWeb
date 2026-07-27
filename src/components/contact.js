/**
 * Floating contact button — present on every page (docs/CONCEPT.md, "Always present").
 *
 * Two ways in, both in one panel: the raw contact details for anyone who'd rather just
 * email or call directly, and a form for anyone who'd rather do it from here. The form
 * posts to /api/contact, a Vercel serverless function that sends through the Gmail API
 * rather than exposing any address to a client-side mailto scraper.
 *
 * Bottom-left, mirroring the sound toggle's bottom-right — the two floating controls
 * never compete for the same corner.
 */

import { el } from '../lib/dom.js';

const CONTACT = {
  phone: '+65 8535 7475',
  workEmail: 'dangkhie001@e.ntu.edu.sg',
  personalEmail: 'khiem06072007@gmail.com',
  github: 'https://github.com/KhiemGOM',
};

export function createContact() {
  let open = false;

  const nameInput = el('input', { type: 'text', name: 'name', required: true, autocomplete: 'name' });
  const emailInput = el('input', { type: 'email', name: 'email', required: true, autocomplete: 'email' });
  const messageInput = el('textarea', { name: 'message', required: true, rows: 4 });
  const submitButton = el('button', { type: 'submit', className: 'contact__submit' }, 'Send');
  const status = el('p', { className: 'contact__status', role: 'status' });

  /** @param {SubmitEvent} event */
  async function onSubmit(event) {
    event.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();
    if (!name || !email || !message) return;

    submitButton.disabled = true;
    status.textContent = 'Sending...';
    status.dataset.state = 'pending';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!response.ok) throw new Error('send failed');

      status.textContent = 'Sent. Thanks for reaching out.';
      status.dataset.state = 'success';
      form.reset();
    } catch {
      status.textContent = 'Could not send that. Try email directly instead.';
      status.dataset.state = 'error';
    } finally {
      submitButton.disabled = false;
    }
  }

  const form = el(
    'form',
    { className: 'contact__form', onsubmit: onSubmit },
    el('label', { className: 'contact__field' }, el('span', null, 'Name'), nameInput),
    el('label', { className: 'contact__field' }, el('span', null, 'Email'), emailInput),
    el('label', { className: 'contact__field' }, el('span', null, 'Message'), messageInput),
    submitButton,
    status
  );

  const panel = el(
    'div',
    { className: 'contact__panel', role: 'dialog', 'aria-label': 'Contact', hidden: true },
    el(
      'dl',
      { className: 'contact__details' },
      el('dt', null, 'Phone'),
      el('dd', null, el('a', { href: `tel:${CONTACT.phone.replace(/\s+/g, '')}` }, CONTACT.phone)),
      el('dt', null, 'Work email'),
      el('dd', null, el('a', { href: `mailto:${CONTACT.workEmail}` }, CONTACT.workEmail)),
      el('dt', null, 'Personal email'),
      el('dd', null, el('a', { href: `mailto:${CONTACT.personalEmail}` }, CONTACT.personalEmail)),
      el('dt', null, 'GitHub'),
      el('dd', null, el('a', { href: CONTACT.github, target: '_blank', rel: 'noreferrer' }, 'github.com/KhiemGOM'))
    ),
    el('p', { className: 'contact__or' }, 'Or send a message directly:'),
    form
  );

  const button = el(
    'button',
    {
      type: 'button',
      className: 'contact__toggle',
      'aria-expanded': 'false',
      'aria-haspopup': 'dialog',
      onclick: () => setOpen(!open),
    },
    el('span', { className: 'contact__icon', 'aria-hidden': 'true' }),
    el('span', { className: 'contact__label' }, 'Contact')
  );

  // Set true for the rest of the current click when open() is called from outside this
  // component's own DOM (an Experience-page CTA, say). That trigger element isn't a
  // descendant of `root`, so without this the same click that opens the panel would also
  // bubble to onDocumentClick below and read as an outside click, closing it right back.
  let openedExternallyThisClick = false;

  /** @param {boolean} value */
  function setOpen(value) {
    open = value;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) nameInput.focus();
  }

  /** @param {MouseEvent} event */
  function onDocumentClick(event) {
    if (openedExternallyThisClick) {
      openedExternallyThisClick = false;
      return;
    }
    if (!open) return;
    const target = /** @type {Node} */ (event.target);
    if (root.contains(target)) return;
    setOpen(false);
  }

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    if (event.key === 'Escape' && open) setOpen(false);
  }

  const root = el('div', { className: 'contact' }, panel, button);

  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeyDown);
  document.body.appendChild(root);

  return {
    element: root,

    /** Open the panel from elsewhere on the page — the Experience page's own CTA, say. */
    open() {
      openedExternallyThisClick = true;
      setOpen(true);
    },

    destroy() {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
      root.remove();
    },
  };
}

/** @typedef {ReturnType<typeof createContact>} Contact */
