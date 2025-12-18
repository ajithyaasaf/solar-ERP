import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  async sendPasswordResetEmail(email: string, resetLink: string, displayName: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: email,
        subject: 'Set Your Password - Employee Portal',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to the Team!</h1>
                </div>
                <div class="content">
                  <p>Hi ${displayName},</p>
                  <p>Your employee account has been created. To access the employee portal, you need to set your password first.</p>
                  <p>Click the button below to create your password:</p>
                  <p style="text-align: center;">
                    <a href="${resetLink}" class="button">Set My Password</a>
                  </p>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-size: 14px;">${resetLink}</p>
                  <p><strong>Note:</strong> This link will expire in 1 hour for security purposes.</p>
                  <p>If you didn't request this account, please ignore this email.</p>
                </div>
                <div class="footer">
                  <p>This is an automated email. Please do not reply.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error('Resend error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log('Password reset email sent successfully:', data);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
