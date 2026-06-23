import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP2GO_HOST,
  port: Number(process.env.SMTP2GO_PORT) || 2525,
  secure: process.env.SMTP2GO_SECURE === 'true',
  auth: {
    user: process.env.SMTP2GO_USER,
    pass: process.env.SMTP2GO_PASS,
  },
});
