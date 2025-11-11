import nodemailer from "nodemailer"

const smtpHost = process.env.SMTP_HOST
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpFrom = process.env.SMTP_FROM ?? "AccezzPay <no-reply@accezzpay.com>"

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  if (!smtpHost || !smtpPort) {
    console.warn("SMTP configuration missing; emails will be logged instead of sent.")
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    })
    return transporter
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  })
  return transporter
}

export type SendEmailParams = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: nodemailer.Attachment[]
}

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailParams) {
  const mailer = getTransporter()
  const info = await mailer.sendMail({
    from: smtpFrom,
    to,
    subject,
    html,
    text,
    attachments,
  })

  if (mailer.options.streamTransport) {
    console.info("Email preview:\n", info.message.toString())
  }

  return info
}

