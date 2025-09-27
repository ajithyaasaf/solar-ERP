/**
 * Quotation PDF Generation Service
 * Creates professional PDF documents matching the reference format
 */

import { QuotationTemplate, QuotationTemplateService } from "./quotation-template-service";
import { Quotation, QuotationProject } from "@shared/schema";

export interface PDFGenerationOptions {
  format: 'A4';
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  printBackground: boolean;
  displayHeaderFooter: boolean;
}

export class QuotationPDFService {
  private static readonly DEFAULT_OPTIONS: PDFGenerationOptions = {
    format: 'A4',
    margin: {
      top: '1cm',
      right: '1cm', 
      bottom: '1cm',
      left: '1cm'
    },
    printBackground: true,
    displayHeaderFooter: false
  };

  /**
   * Generate HTML content for quotation PDF
   */
  static generateHTMLContent(template: QuotationTemplate): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Quotation ${template.quotationNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          border-bottom: 2px solid #0066cc;
          padding-bottom: 15px;
        }
        
        .company-info {
          flex: 1;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #0066cc;
          margin-bottom: 5px;
        }
        
        .tagline {
          font-style: italic;
          color: #666;
          margin-bottom: 10px;
        }
        
        .contact-details {
          font-size: 10px;
          line-height: 1.3;
        }
        
        .quotation-meta {
          text-align: right;
          min-width: 200px;
        }
        
        .quotation-meta table {
          border-collapse: collapse;
          width: 100%;
        }
        
        .quotation-meta td {
          padding: 3px 8px;
          border: 1px solid #ccc;
          font-size: 11px;
        }
        
        .quotation-meta td:first-child {
          font-weight: bold;
          background: #f5f5f5;
        }
        
        .customer-section {
          display: flex;
          justify-content: space-between;
          margin: 20px 0;
        }
        
        .customer-details, .contact-info {
          flex: 1;
        }
        
        .section-title {
          font-weight: bold;
          margin-bottom: 10px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
        }
        
        .reference {
          background: #f0f8ff;
          padding: 10px;
          margin: 15px 0;
          border-left: 4px solid #0066cc;
        }
        
        .pricing-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .pricing-table th,
        .pricing-table td {
          border: 1px solid #333;
          padding: 8px;
          text-align: center;
        }
        
        .pricing-table th {
          background: #0066cc;
          color: white;
          font-weight: bold;
        }
        
        .total-calculation {
          background: #fff3cd;
          padding: 15px;
          margin: 20px 0;
          border: 1px solid #ffeaa7;
          text-align: center;
        }
        
        .subsidy-note {
          background: #d4edda;
          padding: 10px;
          margin: 10px 0;
          border: 1px solid #c3e6cb;
          border-radius: 4px;
        }
        
        .bom-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .bom-table th,
        .bom-table td {
          border: 1px solid #333;
          padding: 6px;
          text-align: center;
          font-size: 10px;
        }
        
        .bom-table th {
          background: #0066cc;
          color: white;
          font-weight: bold;
        }
        
        .terms-section {
          margin: 30px 0;
          page-break-inside: avoid;
        }
        
        .terms-section h3 {
          color: #0066cc;
          border-bottom: 2px solid #0066cc;
          padding-bottom: 5px;
        }
        
        .warranty-item {
          margin: 10px 0;
        }
        
        .highlight {
          background: #ffff99;
          font-weight: bold;
        }
        
        .bank-details {
          background: #f8f9fa;
          padding: 10px;
          border: 1px solid #dee2e6;
          margin: 10px 0;
        }
        
        .scope-section {
          margin: 20px 0;
        }
        
        .scope-section ul {
          margin: 5px 0 15px 20px;
        }
        
