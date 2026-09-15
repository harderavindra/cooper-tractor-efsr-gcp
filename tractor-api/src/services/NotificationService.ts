import type { NotificationChannel, NotificationEvent, NotificationEventType, NotificationRecipient } from './channels/types.js'
import { EmailChannel }    from './channels/EmailChannel.js'
import { PushChannel }     from './channels/PushChannel.js'
import { SmsChannel }      from './channels/SmsChannel.js'
import { WhatsAppChannel } from './channels/WhatsAppChannel.js'
import * as tpl            from './emailTemplates.js'
import { User }            from '../models/User.js'

// ── Channel registry ──────────────────────────────────────────────────────────
// Add new channels here as they become available.
const ALL_CHANNELS: Record<string, NotificationChannel> = {
  email:    new EmailChannel(),
  push:     new PushChannel(),
  sms:      new SmsChannel(),
  whatsapp: new WhatsAppChannel(),
}

// Reads NOTIFY_CHANNELS env var (comma-separated).  Default: email,push
const enabledKeys = (process.env.NOTIFY_CHANNELS ?? 'email,push')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

const activeChannels: NotificationChannel[] = enabledKeys
  .map(key => ALL_CHANNELS[key])
  .filter((ch): ch is NotificationChannel => !!ch)

// ── Internal dispatcher ───────────────────────────────────────────────────────
async function dispatch(event: NotificationEvent): Promise<void> {
  if (!event.recipients.length) return
  await Promise.allSettled(
    activeChannels.map(ch =>
      ch.send(event).catch(err =>
        console.error(`[NotificationService] ${ch.name} error on ${event.type}:`, err?.message)
      )
    )
  )
}

// ── Recipient resolver ────────────────────────────────────────────────────────
export async function resolveRecipients(userIds: string[]): Promise<NotificationRecipient[]> {
  if (!userIds.length) return []
  const users = await User.find(
    { _id: { $in: userIds }, status: 'active' },
    { name: 1, email: 1, mobile: 1 }
  ).lean()
  return users.map((u: { _id: unknown; name?: string; email?: string; mobile?: string }) => ({
    userId: String(u._id),
    name:   u.name   ?? '',
    email:  u.email  ?? '',
    mobile: u.mobile ?? '',
  }))
}

// ── Public notification functions ─────────────────────────────────────────────
// Each function builds the correct NotificationEvent for its trigger and
// dispatches it.  Callers pass userIds; recipients are resolved here.

