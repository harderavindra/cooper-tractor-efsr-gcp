// ─── Notification channel plug-in types ──────────────────────────────────────
// To add a new channel (SMS, WhatsApp, etc.):
//   1. Create a new file in this directory implementing NotificationChannel
//   2. Register it in NotificationService.ts
//   3. Add its key to NOTIFY_CHANNELS env var

export type NotificationEventType =
  // Service Request lifecycle
  | 'sr_assigned'
  | 'sr_reassigned'
  | 'sr_accepted'
  | 'sr_completed'
  | 'sr_closed'
  | 'sr_overdue'
  // Work Approval flow
  | 'work_approval_requested'
  | 'work_approval_am_approved'
  | 'work_approval_am_rejected'
  | 'work_approval_rsm_confirmed'
  | 'work_approval_rsm_rejected'
  // Commissioning
  | 'commissioning_assigned'
  | 'commissioning_completed'
  | 'commissioning_approved'
  | 'commissioning_reassigned'
  // User account
  | 'user_created'
  | 'user_password_reset'
  | 'user_role_changed'
  | 'user_status_changed'
  | 'user_hierarchy_changed'
  // Asset data changes
  | 'asset_client_changed'
  | 'asset_contact_changed'

export interface NotificationRecipient {
  userId: string
  name:   string
  email:  string
  mobile: string
}

export interface NotificationPayload {
  /** Push title / email subject */
  title: string
  /** Push body / short summary */
  body: string
  /** Deep-link data for push (screen, entityId, etc.) */
  data?: Record<string, string>
  /** Full HTML — used by EmailChannel only */
  html?: string
  /** Plain text — used by SmsChannel */
  smsText?: string
  /** WhatsApp template ID — used by WhatsAppChannel */
  templateId?: string
  /** WhatsApp template variable params */
  templateParams?: string[]
}

export interface NotificationEvent {
  type:       NotificationEventType
  recipients: NotificationRecipient[]
  payload:    NotificationPayload
}

/** Every channel implements this single method */
export interface NotificationChannel {
  readonly name: string
  send(event: NotificationEvent): Promise<void>
}
