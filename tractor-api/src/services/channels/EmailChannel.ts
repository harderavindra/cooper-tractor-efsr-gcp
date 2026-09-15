import nodemailer, { Transporter } from 'nodemailer'
import type { NotificationChannel, NotificationEvent } from './types.js'

function createTransport(): Transporter {
  // SendGrid via SMTP (preferred)
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host:   'smtp.sendgrid.net',
      port:   587,
      auth:   { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
      secure: false,
    })
  }
  // Generic SMTP fallback (dev / self-hosted)
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   ?? 'localhost',
    port:   Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
      : undefined,
  })
}

export class EmailChannel implements NotificationChannel {
  readonly name = 'email'
  private transport = createTransport()
  private from = process.env.EMAIL_FROM ?? '"Cooper Corp" <no-reply@coopercorp.in>'

  async send(event: NotificationEvent): Promise<void> {
    const targets = event.recipients.filter(r => r.email)
    if (!targets.length) return

    await Promise.allSettled(
      targets.map(r =>
        this.transport.sendMail({
          from:    this.from,
          to:      `"${r.name}" <${r.email}>`,
          subject: event.payload.title,
          text:    event.payload.body,
          html:    event.payload.html ?? `<p>${event.payload.body}</p>`,
        }).catch(err => {
          console.error(`[EmailChannel] failed to send to ${r.email}:`, err?.message)
        })
      )
    )
  }
}
