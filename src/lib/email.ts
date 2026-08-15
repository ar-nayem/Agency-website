import nodemailer from 'nodemailer'
import { prisma } from './prisma'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'nobiun@163.com',
    pass: process.env.EMAIL_PASS || '',
  },
})

const emailConfigured = !!process.env.EMAIL_PASS && process.env.EMAIL_PASS !== 'your_163_email_password_here'

// Always-on developer inbox — kept separate from the admin opt-in list below,
// since the developer should never be removable via the dashboard toggle.
const DEVELOPER_EMAIL = process.env.DEVELOPER_ALERT_EMAIL || '15329802848@163.com'

// organizationId scopes who hears about an event — a new student submission
// or status change at org B must never email org A's people. Pass null only
// for genuinely platform-level events with no specific org (falls back to
// the developer inbox alone).
async function getAlertRecipients(organizationId: string | null): Promise<string[]> {
  if (!organizationId) return [DEVELOPER_EMAIL]
  const recipients = new Set<string>()
  try {
    const owner = await prisma.user.findFirst({
      where: { role: 'OWNER', organizationId },
      select: { email: true },
    })
    if (owner) recipients.add(owner.email)
    const optedIn = await prisma.user.findMany({
      where: { receiveAlerts: true, isActive: true, organizationId },
      select: { email: true },
    })
    optedIn.forEach((u) => recipients.add(u.email))
  } catch (error) {
    console.error('Failed to load alert recipients:', error)
  }
  // Always fall back to the developer inbox if an org somehow has no owner
  // yet — better than silently dropping the notification.
  if (recipients.size === 0) recipients.add(DEVELOPER_EMAIL)
  return Array.from(recipients)
}

export async function sendNotification(subject: string, html: string, organizationId: string | null) {
  if (!emailConfigured) {
    // No real SMTP credentials set (e.g. local dev) — skip instead of failing login on every request.
    return
  }
  try {
    const to = await getAlertRecipients(organizationId)
    await transporter.sendMail({
      from: `"Student Portal" <${process.env.EMAIL_USER || 'nobiun@163.com'}>`,
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('Email send failed:', error)
  }
}

// Unlike sendNotification (fixed owner inbox), this sends to an arbitrary
// recipient — used for account-holder-facing mail like password resets.
export async function sendMail(to: string, subject: string, html: string) {
  if (!emailConfigured) return
  try {
    await transporter.sendMail({
      // All orgs currently send through this one shared mailbox (no
      // per-org SMTP yet), so the display name has to stay neutral rather
      // than naming any one tenant.
      from: `"Student Portal" <${process.env.EMAIL_USER || 'nobiun@163.com'}>`,
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('Email send failed:', error)
  }
}

export function passwordResetTemplate(name: string, code: string) {
  return `
    <h2>Reset your password</h2>
    <p>Hi ${name},</p>
    <p>Your password reset code is:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</p>
    <p>Enter this code on the reset page to choose a new password. It expires in 15 minutes.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `
}

export function emailChangeVerificationTemplate(name: string, code: string) {
  return `
    <h2>Confirm your new email address</h2>
    <p>Hi ${name},</p>
    <p>Your verification code is:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</p>
    <p>Enter this code on the portal to confirm this is your new login email. It expires in 15 minutes.</p>
    <p>If you didn't request this, you can safely ignore this email — your account email won't change.</p>
  `
}

export function taskAssignedTemplate(adminName: string, taskTitle: string, dueAt: Date, description: string | null, assignedByName: string) {
  return `
    <h2>New task assigned to you</h2>
    <p>Hi ${adminName},</p>
    <p><strong>${taskTitle}</strong></p>
    ${description ? `<p>${description}</p>` : ''}
    <p><strong>Due:</strong> ${dueAt.toLocaleString()}</p>
    <p><strong>Assigned by:</strong> ${assignedByName}</p>
    <p>Log in to the portal's Tasks page to mark it complete once done.</p>
  `
}

export function taskCompletedTemplate(adminName: string, taskTitle: string, completedAt: Date) {
  return `
    <h2>Task completed</h2>
    <p><strong>${adminName}</strong> marked the following task complete:</p>
    <p><strong>${taskTitle}</strong></p>
    <p><strong>Completed:</strong> ${completedAt.toLocaleString()}</p>
  `
}

export function taskOverdueTemplate(adminName: string, taskTitle: string, dueAt: Date) {
  return `
    <h2>Task not completed</h2>
    <p>The deadline passed and <strong>${adminName}</strong> has not marked this task complete:</p>
    <p><strong>${taskTitle}</strong></p>
    <p><strong>Was due:</strong> ${dueAt.toLocaleString()}</p>
  `
}

export function agentSignupTemplate(name: string, email: string) {
  return `
    <h2>New Agent Signup</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p>This account is inactive until approved. Log in to the Agents page to activate it.</p>
  `
}

export function studentSubmissionTemplate(agentName: string, studentName: string) {
  return `
    <h2>New Student Submission</h2>
    <p><strong>Agent:</strong> ${agentName}</p>
    <p><strong>Student:</strong> ${studentName}</p>
    <p>Please log in to the admin dashboard to review this submission.</p>
  `
}

export function statusUpdateTemplate(studentName: string, status: string, adminName: string) {
  return `
    <h2>Student Status Updated</h2>
    <p><strong>Student:</strong> ${studentName}</p>
    <p><strong>Status:</strong> ${status}</p>
    <p><strong>Updated by:</strong> ${adminName}</p>
  `
}
