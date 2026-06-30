import nodemailer from 'nodemailer'

export async function sendResetEmail(to: string, resetUrl: string): Promise<void> {
  const config = useRuntimeConfig()
  const smtpUrl = config.smtpUrl

  const subject = 'Reset your Notebook++ password'
  const text =
    `Someone requested a password reset for your Notebook++ account.\n\n` +
    `Reset it here (valid for 1 hour):\n${resetUrl}\n\n` +
    `If this wasn't you, you can safely ignore this email.`

  // Dev fallback: no SMTP configured -> log the link to the server console.
  if (!smtpUrl) {
    console.info(`\n[notebookpp] Password reset link (SMTP not configured):\n${resetUrl}\n`)
    return
  }

  const transport = nodemailer.createTransport(smtpUrl)
  await transport.sendMail({
    from: process.env.SMTP_FROM || 'Notebook++ <no-reply@notebookpp.local>',
    to,
    subject,
    text,
  })
}
