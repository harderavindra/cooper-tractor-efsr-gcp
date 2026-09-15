// ─── SMS Channel — STUB ───────────────────────────────────────────────────────
// Plug in MSG91 (India) or Twilio here when ready.
//
// To activate:
//   1. Install the provider SDK  (e.g. npm install msg91)
//   2. Replace the console.log below with the actual API call
//   3. Add SMS_PROVIDER_API_KEY to your env
//   4. Add 'sms' to NOTIFY_CHANNELS env var

import type { NotificationChannel, NotificationEvent } from './types.js'

export class SmsChannel implements NotificationChannel {
  readonly name = 'sms'

  async send(event: NotificationEvent): Promise<void> {
    const targets = event.recipients.filter(r => r.mobile && event.payload.smsText)
    if (!targets.length) return

    for (const r of targets) {
      // TODO: replace with MSG91 / Twilio call
      // await msg91.send({ mobile: r.mobile, message: event.payload.smsText })
      console.log(`[SMS stub] → ${r.mobile}: ${event.payload.smsText}`)
    }
  }
}
