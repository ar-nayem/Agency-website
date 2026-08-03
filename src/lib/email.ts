import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.163.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'nobiun@163.com',
    pass: process.env.EMAIL_PASS || '',
  },
})

const emailConfigured = !!process.env.EMAIL_PASS && process.env.EMAIL_PASS !== 'your_163_email_password_here'

export async function sendNotification(subject: string, html: string) {
  if (!emailConfigured) {
    // No real SMTP credentials set (e.g. local dev) — skip instead of failing login on every request.
    return
  }
  try {
    await transporter.sendMail({
      from: `"Student Portal" <${process.env.EMAIL_USER || 'nobiun@163.com'}>`,
      to: 'nobiun@163.com',
      subject,
      html,
    })
  } catch (error) {
    console.error('Email send failed:', error)
  }
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
