import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      '"Giant BD ERP Security" <no-reply@giantbd.com>';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Boolean(secure),
        auth: { user, pass },
      });
      this.logger.log(`SMTP Mail Transport configured with host: ${host}:${port}`);
    } else {
      this.logger.warn(
        'SMTP credentials not fully configured in .env. OTPs will be securely logged to console for development.',
      );
    }
  }

  async sendLoginOtp(toEmail: string, otp: string, userName: string = 'User') {
    const subject = `Your Giant BD Verification Code: ${otp}`;
    const html = this.getOtpHtmlTemplate(userName, otp);

    // Development / Local Console Fallback
    this.logger.log(
      `\n=======================================================\n` +
        `🔑 [2FA EMAIL OTP VERIFICATION]\n` +
        `👤 Recipient: ${userName} <${toEmail}>\n` +
        `🔢 6-Digit Code: >>> ${otp} <<<\n` +
        `⏳ Valid for: 5 Minutes\n` +
        `=======================================================\n`,
    );

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to: toEmail,
          subject,
          html,
        });
        this.logger.log(`2FA OTP email successfully sent to ${toEmail}`);
      } catch (err: any) {
        this.logger.error(
          `Failed to deliver 2FA OTP email to ${toEmail}: ${err.message}`,
        );
      }
    }
  }

  private getOtpHtmlTemplate(userName: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
          .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .subbrand { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
          .body { padding: 32px 24px; text-align: center; }
          .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
          .text { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
          .otp-card { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 18px; margin: 20px 0; }
          .otp-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563eb; margin: 0; }
          .validity { font-size: 12px; font-weight: 600; color: #e11d48; margin-top: 10px; }
          .security-note { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">Giant BD</div>
            <div class="subbrand">Enterprise ERP & WMS System</div>
          </div>
          <div class="body">
            <div class="greeting">Hello, ${userName}</div>
            <div class="text">
              We received a request to log in to your Giant BD account. Use the verification code below to complete your authentication:
            </div>
            <div class="otp-card">
              <div class="otp-code">${otp}</div>
              <div class="validity">⏳ Valid for 5 minutes (One-time use)</div>
            </div>
            <div class="security-note">
              If you did not initiate this login request, please contact your System Administrator immediately and secure your account.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Giant BD Ltd. • Footwear Manufacturing & Logistics Platform
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
