import { db } from './db';

export interface EmailOptions {
  to: string;
  subject: string;
  template: 'verification' | 'password_reset' | 'otp' | 'class_reminder' | 'exam_reminder' | 'exam_result' | 'security_alert';
  data: Record<string, any>;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<boolean>;
}

class ConsoleAndLogEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<boolean> {
    const html = renderRemlyEmailTemplate(options.template, options.data);
    console.log(`\n📧 [EmailService] Sending "${options.subject}" to <${options.to}>`);
    console.log(`----------------------------------------------------------------`);
    if (options.data.otp) {
      console.log(`🔐 OTP Code: ${options.data.otp}`);
    }
    console.log(`----------------------------------------------------------------\n`);

    // Log to emailEvents collection
    await db.emailEvents.insertOne({
      to: options.to,
      subject: options.subject,
      template: options.template,
      data: options.data,
      sentAt: new Date().toISOString(),
      status: 'delivered',
      previewSnippet: options.data.otp ? `OTP: ${options.data.otp}` : options.subject,
    });

    return true;
  }
}

let activeEmailProvider: EmailProvider = new ConsoleAndLogEmailProvider();

export function setEmailProvider(provider: EmailProvider) {
  activeEmailProvider = provider;
}

export async function sendRemlyEmail(options: EmailOptions): Promise<boolean> {
  try {
    return await activeEmailProvider.sendEmail(options);
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err);
    return false;
  }
}

export function renderRemlyEmailTemplate(
  template: EmailOptions['template'],
  data: Record<string, any>
): string {
  const brandHeader = `
    <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 2px; font-size: 24px;">REMLY</h1>
      <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Adaptive Learning & Creator Intelligence</p>
    </div>
  `;

  const brandFooter = `
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0; font-family: sans-serif; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">Sent securely by Remly Education Platform.</p>
      <p style="margin: 4px 0 0 0;">Need assistance? Visit support.remly.edu</p>
    </div>
  `;

  let bodyContent = '';

  switch (template) {
    case 'verification':
      bodyContent = `
        <h2 style="color: #1e293b; margin-top: 0;">Verify Your Remly Account</h2>
        <p style="color: #475569; line-height: 1.6;">Hello ${data.name || 'there'},</p>
        <p style="color: #475569; line-height: 1.6;">Welcome to Remly! To activate your ${data.role || 'student'} profile and unlock AI-powered mentoring, please use the verification code below:</p>
        <div style="background-color: #f1f5f9; padding: 18px; text-align: center; border-radius: 6px; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0284c7; font-family: monospace;">${data.otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This code will expire in 15 minutes. If you did not create a Remly account, please disregard this email.</p>
      `;
      break;

    case 'password_reset':
    case 'otp':
      bodyContent = `
        <h2 style="color: #1e293b; margin-top: 0;">One-Time Password (OTP)</h2>
        <p style="color: #475569; line-height: 1.6;">Hello ${data.name || 'Student'},</p>
        <p style="color: #475569; line-height: 1.6;">We received a request to reset your password or verify sensitive actions on your Remly account.</p>
        <div style="background-color: #f1f5f9; padding: 18px; text-align: center; border-radius: 6px; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0284c7; font-family: monospace;">${data.otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This OTP is valid for 10 minutes. Never share this code with anyone.</p>
      `;
      break;

    case 'class_reminder':
      bodyContent = `
        <h2 style="color: #1e293b; margin-top: 0;">Class Reminder: ${data.subject}</h2>
        <p style="color: #475569; line-height: 1.6;">Hi ${data.name},</p>
        <p style="color: #475569; line-height: 1.6;">Your upcoming class on <strong>"${data.topic}"</strong> is scheduled to start soon!</p>
        <div style="border-left: 4px solid #0284c7; padding-left: 16px; margin: 20px 0;">
          <p style="margin: 4px 0; color: #1e293b;"><strong>Subject:</strong> ${data.subject}</p>
          <p style="margin: 4px 0; color: #1e293b;"><strong>Session Goal:</strong> ${data.learningGoal || 'Deep concept mastery'}</p>
          <p style="margin: 4px 0; color: #1e293b;"><strong>Scheduled Time:</strong> ${data.time}</p>
        </div>
        <p style="color: #475569; line-height: 1.6;">Your AI Tutor is prepared with customized practice exercises. Log in to Remly now to join.</p>
      `;
      break;

    case 'exam_result':
      bodyContent = `
        <h2 style="color: #1e293b; margin-top: 0;">Exam Results Published: ${data.examTitle}</h2>
        <p style="color: #475569; line-height: 1.6;">Congratulations on completing your assessment, ${data.name}!</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <div style="font-size: 24px; font-weight: bold; color: ${data.passed ? '#16a34a' : '#dc2626'};">
            ${data.passed ? 'PASSED ✅' : 'NEEDS IMPROVEMENT ⚠️'} — Score: ${data.score}%
          </div>
          <p style="margin: 8px 0 0 0; color: #475569;">XP Earned: +${data.xpEarned || 100} XP</p>
        </div>
        <p style="color: #475569; line-height: 1.6;">Your AI Tutor has analyzed your answers and generated recommended review topics.</p>
      `;
      break;

    default:
      bodyContent = `
        <h2 style="color: #1e293b;">Remly Account Notification</h2>
        <p style="color: #475569;">${data.message || 'You have a new update on Remly.'}</p>
      `;
  }

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      ${brandHeader}
      <div style="padding: 32px 24px;">
        ${bodyContent}
      </div>
      ${brandFooter}
    </div>
  `;
}
