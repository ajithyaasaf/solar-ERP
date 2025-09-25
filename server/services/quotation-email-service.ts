/**
 * Quotation Email Service
 * Handles sending quotations to customers via email
 */

interface EmailResult {
  emailId: string;
  recipientEmail: string;
  sentAt: Date;
  status: 'sent' | 'failed';
}

interface EmailOptions {
  recipientEmail?: string;
  subject?: string;
  message?: string;
  attachPDF?: boolean;
}

export class QuotationEmailService {
  
  /**
   * Send quotation to customer via email
   */
  static async sendQuotationToCustomer(quotation: any, emailOptions: EmailOptions = {}): Promise<EmailResult> {
    try {
      // Validate required quotation data
      if (!quotation.customerName || !quotation.pricing) {
        throw new Error('Quotation missing required customer or pricing data');
      }

      // Extract and validate customer email
      const recipientEmail = emailOptions.recipientEmail || 
                           quotation.customerEmail;
                           
      if (!recipientEmail) {
        throw new Error('No recipient email address provided or found in quotation');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        throw new Error('Invalid email address format');
      }

      // Generate email content
      const emailContent = this.generateEmailContent(quotation, emailOptions);
      
      // Check if email service is properly configured
      const emailServiceConfigured = process.env.EMAIL_SERVICE_CONFIGURED === 'true';
      
      if (!emailServiceConfigured) {
        console.warn('Email service not configured. Cannot send actual emails.');
        return {
          emailId: 'no-service-configured',
          recipientEmail,
          sentAt: new Date(),
          status: 'failed'
        };
      }
      
      console.log('Attempting to send quotation email:', {
        to: recipientEmail,
        subject: emailContent.subject,
        quotationId: quotation.id
      });
      
      // TODO: Replace with actual email service implementation
      // Example with NodeMailer:
      /*
      import nodemailer from 'nodemailer';
      
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      
      const mailOptions = {
        from: process.env.FROM_EMAIL,
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        attachments: emailOptions.attachPDF ? [
          {
            filename: `${quotation.id}-quotation.pdf`,
            path: quotation.generatedPDFUrl
          }
        ] : []
      };
      
      const result = await transporter.sendMail(mailOptions);
      return {
        emailId: result.messageId,
        recipientEmail,
        sentAt: new Date(),
        status: 'sent'
      };
      */
      
      // Simulate email sending for demo purposes
      const emailResult = await this.simulateEmailSending(recipientEmail, emailContent);
      
      return emailResult;
      
    } catch (error) {
      console.error('Error sending quotation email:', error);
      return {
        emailId: 'error',
        recipientEmail: emailOptions.recipientEmail || 'unknown',
        sentAt: new Date(),
        status: 'failed'
      };
    }
  }

