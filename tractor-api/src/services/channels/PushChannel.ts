// Firebase Admin is imported dynamically to avoid GCP metadata discovery at
// module load time (which can hang outside GCP).
import { User } from '../../models/User.js'
import type { NotificationChannel, NotificationEvent } from './types.js'

let firebaseReady = false
let firebaseInit  = false

async function ensureFirebase(): Promise<boolean> {
  if (firebaseInit) return firebaseReady
  firebaseInit = true

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) {
    console.warn('[PushChannel] FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled')
    return false
  }
  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app')
    if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) })
    firebaseReady = true
  } catch (err) {
    console.error('[PushChannel] Firebase init failed:', (err as Error).message)
  }
  return firebaseReady
}

export class PushChannel implements NotificationChannel {
  readonly name = 'push'

  async send(event: NotificationEvent): Promise<void> {
    if (!(await ensureFirebase())) return

    const userIds = event.recipients.map(r => r.userId)
    if (!userIds.length) return

    const users = await User.find({ _id: { $in: userIds } }, { fcmTokens: 1 }).lean()
    const allTokens: string[] = []

    for (const u of users) {
      const tokens = ((u as { fcmTokens?: { token: string }[] }).fcmTokens ?? [])
        .map(t => t.token).filter(Boolean)
      allTokens.push(...tokens)
    }

    if (!allTokens.length) return

    const { title, body, data = {} } = event.payload
    const { getMessaging } = await import('firebase-admin/messaging')

    const result = await getMessaging().sendEachForMulticast({
      tokens:       allTokens,
      notification: { title, body },
      data:         { ...data, eventType: event.type },
    })

    const staleTokens: string[] = []
    result.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        staleTokens.push(allTokens[idx])
      }
    })

    if (staleTokens.length) {
      await User.updateMany(
        { _id: { $in: userIds } },
        { $pull: { fcmTokens: { token: { $in: staleTokens } } } }
      )
    }
  }
}
