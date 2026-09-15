// ─── Email HTML Templates ─────────────────────────────────────────────────────
// Each export is a function returning { subject, html } for a specific event.
// Uses inline CSS only — no external dependencies needed.

const APP_NAME  = 'Cooper Corp'
const BRAND_CLR = '#1E1951'
const ACCENT    = '#E76124'
const APP_URL   = process.env.APP_URL ?? 'https://app.coopercorp.in'

// ── Shared layout wrapper ─────────────────────────────────────────────────────
function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr><td style="background:${BRAND_CLR};padding:24px 32px;">
    <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">${APP_NAME}</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px;">${content}</td></tr>
  <!-- Footer -->
  <tr><td style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eeeeee;">
    <p style="margin:0;font-size:12px;color:#999999;">This is an automated message from ${APP_NAME}. Please do not reply to this email.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function h2(text: string) {
  return `<h2 style="margin:0 0 16px;color:${BRAND_CLR};font-size:20px;">${text}</h2>`
}

function p(text: string) {
  return `<p style="margin:0 0 12px;color:#444444;font-size:14px;line-height:1.6;">${text}</p>`
}

function badge(text: string, color = ACCENT) {
  return `<span style="display:inline-block;padding:4px 10px;border-radius:20px;background:${color};color:#fff;font-size:12px;font-weight:bold;">${text}</span>`
}

function button(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:${ACCENT};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">${label}</a>`
}