  /**
   * Generate email content for quotation
   */
  private static generateEmailContent(quotation: any, options: EmailOptions) {
    const subject = options.subject || 
                   `Solar System Quotation - ${quotation.systemCapacity} ${quotation.projectType.replace('_', ' ')} System`;
    
    const emailBody = options.message || `
Dear ${quotation.customerName},

Thank you for your interest in solar energy solutions from Prakash Green Energy.

We are pleased to provide you with a detailed quotation for your ${quotation.systemCapacity} ${quotation.projectType.replace('_', ' ')} solar system.

Quotation Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 Property Type: ${quotation.propertyType}
⚡ System Capacity: ${quotation.systemCapacity}
💰 Total System Cost: ₹${(quotation.pricing?.totalSystemCost || 0).toLocaleString()}
${quotation.pricing?.subsidyAmount ? 
  `🎁 Government Subsidy: ₹${quotation.pricing.subsidyAmount.toLocaleString()}` : ''}
💳 Your Investment: ₹${(quotation.pricing?.customerPayment || quotation.pricing?.totalSystemCost || 0).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key Benefits:
✅ 25-year warranty on solar panels
✅ 5-year comprehensive warranty on inverter
✅ Complete installation and commissioning
✅ Net metering setup assistance
✅ Annual maintenance support
✅ Government subsidy processing assistance

Payment Terms:
• 90% advance payment with purchase order
• 10% balance payment after installation completion
• Easy EMI options available

Next Steps:
1. Review the attached detailed quotation
2. Contact us for any clarifications
3. Confirm your order to proceed with installation

Our team is ready to answer any questions you may have. We look forward to helping you transition to clean, renewable solar energy!

Best regards,
Prakash Green Energy Team

📞 Contact: +91-XXXXXXXXXX
✉️ Email: info@prakashgreenenergy.com
🌐 Website: www.prakashgreenenergy.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This quotation is valid for 30 days from the date of issue.
For immediate assistance, please call us at the number mentioned above.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    return {
      subject,
      body: emailBody,
      html: this.generateHTMLEmailTemplate(quotation, emailBody)
    };
  }

  /**
   * Generate HTML email template
   */
  private static generateHTMLEmailTemplate(quotation: any, textContent: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solar System Quotation</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .email-container {
            background-color: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
            margin-bottom: 30px;
        }
        .company-name {
            color: #2563eb;
            font-size: 28px;
            font-weight: bold;
            margin: 0;
        }
        .tagline {
            color: #6b7280;
            font-size: 14px;
            margin: 5px 0 0 0;
        }
        .quotation-summary {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white;
            padding: 25px;
            border-radius: 10px;
            margin: 25px 0;
        }
        .quotation-summary h3 {
            margin: 0 0 15px 0;
            font-size: 20px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }
        .summary-item {
            background-color: rgba(255,255,255,0.1);
            padding: 10px;
            border-radius: 6px;
        }
        .summary-item strong {
            display: block;
            font-size: 18px;
            margin-bottom: 5px;
        }
        .benefits-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .benefit-item {
            background-color: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
        }
        .benefit-item .icon {
            color: #2563eb;
            font-size: 16px;
            margin-right: 8px;
        }
        .next-steps {
            background-color: #ecfdf5;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
            margin: 25px 0;
        }
        .next-steps h4 {
            color: #065f46;
            margin-top: 0;
        }
        .next-steps ol {
            color: #047857;
            padding-left: 20px;
        }
        .contact-info {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-top: 30px;
        }
        .contact-info a {
            color: #2563eb;
            text-decoration: none;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
        }
        @media (max-width: 600px) {
            .summary-grid, .benefits-grid {
                grid-template-columns: 1fr;
            }
            .email-container {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1 class="company-name">PRAKASH GREEN ENERGY</h1>
            <p class="tagline">Complete Solar Solution Provider</p>
        </div>
        
        <p>Dear <strong>${quotation.customerName}</strong>,</p>
        
        <p>Thank you for your interest in solar energy solutions. We are pleased to provide you with a detailed quotation for your solar system.</p>
        
        <div class="quotation-summary">
            <h3>📋 Quotation Summary</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <strong>System Type</strong>
                    <span>${quotation.projectType.replace('_', ' ')} Solar System</span>
                </div>
                <div class="summary-item">
                    <strong>Capacity</strong>
                    <span>${quotation.systemCapacity}</span>
                </div>
                <div class="summary-item">
                    <strong>Total Cost</strong>
                    <span>₹${(quotation.pricing?.totalSystemCost || 0).toLocaleString()}</span>
                </div>
                <div class="summary-item">
                    <strong>Your Investment</strong>
                    <span>₹${(quotation.pricing?.customerPayment || quotation.pricing?.totalSystemCost || 0).toLocaleString()}</span>
                </div>
            </div>
            ${quotation.pricing?.subsidyAmount ? 
              `<p style="margin-top: 15px; text-align: center; font-size: 16px;">
                🎁 Government Subsidy: <strong>₹${quotation.pricing.subsidyAmount.toLocaleString()}</strong> will be credited to your account
               </p>` : ''}
        </div>
        
        <h4>🌟 Key Benefits</h4>
        <div class="benefits-grid">
            <div class="benefit-item">
                <span class="icon">🛡️</span>
                <strong>25-Year Warranty</strong> on solar panels
            </div>
            <div class="benefit-item">
                <span class="icon">⚡</span>
                <strong>5-Year Warranty</strong> on inverter
            </div>
            <div class="benefit-item">
                <span class="icon">🔧</span>
                <strong>Complete Installation</strong> & commissioning
            </div>
            <div class="benefit-item">
                <span class="icon">📋</span>
                <strong>Net Metering</strong> setup assistance
            </div>
            <div class="benefit-item">
                <span class="icon">🔄</span>
                <strong>Annual Maintenance</strong> support
            </div>
            <div class="benefit-item">
                <span class="icon">💰</span>
                <strong>Subsidy Processing</strong> assistance
            </div>
        </div>
        
        <div class="next-steps">
            <h4>🚀 Next Steps</h4>
            <ol>
                <li>Review the attached detailed quotation document</li>
                <li>Contact us for any questions or clarifications</li>
                <li>Confirm your order to proceed with installation</li>
            </ol>
        </div>
        
        <p><strong>Payment Terms:</strong></p>
        <ul>
            <li>90% advance payment with purchase order</li>
            <li>10% balance payment after installation completion</li>
            <li>Easy EMI options available</li>
        </ul>
        
        <div class="contact-info">
            <h4 style="margin-top: 0;">📞 Contact Information</h4>
            <p>
                <strong>Phone:</strong> +91-XXXXXXXXXX<br>
                <strong>Email:</strong> <a href="mailto:info@prakashgreenenergy.com">info@prakashgreenenergy.com</a><br>
                <strong>Website:</strong> <a href="http://www.prakashgreenenergy.com">www.prakashgreenenergy.com</a>
            </p>
        </div>
        
        <p>Our team is ready to answer any questions you may have. We look forward to helping you transition to clean, renewable solar energy!</p>
        
        <p><strong>Best regards,</strong><br>
        The Prakash Green Energy Team</p>
        
        <div class="footer">
            <p>This quotation is valid for 30 days from the date of issue.</p>
            <p>For immediate assistance, please call us at the number mentioned above.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Simulate email sending service (replace with real email service in production)
   */
  private static async simulateEmailSending(recipientEmail: string, emailContent: any): Promise<EmailResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate occasional failures for testing
    const shouldFail = Math.random() < 0.05; // 5% failure rate
    
    if (shouldFail) {
      console.error('📧 Simulated email sending failure');
      return {
        emailId: 'failed',
        recipientEmail,
        sentAt: new Date(),
        status: 'failed'
      };
    }
    
    // Simulate successful email sending
    const emailId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📧 Email simulation completed successfully:', {
      emailId,
      to: recipientEmail,
      subject: emailContent.subject,
      timestamp: new Date().toISOString(),
      note: 'This is a simulated email - configure actual email service for production'
    });
    
    return {
      emailId,
      recipientEmail,
      sentAt: new Date(),
      status: 'sent'
    };
  }
}