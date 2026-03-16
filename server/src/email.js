import nodemailer from 'nodemailer'

function getTransport() {
  if (process.env.SMTP_HOST) {
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
  // No SMTP configured — log to console
  return null
}

export async function sendEmail({ to, subject, html, text }) {
  const transport = getTransport()

  if (!transport) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`)
    console.log(`[EMAIL] Body: ${text || html?.replace(/<[^>]+>/g, ' ')}`)
    return
  }

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
