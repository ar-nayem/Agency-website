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

async function getAlertRecipients(): Promise<string[]> {
  const recipients = new Set([DEVELOPER_EMAIL])
  try {
    const optedIn = await prisma.user.findMany({
      where: { receiveAlerts: true, isActive: true },
      select: { email: true },
    })
    optedIn.forEach((u) => recipients.add(u.email))
  } catch (error) {
    console.error('Failed to load alert recipients, falling back to developer inbox:', error)
  }
  return Array.from(recipients)
}

export async function sendNotification(subject: string, html: string) {
  if (!emailConfigured) {
    // No real SMTP credentials set (e.g. local dev) — skip instead of failing login on every request.
    return
  }
  try {
    const to = await getAlertRecipients()
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
      from: `"Chengdu Dream Fly Edu" <${process.env.EMAIL_USER || 'nobiun@163.com'}>`,
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