        .documents-section {
          background: #fff3cd;
          padding: 15px;
          border: 1px solid #ffeaa7;
          margin: 20px 0;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        @media print {
          .page-break {
            page-break-before: always;
          }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="company-info">
          <div class="company-name">${template.header.name}</div>
          <div class="tagline">PROVIDING PERFECT SOLAR SOLUTIONS</div>
          <div class="tagline">GET AUTHORIZED PRODUCT VERSIONS</div>
          <div class="contact-details">
            📞 ${template.header.contact.phone.join(', ')}<br>
            📧 ${template.header.contact.email}<br>
            🌐 ${template.header.contact.website}<br>
            📍 ${template.header.contact.address}
          </div>
        </div>
        
        <div class="quotation-meta">
          <table>
            <tr><td>Quotation No:</td><td>${template.quotationNumber}</td></tr>
            <tr><td>Quotation Date:</td><td>${template.quotationDate}</td></tr>
            <tr><td>Quote Revision:</td><td>${template.quoteRevision}</td></tr>
            <tr><td>Quote Validity:</td><td>${template.quoteValidity}</td></tr>
            <tr><td>Prepared by:</td><td>${template.preparedBy}</td></tr>
          </table>
        </div>
      </div>
      
      <!-- Customer Details -->
      <div class="customer-section">
        <div class="customer-details">
          <div class="section-title">Customer Details</div>
          <strong>${template.customer.name}</strong><br>
          ${template.customer.address}<br>
          Contact Number: ${template.customer.contactNumber}
        </div>
        
        <div class="contact-info">
          <div class="section-title">Contact us at</div>
          Contact Person: Mr. Sabu Kumar<br>
          Contact Number: +91 ${template.header.contact.phone[0]}
        </div>
      </div>
      
      <!-- Reference -->
      <div class="reference">
        <strong>Dear Sir,</strong><br>
        <strong>Sub: Requirement of ${template.reference}</strong><br>
        <strong>Ref: Discussion with Mr. Sabu Kumar, President</strong><br>
        <strong>Prakash Green Energy.</strong>
      </div>
      
      <!-- Description -->
      <div style="margin: 20px 0;">
        We are delighted to introduce ourselves as the complete Solar Solutions provide to 
        domestic sector and corporate sector in the field of renewable energies. Latest and design 
        technique of solar installation has been constantly reviewed by the installation to ensure 
        that our systems are implemented as designed. We provide list following procedures. 
        <br><br>
        We are providing Solar On-Grid System, Solar Off-Grid system, Solar Hybrid 
        System, Solar Water Pump, solar water heater, solar charges and solar gadgets like solar DC 
        Bulbs, DC Fan, solar smart light, solar flood light and led decorative lights.
        <br><br>
        We assure you of our best services always.
        <br><br>
        Thank you,<br>
        <strong>Mr. M Sabu Prakash,</strong><br>
        Managing Director<br>
        Prakash Green Energy.
      </div>
      
      <!-- Pricing Table -->
      <table class="pricing-table">
        <thead>
          <tr>
            <th>Sl</th>
            <th>Description</th>
            <th>kw</th>
            <th>Rate Per kw</th>
            <th>GST per kw</th>
            <th>GST %</th>
            <th>Value + GST</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td style="text-align: left; padding-left: 10px;">${template.pricingBreakdown.description}</td>
            <td>${template.pricingBreakdown.kw}</td>
            <td>₹ ${template.pricingBreakdown.ratePerKw.toLocaleString()}</td>
            <td>₹ ${template.pricingBreakdown.gstPerKw.toLocaleString()}</td>
            <td>${template.pricingBreakdown.gstPercentage}%</td>
            <td>₹ ${template.pricingBreakdown.valueWithGST.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      
      <!-- Total Calculation -->
      <div class="total-calculation">
        <strong>Total Cost: ₹ ${template.pricingBreakdown.totalCost.toLocaleString()}</strong><br>
        <strong>Total Amount ${template.pricingBreakdown.totalCost.toLocaleString()} - Subsidy Amount ${template.pricingBreakdown.subsidyAmount.toLocaleString()} = ${template.pricingBreakdown.customerPayment.toLocaleString()}</strong>
      </div>
      
      <div class="subsidy-note">
        <strong>3kw Subsidy 78,000 Will be Credited to The Customer's Account</strong>
      </div>
      
      <!-- Bill of Materials -->
      <div class="page-break">
        <h3 style="color: #0066cc; text-align: center;">Bill of Materials for On-Grid SPC System</h3>
        
        <table class="bom-table">
          <thead>
            <tr>
              <th>Sl No</th>
              <th>Description / Component Name</th>
              <th>Type</th>
              <th>Volt</th>
              <th>Rating</th>
              <th>MAKE</th>
              <th>Qty</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            ${template.billOfMaterials.map(item => `
              <tr>
                <td>${item.slNo}</td>
                <td style="text-align: left;">${item.description}</td>
                <td>${item.type}</td>
                <td>${item.volt}</td>
                <td>${item.rating}</td>
                <td>${item.make}</td>
                <td>${item.qty}</td>
                <td>${item.unit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Terms & Conditions -->
      <div class="terms-section page-break">
        <h3>Terms & Conditions</h3>
        
        <div class="warranty-item">
          <strong>✓ Warranty Details:</strong><br>
          ${template.termsAndConditions.warrantyDetails.map(item => 
            item.includes('***') ? `<div class="highlight">${item}</div>` : `<div>${item}</div>`
          ).join('')}
        </div>
        
        <div class="warranty-item">
          ${template.termsAndConditions.solarInverterWarranty.map(item => `<div>${item}</div>`).join('')}
        </div>
        
        <div class="warranty-item">
          <strong>✓ Payment Details:</strong><br>
          • ${template.termsAndConditions.paymentDetails.advancePercentage}% Advance along with Purchase Order<br>
          • ${template.termsAndConditions.paymentDetails.balancePercentage}% Immediately after completion of work<br>
          
          <div class="bank-details">
            <strong>• Payment Account Details:</strong><br>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="border: 1px solid #ccc; padding: 5px;"><strong>Name</strong></td><td style="border: 1px solid #ccc; padding: 5px;">${template.termsAndConditions.paymentDetails.bankDetails.name}</td></tr>
              <tr><td style="border: 1px solid #ccc; padding: 5px;"><strong>Bank</strong></td><td style="border: 1px solid #ccc; padding: 5px;">${template.termsAndConditions.paymentDetails.bankDetails.bank}</td></tr>
              <tr><td style="border: 1px solid #ccc; padding: 5px;"><strong>Branch</strong></td><td style="border: 1px solid #ccc; padding: 5px;">${template.termsAndConditions.paymentDetails.bankDetails.branch}</td></tr>
              <tr><td style="border: 1px solid #ccc; padding: 5px;"><strong>A/C NO</strong></td><td style="border: 1px solid #ccc; padding: 5px;">${template.termsAndConditions.paymentDetails.bankDetails.accountNo}</td></tr>
              <tr><td style="border: 1px solid #ccc; padding: 5px;"><strong>IFSC Code</strong></td><td style="border: 1px solid #ccc; padding: 5px;">${template.termsAndConditions.paymentDetails.bankDetails.ifscCode}</td></tr>
            </table>
          </div>
        </div>
        
        <div class="warranty-item">
          <strong>✓ Delivery Period:</strong><br>
          • ${template.termsAndConditions.deliveryPeriod}
        </div>
      </div>
      
      <!-- Scope of Work -->
      <div class="scope-section">
        <h3 style="color: #0066cc;">Scope of Work</h3>
        
        <div>
          ${template.scopeOfWork.structure.map(item => `<div>${item}</div>`).join('')}
        </div>
        
        <div style="margin-top: 15px;">
          ${template.scopeOfWork.netBiDirectionalMeter.map(item => `<div>${item}</div>`).join('')}
        </div>
        
        <div style="margin-top: 20px;">
          <strong>• Customer's Scope of Work:</strong><br>
          <div style="margin-left: 20px;">
            ${template.scopeOfWork.customerScope.civilWork.map(item => `<div>${item}</div>`).join('')}
            <br>
            ${template.scopeOfWork.customerScope.netBiDirectionalMeter.map(item => `<div>${item}</div>`).join('')}
          </div>
        </div>
      </div>
      
      <!-- Documents Required -->
      <div class="documents-section">
        <h3 style="color: #0066cc; margin-top: 0;">Documents Required for Subsidy</h3>
        ${template.documentsRequiredForSubsidy.list.map(item => `<div>${item}</div>`).join('')}
        <br>
        <div class="highlight">${template.documentsRequiredForSubsidy.note}</div>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; margin-top: 40px; font-style: italic; color: #666;">
        Deals with Solar On-Grid System, Off-Grid System, Hybrid System,<br>
        Solar Water Heater, Solar Water Pump and<br>
        All kinds of Solar Lights
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate PDF from quotation data
   */
  static async generatePDF(
    quotation: Quotation,
    project: QuotationProject,
    customer: any,
    options?: Partial<PDFGenerationOptions>
  ): Promise<{ html: string; template: QuotationTemplate }> {
    try {
      // Generate template
      const template = QuotationTemplateService.generateQuotationTemplate(
        quotation,
        project,
        customer
      );

      // Generate HTML content
      const html = this.generateHTMLContent(template);

      return {
        html,
        template
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate quotation PDF');
    }
  }
}