export async function notifyWorkApprovalRequested(opts: {
  recipientIds: string[]
  srId: string; srTitle: string; engineerName: string
  assetGenset: string; clientName: string; notes?: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplWorkApprovalRequested({
    srId: opts.srId, srTitle: opts.srTitle, engineerName: opts.engineerName,
    assetGenset: opts.assetGenset, clientName: opts.clientName,
    notes: opts.notes, deepLink: `${process.env.APP_URL}/sr-approvals/${opts.srId}`,
  })
  await dispatch({
    type: 'work_approval_requested',
    recipients,
    payload: {
      title: subject,
      body:  `${opts.engineerName} submitted SR #${opts.srId} for work approval.`,
      html,
      data:  { screen: 'sr-approvals', entityId: opts.srId },
      templateId: 'wa_requested',
      templateParams: [opts.srId, opts.engineerName, `${process.env.APP_URL}/sr-approvals/${opts.srId}`],
    },
  })
}

export async function notifyWorkApprovalAmApproved(opts: {
  recipientIds: string[]
  srId: string; srTitle: string; amName: string; amNote?: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplWorkApprovalAmApproved({
    srId: opts.srId, srTitle: opts.srTitle, amName: opts.amName,
    amNote: opts.amNote, deepLink: `${process.env.APP_URL}/sr-approvals/${opts.srId}`,
  })
  await dispatch({
    type: 'work_approval_am_approved',
    recipients,
    payload: {
      title: subject,
      body:  `SR #${opts.srId} approved by AM ${opts.amName}. Awaiting your RSM confirmation.`,
      html,
      data:  { screen: 'sr-approvals', entityId: opts.srId },
      templateId: 'wa_am_approved',
      templateParams: [opts.srId, opts.amName],
    },
  })
}

export async function notifyWorkApprovalAmRejected(opts: {
  recipientIds: string[]
  srId: string; srTitle: string; amName: string; rejectionNote: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplWorkApprovalAmRejected({
    srId: opts.srId, srTitle: opts.srTitle, amName: opts.amName,
    rejectionNote: opts.rejectionNote,
  })
  await dispatch({
    type: 'work_approval_am_rejected',
    recipients,
    payload: {
      title:   subject,
      body:    `SR #${opts.srId} rejected by AM ${opts.amName}. Reason: ${opts.rejectionNote}`,
      html,
      data:    { screen: 'my-tasks', entityId: opts.srId },
      smsText: `SR #${opts.srId} rejected by AM. Reason: ${opts.rejectionNote}. Please revise and resubmit.`,
      templateId: 'wa_am_rejected',
      templateParams: [opts.srId, opts.amName, opts.rejectionNote],
    },
  })
}

export async function notifyWorkApprovalRsmConfirmed(opts: {
  recipientIds: string[]
  srId: string; srTitle: string; rsmName: string; confirmedAt: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplWorkApprovalRsmConfirmed({
    srId: opts.srId, srTitle: opts.srTitle, rsmName: opts.rsmName,
    confirmedAt: opts.confirmedAt,
  })
  await dispatch({
    type: 'work_approval_rsm_confirmed',
    recipients,
    payload: {
      title:   subject,
      body:    `SR #${opts.srId} fully confirmed by RSM ${opts.rsmName}. Proceed with billing.`,
      html,
      data:    { screen: 'sr-approvals', entityId: opts.srId },
      smsText: `SR #${opts.srId} confirmed by RSM ${opts.rsmName}. Proceed with billing/closure.`,
      templateId: 'wa_rsm_confirmed',
      templateParams: [opts.srId, opts.rsmName],
    },
  })
}

export async function notifyWorkApprovalRsmRejected(opts: {
  recipientIds: string[]
  srId: string; srTitle: string; rsmName: string; rejectionNote: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplWorkApprovalRsmRejected({
    srId: opts.srId, srTitle: opts.srTitle, rsmName: opts.rsmName,
    rejectionNote: opts.rejectionNote,
  })
  await dispatch({
    type: 'work_approval_rsm_rejected',
    recipients,
    payload: {
      title:   subject,
      body:    `SR #${opts.srId} rejected by RSM ${opts.rsmName}. Reason: ${opts.rejectionNote}`,
      html,
      data:    { screen: 'sr-approvals', entityId: opts.srId },
      smsText: `SR #${opts.srId} rejected by RSM. Reason: ${opts.rejectionNote}. Please revise.`,
      templateId: 'wa_rsm_rejected',
      templateParams: [opts.srId, opts.rsmName, opts.rejectionNote],
    },
  })
}

export async function notifyUserCreated(opts: {
  recipientIds: string[]
  name: string; username: string; tempPassword: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplWelcome({
    name: opts.name, username: opts.username, tempPassword: opts.tempPassword,
  })
  await dispatch({
    type: 'user_created',
    recipients,
    payload: {
      title:   subject,
      body:    `Welcome to Cooper Corp, ${opts.name}! Your account is ready.`,
      html,
      smsText: `Your Cooper Corp account is ready. Username: ${opts.username}, Temp Password: ${opts.tempPassword}. Login: ${process.env.APP_URL}`,
    },
  })
}

export async function notifyPasswordReset(opts: {
  recipientIds: string[]
  name: string; otp: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplPasswordReset({ name: opts.name, otp: opts.otp })
  await dispatch({
    type: 'user_password_reset',
    recipients,
    payload: {
      title:   subject,
      body:    `Your Cooper Corp OTP is ${opts.otp}. Valid for 10 minutes.`,
      html,
      smsText: `Cooper Corp OTP: ${opts.otp}. Valid for 10 minutes. Do not share this.`,
    },
  })
}

export async function notifyUserRoleChanged(opts: {
  recipientIds: string[]
  name: string; oldRole: string; newRole: string; changedBy: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplUserRoleChanged({
    name: opts.name, oldRole: opts.oldRole, newRole: opts.newRole, changedBy: opts.changedBy,
  })
  await dispatch({
    type: 'user_role_changed',
    recipients,
    payload: {
      title:   subject,
      body:    `Your role has been changed from ${opts.oldRole} to ${opts.newRole} by ${opts.changedBy}.`,
      html,
      smsText: `Your Cooper Corp role has been updated to ${opts.newRole} by ${opts.changedBy}.`,
    },
  })
}

export async function notifyUserStatusChanged(opts: {
  recipientIds: string[]
  name: string; newStatus: string; changedBy: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplUserStatusChanged({
    name: opts.name, newStatus: opts.newStatus, changedBy: opts.changedBy,
  })
  await dispatch({
    type: 'user_status_changed',
    recipients,
    payload: {
      title:   subject,
      body:    `Your account status has been changed to ${opts.newStatus}.`,
      html,
      smsText: `Your Cooper Corp account has been ${opts.newStatus}. Contact admin for details.`,
    },
  })
}

export async function notifyUserHierarchyChanged(opts: {
  recipientIds: string[]
  name: string; changes: string[]; changedBy: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplUserHierarchyChanged({
    name: opts.name, changes: opts.changes, changedBy: opts.changedBy,
  })
  await dispatch({
    type: 'user_hierarchy_changed',
    recipients,
    payload: {
      title: subject,
      body:  `Your assignment has been updated by ${opts.changedBy}.`,
      html,
      data:  { screen: 'profile' },
    },
  })
}

export async function notifyAssetDataChanged(opts: {
  recipientIds: string[]
  gensetNumber: string
  category: 'Client Info' | 'Contact Info'
  changes: { label: string; from: unknown; to: unknown }[]
  changedBy: string; changedAt: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplAssetDataChanged(opts)
  await dispatch({
    type: opts.category === 'Client Info' ? 'asset_client_changed' : 'asset_contact_changed',
    recipients,
    payload: {
      title: subject,
      body:  `Asset ${opts.gensetNumber} ${opts.category.toLowerCase()} was updated by ${opts.changedBy}.`,
      html,
      data:  { screen: 'asset-detail', entityId: opts.gensetNumber },
    },
  })
}

export async function notifySrClosed(opts: {
  recipientIds: string[]
  srId: string; srTitle: string; category?: string; subCategory?: string
  engineerName: string; notes?: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplSrClosed(opts)
  await dispatch({
    type: 'sr_closed',
    recipients,
    payload: {
      title: subject,
      body:  `SR #${opts.srId} has been closed by ${opts.engineerName}.`,
      html,
      data:  { screen: 'my-tasks', entityId: opts.srId },
    },
  })
}

export async function notifySrOverdue(opts: {
  recipientIds: string[]
  srId: string; srTitle: string; dueDate: string; daysOverdue: number
  assetGenset: string; engineerName: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplSrOverdue({
    ...opts, deepLink: `${process.env.APP_URL}/service/${opts.srId}`,
  })
  await dispatch({
    type: 'sr_overdue',
    recipients,
    payload: {
      title:      subject,
      body:       `SR #${opts.srId} is overdue by ${opts.daysOverdue} day(s). Due: ${opts.dueDate}.`,
      html,
      data:       { screen: 'my-tasks', entityId: opts.srId },
      smsText:    `SR #${opts.srId} is overdue since ${opts.dueDate}. Please update status immediately.`,
      templateId: 'sr_overdue',
      templateParams: [opts.srId, opts.dueDate],
    },
  })
}

export async function notifyCommissioningCompleted(opts: {
  recipientIds: string[]
  gensetNumber: string; clientName: string; engineerName: string; completedAt: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplCommissioningCompleted(opts)
  await dispatch({
    type: 'commissioning_completed',
    recipients,
    payload: {
      title: subject,
      body:  `Commissioning for ${opts.gensetNumber} completed by ${opts.engineerName}.`,
      html,
      data:  { screen: 'commissioning', entityId: opts.gensetNumber },
      templateId: 'commissioning_assigned',
      templateParams: [opts.gensetNumber, opts.clientName],
    },
  })
}

export async function notifyCommissioningApproved(opts: {
  recipientIds: string[]
  gensetNumber: string; approverName: string; approvedAt: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const { subject, html } = tpl.tplCommissioningApproved(opts)
  await dispatch({
    type: 'commissioning_approved',
    recipients,
    payload: {
      title: subject,
      body:  `Commissioning for ${opts.gensetNumber} approved by ${opts.approverName}.`,
      html,
      data:  { screen: 'commissioning', entityId: opts.gensetNumber },
      templateId: 'commissioning_approved',
      templateParams: [opts.gensetNumber, opts.approverName],
    },
  })
}

export async function notifyCommissioningAssigned(opts: {
  recipientIds: string[]
  entryId: string; gensetNumber: string; clientName: string
  assignerName: string; assigneeName: string; entryType: string; dueDate?: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const deepLink = `${process.env.APP_URL ?? 'https://app.coopercorp.in'}/commissioning/${opts.entryId}`
  const { subject, html } = tpl.tplCommissioningAssigned({ ...opts, deepLink })
  await dispatch({
    type: 'commissioning_assigned',
    recipients,
    payload: {
      title:          subject,
      body:           `New ${opts.entryType} job assigned — ${opts.gensetNumber} at ${opts.clientName}.`,
      html,
      data:           { screen: 'commissioning', entityId: opts.entryId },
      templateId:     'commissioning_assigned',
      templateParams: [opts.assigneeName, opts.entryType, opts.gensetNumber, opts.clientName],
    },
  })
}

export async function notifyCommissioningReassigned(opts: {
  recipientIds: string[]
  entryId: string; gensetNumber: string; clientName: string
  reassignerName: string; fromName: string; assigneeName: string; entryType: string
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const deepLink = `${process.env.APP_URL ?? 'https://app.coopercorp.in'}/commissioning/${opts.entryId}`
  const { subject, html } = tpl.tplCommissioningReassigned({ ...opts, deepLink })
  await dispatch({
    type: 'commissioning_reassigned',
    recipients,
    payload: {
      title:          subject,
      body:           `${opts.entryType} for ${opts.gensetNumber} reassigned to you by ${opts.reassignerName}.`,
      html,
      data:           { screen: 'commissioning', entityId: opts.entryId },
      templateId:     'commissioning_reassigned',
      templateParams: [opts.assigneeName, opts.entryType, opts.gensetNumber, opts.reassignerName, opts.fromName],
    },
  })
}

export async function notifySrAssigned(opts: {
  recipientIds: string[]
  srId: string; srTitle: string; clientName: string; address: string
  eventType?: NotificationEventType
}): Promise<void> {
  const recipients = await resolveRecipients(opts.recipientIds)
  const type = opts.eventType ?? 'sr_assigned'
  await dispatch({
    type,
    recipients,
    payload: {
      title:      `New SR Assigned: ${opts.srTitle}`,
      body:       `Service request assigned at ${opts.clientName}, ${opts.address}.`,
      data:       { screen: 'my-tasks', entityId: opts.srId },
      smsText:    undefined,
      templateId: 'sr_assigned',
      templateParams: [opts.srTitle, opts.clientName, opts.address],
    },
  })
}
