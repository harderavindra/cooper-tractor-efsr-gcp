// ─── WhatsApp Channel — Meta Cloud API ───────────────────────────────────────
// Requires env vars:
//   WHATSAPP_TOKEN    — Meta Cloud API bearer token
//   WHATSAPP_PHONE_ID — WhatsApp Business phone number ID
//   NOTIFY_CHANNELS   — must include 'whatsapp' to activate
//
// Templates must be pre-approved in Meta WABA before use.

import type { NotificationChannel, NotificationEvent } from './types.js'

export class WhatsAppChannel implements NotificationChannel {
  readonly name = 'whatsapp'

  async send(event: NotificationEvent): Promise<void> {
    const token   = process.env.WHATSAPP_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_ID
    if (!token || !phoneId) return

    const targets = event.recipients.filter(r => r.mobile && event.payload.templateId)
    if (!targets.length) return

    await Promise.allSettled(targets.map(r => {
      const to = r.mobile.startsWith('+') ? r.mobile : `+91${r.mobile}`
      return fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name:     event.payload.templateId,
            language: { code: 'en' },
            components: event.payload.templateParams?.length ? [{
              type:       'body',
              parameters: event.payload.templateParams.map(v => ({ type: 'text', text: String(v) })),
            }] : [],
          },
        }),
      })
    }))
  }
}