function diffTable(changes: { label: string; from: unknown; to: unknown }[]) {
  const rows = changes.map(c => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666;font-weight:600;white-space:nowrap;">${c.label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#cc3333;text-decoration:line-through;">${String(c.from ?? '—')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#2a7a2a;font-weight:600;">${String(c.to ?? '—')}</td>
    </tr>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:8px;overflow:hidden;margin:16px 0;">
    <tr style="background:#f7f7f7;">
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">FIELD</th>
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">FROM</th>
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">TO</th>
    </tr>${rows}
  </table>`
}

function infoBlock(rows: [string, string][]) {
  const cells = rows.map(([label, value]) => `
    <tr>
      <td style="padding:6px 12px;font-size:12px;color:#888;font-weight:600;white-space:nowrap;">${label}</td>
      <td style="padding:6px 12px;font-size:13px;color:#333;font-weight:600;">${value}</td>
    </tr>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:8px;overflow:hidden;margin:16px 0;background:#fafafa;">${cells}</table>`
}

// ─── Template functions ───────────────────────────────────────────────────────

export function tplWelcome(opts: {
  name: string; username: string; tempPassword: string
}) {
  const body = layout('Welcome to Cooper Corp', `
    ${h2('Welcome to Cooper Corp!')}
    ${p(`Hi ${opts.name}, your account has been created.`)}
    ${infoBlock([
      ['Username',         opts.username],
      ['Temp Password',    opts.tempPassword],
    ])}
    ${p('Please log in and change your password immediately.')}
    ${button('Login Now', APP_URL)}
  `)
  return { subject: `Welcome to ${APP_NAME} — Your account is ready`, html: body }
}

export function tplPasswordReset(opts: { name: string; otp: string }) {
  const body = layout('Password Reset', `
    ${h2('Password Reset Request')}
    ${p(`Hi ${opts.name}, use the OTP below to reset your password.`)}
    <div style="text-align:center;margin:24px 0;">
      <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:${BRAND_CLR};">${opts.otp}</span>
    </div>
    ${p('This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.')}
    ${p('If you did not request this, please contact your administrator.')}
  `)
  return { subject: `${APP_NAME} — Password Reset OTP`, html: body }
}

export function tplWorkApprovalRequested(opts: {
  srId: string; srTitle: string; engineerName: string
  assetGenset: string; clientName: string; notes?: string
  deepLink: string
}) {
  const body = layout('Work Approval Requested', `
    ${h2('Work Approval Request')}
    ${p(`<strong>${opts.engineerName}</strong> has submitted a service request for your review.`)}
    ${infoBlock([
      ['SR #',     opts.srId],
      ['Title',    opts.srTitle],
      ['Asset',    opts.assetGenset],
      ['Client',   opts.clientName],
    ])}
    ${opts.notes ? p(`<em>Engineer notes: "${opts.notes}"</em>`) : ''}
    ${button('Review in App', opts.deepLink)}
  `)
  return { subject: `SR #${opts.srId} — Work Approval Requested`, html: body }
}

export function tplWorkApprovalAmApproved(opts: {
  srId: string; srTitle: string; amName: string; amNote?: string; deepLink: string
}) {
  const body = layout('SR Approved by AM', `
    ${h2('SR Approved — Awaiting Your RSM Confirmation')}
    ${p(`AM <strong>${opts.amName}</strong> has approved this service request and forwarded it to you.`)}
    ${infoBlock([
      ['SR #',    opts.srId],
      ['Title',   opts.srTitle],
      ['AM Note', opts.amNote ?? '—'],
    ])}
    ${button('Review & Confirm', opts.deepLink)}
  `)
  return { subject: `SR #${opts.srId} — Awaiting Your RSM Confirmation`, html: body }
}

export function tplWorkApprovalAmRejected(opts: {
  srId: string; srTitle: string; amName: string; rejectionNote: string
}) {
  const body = layout('SR Rejected by AM', `
    ${h2(`SR Rejected ${badge('Rejected', '#cc3333')}`)}
    ${p(`AM <strong>${opts.amName}</strong> has rejected this service request.`)}
    ${infoBlock([
      ['SR #',   opts.srId],
      ['Title',  opts.srTitle],
    ])}
    <div style="background:#fff5f5;border-left:4px solid #cc3333;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#cc3333;font-weight:600;">Rejection Reason</p>
      <p style="margin:4px 0 0;font-size:14px;color:#333;">${opts.rejectionNote}</p>
    </div>
    ${p('Please correct the issues and resubmit.')}
  `)
  return { subject: `SR #${opts.srId} — Rejected by AM`, html: body }
}

export function tplWorkApprovalRsmConfirmed(opts: {
  srId: string; srTitle: string; rsmName: string; confirmedAt: string
}) {
  const body = layout('SR Confirmed by RSM', `
    ${h2(`SR Fully Confirmed ${badge('Confirmed ✓', '#2a7a2a')}`)}
    ${p(`RSM <strong>${opts.rsmName}</strong> has confirmed this service request.`)}
    ${infoBlock([
      ['SR #',           opts.srId],
      ['Title',          opts.srTitle],
      ['Confirmed by',   opts.rsmName],
      ['Confirmed at',   opts.confirmedAt],
    ])}
    ${p('You may now proceed with billing and closure.')}
  `)
  return { subject: `SR #${opts.srId} — Fully Confirmed ✓`, html: body }
}

export function tplWorkApprovalRsmRejected(opts: {
  srId: string; srTitle: string; rsmName: string; rejectionNote: string
}) {
  const body = layout('SR Rejected by RSM', `
    ${h2(`SR Rejected by RSM ${badge('Rejected', '#cc3333')}`)}
    ${p(`RSM <strong>${opts.rsmName}</strong> has rejected this service request.`)}
    ${infoBlock([
      ['SR #',  opts.srId],
      ['Title', opts.srTitle],
    ])}
    <div style="background:#fff5f5;border-left:4px solid #cc3333;padding:12px 16px;margin:16px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#cc3333;font-weight:600;">Rejection Reason</p>
      <p style="margin:4px 0 0;font-size:14px;color:#333;">${opts.rejectionNote}</p>
    </div>
    ${p('Please correct the issues and resubmit for AM review.')}
  `)
  return { subject: `SR #${opts.srId} — Rejected by RSM`, html: body }
}

export function tplSrClosed(opts: {
  srId: string; srTitle: string; category?: string; subCategory?: string
  engineerName: string; notes?: string
}) {
  const body = layout('SR Closed', `
    ${h2('Service Request Closed')}
    ${infoBlock([
      ['SR #',       opts.srId],
      ['Title',      opts.srTitle],
      ['Category',   opts.category ?? '—'],
      ['Sub-Cat',    opts.subCategory ?? '—'],
      ['Engineer',   opts.engineerName],
    ])}
    ${opts.notes ? p(`<em>Engineer notes: "${opts.notes}"</em>`) : ''}
  `)
  return { subject: `SR #${opts.srId} — Closed`, html: body }
}

export function tplSrOverdue(opts: {
  srId: string; srTitle: string; dueDate: string; daysOverdue: number
  assetGenset: string; engineerName: string; deepLink: string
}) {
  const body = layout('SR Overdue', `
    ${h2(`Overdue SR ${badge(`${opts.daysOverdue}d overdue`, '#cc3333')}`)}
    ${p('The following service request is past its due date and requires immediate attention.')}
    ${infoBlock([
      ['SR #',       opts.srId],
      ['Title',      opts.srTitle],
      ['Asset',      opts.assetGenset],
      ['Engineer',   opts.engineerName],
      ['Due Date',   opts.dueDate],
      ['Overdue by', `${opts.daysOverdue} day${opts.daysOverdue !== 1 ? 's' : ''}`],
    ])}
    ${button('View SR', opts.deepLink)}
  `)
  return { subject: `Overdue: SR #${opts.srId} — Due ${opts.dueDate}`, html: body }
}

export function tplCommissioningCompleted(opts: {
  gensetNumber: string; clientName: string; engineerName: string; completedAt: string
}) {
  const body = layout('Commissioning Completed', `
    ${h2('Commissioning Completed')}
    ${p(`Engineer <strong>${opts.engineerName}</strong> has completed commissioning.`)}
    ${infoBlock([
      ['Genset',    opts.gensetNumber],
      ['Client',    opts.clientName],
      ['Engineer',  opts.engineerName],
      ['Completed', opts.completedAt],
    ])}
    ${p('Please review and approve in the app.')}
  `)
  return { subject: `Commissioning Complete — ${opts.gensetNumber}`, html: body }
}

export function tplCommissioningApproved(opts: {
  gensetNumber: string; approverName: string; approvedAt: string
}) {
  const body = layout('Commissioning Approved', `
    ${h2(`Commissioning Approved ${badge('Approved ✓', '#2a7a2a')}`)}
    ${infoBlock([
      ['Genset',     opts.gensetNumber],
      ['Approved by', opts.approverName],
      ['Approved at', opts.approvedAt],
    ])}
  `)
  return { subject: `Commissioning Approved — ${opts.gensetNumber}`, html: body }
}

export function tplUserRoleChanged(opts: {
  name: string; oldRole: string; newRole: string; changedBy: string
}) {
  const body = layout('Role Updated', `
    ${h2('Your Role Has Been Updated')}
    ${p(`Hi ${opts.name}, your role in ${APP_NAME} has been changed.`)}
    ${infoBlock([
      ['Previous Role', opts.oldRole],
      ['New Role',      opts.newRole],
      ['Changed by',    opts.changedBy],
    ])}
    ${p('If this is unexpected, please contact your administrator.')}
  `)
  return { subject: `${APP_NAME} — Your role has been updated`, html: body }
}

export function tplUserStatusChanged(opts: {
  name: string; newStatus: string; changedBy: string
}) {
  const body = layout('Account Status Changed', `
    ${h2('Account Status Updated')}
    ${p(`Hi ${opts.name}, your account status has been changed.`)}
    ${infoBlock([
      ['New Status', opts.newStatus.toUpperCase()],
      ['Changed by', opts.changedBy],
    ])}
    ${p('If you believe this is an error, please contact your administrator.')}
  `)
  return { subject: `${APP_NAME} — Account status changed to ${opts.newStatus}`, html: body }
}

export function tplUserHierarchyChanged(opts: {
  name: string; changes: string[]; changedBy: string
}) {
  const body = layout('Assignment Updated', `
    ${h2('Your Assignment Has Been Updated')}
    ${p(`Hi ${opts.name}, your hierarchy / assignment has changed.`)}
    <ul style="color:#444;font-size:14px;line-height:1.8;padding-left:20px;">
      ${opts.changes.map(c => `<li>${c}</li>`).join('')}
    </ul>
    ${p(`Changed by: <strong>${opts.changedBy}</strong>`)}
  `)
  return { subject: `${APP_NAME} — Your assignment has been updated`, html: body }
}

export function tplCommissioningAssigned(opts: {
  assigneeName: string; assignerName: string; gensetNumber: string
  clientName: string; entryType: string; dueDate?: string; deepLink: string
}) {
  const body = layout('New Commissioning Job Assigned', `
    ${h2('New Job Assigned')}
    ${p(`Hi <strong>${opts.assigneeName}</strong>, a new commissioning job has been assigned to you by <strong>${opts.assignerName}</strong>.`)}
    ${infoBlock([
      ['Genset',   opts.gensetNumber],
      ['Client',   opts.clientName || '—'],
      ['Job Type', opts.entryType],
      ...(opts.dueDate ? [['Due Date', opts.dueDate] as [string, string]] : []),
    ])}
    ${button('View Job', opts.deepLink)}
  `)
  return { subject: `New Job: ${opts.entryType} — ${opts.gensetNumber}`, html: body }
}

export function tplCommissioningReassigned(opts: {
  assigneeName: string; reassignerName: string; fromName: string
  gensetNumber: string; clientName: string; entryType: string; deepLink: string
}) {
  const body = layout('Commissioning Job Reassigned', `
    ${h2('Job Reassigned to You')}
    ${p(`Hi <strong>${opts.assigneeName}</strong>, a commissioning job has been reassigned to you by <strong>${opts.reassignerName}</strong>.`)}
    ${infoBlock([
      ['Genset',          opts.gensetNumber],
      ['Client',          opts.clientName || '—'],
      ['Job Type',        opts.entryType],
      ['Previous Owner',  opts.fromName],
    ])}
    ${button('View Job', opts.deepLink)}
  `)
  return { subject: `Job Reassigned: ${opts.entryType} — ${opts.gensetNumber}`, html: body }
}

export function tplAssetDataChanged(opts: {
  gensetNumber: string; category: 'Client Info' | 'Contact Info'
  changes: { label: string; from: unknown; to: unknown }[]
  changedBy: string; changedAt: string
}) {
  const body = layout(`Asset ${opts.category} Updated`, `
    ${h2(`Asset ${opts.category} Updated`)}
    ${p(`The following changes were made to asset <strong>${opts.gensetNumber}</strong>.`)}
    ${diffTable(opts.changes)}
    ${infoBlock([
      ['Changed by', opts.changedBy],
      ['Changed at', opts.changedAt],
    ])}
  `)
  return {
    subject: `Asset ${opts.gensetNumber} — ${opts.category} Updated`,
    html:    body,
  }
}
