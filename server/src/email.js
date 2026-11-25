import nodemailer from 'nodemailer'

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getTransport() {
  if (!isEmailConfigured()) {
    throw new Error('Email delivery is unavailable because SMTP is not configured.')
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmail({ to, subject, html, text }) {
  // Local development without SMTP: log the email (including any links) instead of failing.
  // Production still fails so nothing is silently skipped.
  if (!isEmailConfigured() && process.env.NODE_ENV !== 'production') {
    console.log(`[email not sent — SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n${text || html}\n`)
    return
  }

  const transport = getTransport()

  await transport.sendMail({
    from: process.env.SMTP_FROM || `"Houzeey" <no-reply@houzeey.com>`,
    to,
    subject,
    html,
    text,
  })
}

export async function sendNotificationEmail(user, title, body, link) {
  if (!user?.email) return
  await sendEmail({
    to: user.email,
    subject: `Houzeey: ${title}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1a5c28;">${title}</h2>
        <p>${body}</p>
        ${link ? `<a href="${process.env.CLIENT_URL || 'http://localhost:5173'}${link}" style="display:inline-block;padding:12px 24px;background:#3bb54a;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0;">View Details</a>` : ''}
        <p style="color:#9ca3af;font-size:0.85rem;margin-top:24px;">You're receiving this because you have an account at Houzeey. <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/profile" style="color:#3bb54a;">Manage notifications</a></p>
      </div>
    `,
  })
}
