/**
 * Contact form submission — Vercel serverless function (Node runtime, not part of the
 * Vite bundle; deployed from this file's path automatically).
 *
 * Sends through the Gmail API rather than a client-exposed mailto, using a refresh token
 * for OAuth2 rather than a package: Node's built-in fetch covers both the token refresh
 * and the send, so nothing needs installing.
 *
 * Requires these env vars, set in the Vercel project settings (not committed):
 *   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN — from a Google Cloud
 *     OAuth2 client with the gmail.send scope, authorized once against the sending
 *     account to obtain the refresh token.
 *   CONTACT_TO — destination address. Falls back to the personal address below if unset,
 *     so this still works the moment the OAuth vars exist.
 */

const MAX_LENGTHS = { name: 200, email: 320, message: 5000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @param {string} value */
function toBase64Url(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function refreshAccessToken() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) throw new Error(`token refresh failed: ${response.status}`);
  const { access_token } = await response.json();
  return access_token;
}

/**
 * @param {{ accessToken: string, to: string, name: string, email: string, message: string }} args
 */
async function sendMail({ accessToken, to, name, email, message }) {
  // Reply-To carries the visitor's address so replying goes straight to them, rather
  // than to the account this is sent from.
  const mime = [
    `To: ${to}`,
    `Reply-To: ${email}`,
    `Subject: Site contact from ${name}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    `${name} <${email}> wrote:`,
    '',
    message,
  ].join('\r\n');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: toBase64Url(mime) }),
  });

  if (!response.ok) throw new Error(`gmail send failed: ${response.status}`);
}

/**
 * @param {import('http').IncomingMessage & { body?: any }} req
 * @param {import('http').ServerResponse & { status: (code: number) => any, json: (body: any) => void }} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { name, email, message } = req.body ?? {};
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    res.status(400).json({ error: 'missing fields' });
    return;
  }

  const trimmed = { name: name.trim(), email: email.trim(), message: message.trim() };
  if (!trimmed.name || !trimmed.email || !trimmed.message) {
    res.status(400).json({ error: 'missing fields' });
    return;
  }
  if (
    trimmed.name.length > MAX_LENGTHS.name ||
    trimmed.email.length > MAX_LENGTHS.email ||
    trimmed.message.length > MAX_LENGTHS.message
  ) {
    res.status(400).json({ error: 'too long' });
    return;
  }
  if (!EMAIL_PATTERN.test(trimmed.email)) {
    res.status(400).json({ error: 'invalid email' });
    return;
  }

  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    res.status(500).json({ error: 'contact form is not configured yet' });
    return;
  }

  try {
    const accessToken = await refreshAccessToken();
    await sendMail({
      accessToken,
      to: process.env.CONTACT_TO || 'khiem06072007@gmail.com',
      ...trimmed,
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[contact]', err);
    res.status(502).json({ error: 'could not send message' });
  }
}
