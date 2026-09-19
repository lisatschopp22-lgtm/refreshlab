import nodemailer from "nodemailer";

const url = process.env.SMTP_URL ?? "smtp://127.0.0.1:54325";
const from = process.env.MAIL_FROM ?? "refreshLab <noreply@refreshlab.local>";

export type Mail = { to: string; subject: string; text: string; html?: string };

export interface Mailer {
  readonly name: string;
  send(mail: Mail): Promise<void>;
}

/** Local Mailpit. Everything the prototype sends is visible on port 54324. */
class SmtpMailer implements Mailer {
  readonly name = "smtp";
  private transport = nodemailer.createTransport(url);

  async send(mail: Mail) {
    await this.transport.sendMail({ from, ...mail });
  }
}

class ConsoleMailer implements Mailer {
  readonly name = "console";
  async send(mail: Mail) {
    console.log(`[mail] → ${mail.to}: ${mail.subject}`);
  }
}

export function mailer(): Mailer {
  return process.env.SMTP_URL === "off" ? new ConsoleMailer() : new SmtpMailer();
}

/**
 * Email clients cannot resolve CSS custom properties, so this template is the
 * one place with literal colours. They are deliberately neutral: the brand
 * colour is still an open question and must not be baked in here.
 */
const EMAIL = { ink: "#1a1c1f", muted: "#777777", button: "#1a1c1f", buttonText: "#ffffff" };

export function layout(title: string, body: string, actionUrl?: string, actionLabel?: string) {
  const text = `${title}\n\n${body}${actionUrl ? `\n\n${actionLabel}: ${actionUrl}` : ""}\n\n—\nrefreshLab (lokaler Prototyp)`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6;color:${EMAIL.ink}">
  <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
  <p style="margin:0 0 16px;white-space:pre-wrap">${body}</p>
  ${actionUrl ? `<p><a href="${actionUrl}" style="display:inline-block;padding:10px 16px;background:${EMAIL.button};color:${EMAIL.buttonText};border-radius:6px;text-decoration:none">${actionLabel}</a></p>` : ""}
  <p style="color:${EMAIL.muted};font-size:12px;margin-top:24px">refreshLab — lokaler Prototyp</p>
</div>`;
  return { text, html };
}
