/**
 * Exact Template Engine for Quotation PDF Generation
 * Based on CORRECTED_QUOTATION_IMPLEMENTATION_PLAN.md Phase 3.1
 * Matches exact format from company template
 */

import {
  type InsertQuotationDraft,
  type BOMItem,
  type Warranty,
  type Pricing
} from "@shared/schema";

interface PDFGenerationResult {
  pdfUrl: string;
  documentId: string;
  fileName: string;
  generatedAt: Date;
}

export class ExactTemplateEngine {
  
  /**
   * Generate quotation PDF matching exact company format
   */
  static async generateQuotationPDF(quotation: any, options: any = {}): Promise<PDFGenerationResult> {
    try {
      // Validate required quotation data
      if (!quotation.projectType || !quotation.pricing) {
        throw new Error('Quotation missing required data for PDF generation');
      }

      // Determine template based on project type
      let htmlContent: string;
      
      switch (quotation.projectType) {
        case 'on_grid':
          htmlContent = this.generateOnGridQuotation(quotation, options);
          break;
        case 'off_grid':
          htmlContent = this.generateOffGridQuotation(quotation, options);
          break;
        case 'hybrid':
          htmlContent = this.generateHybridQuotation(quotation, options);
          break;
        case 'water_heater':
          htmlContent = this.generateWaterHeaterQuotation(quotation, options);
          break;
        case 'water_pump':
          htmlContent = this.generateWaterPumpQuotation(quotation, options);
          break;
        default:
          throw new Error(`Unsupported project type: ${quotation.projectType}`);
      }

      // Generate PDF from HTML (using a PDF generation service)
      const pdfResult = await this.convertHtmlToPDF(htmlContent, quotation, options);
      
      return pdfResult;
      
    } catch (error) {
      console.error('Error generating quotation PDF:', error);
      throw new Error(`Failed to generate quotation PDF: ${error.message}`);
    }
  }

  /**
   * Generate On-Grid quotation matching exact format
   */
  static generateOnGridQuotation(quotation: any, options: any = {}): string {
    const template = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Quotation - ${quotation.quotationNumber || quotation.id}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
                line-height: 1.4;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .company-logo {
                width: 120px;
                height: auto;
                margin-bottom: 10px;
            }
            .company-info h1 {
                color: #2563eb;
                font-size: 28px;
                margin: 10px 0 5px 0;
                font-weight: bold;
            }
            .company-info p {
                margin: 5px 0;
                color: #666;
            }
            .quotation-content {
                margin-bottom: 30px;
            }
            .quotation-meta {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                background-color: #f8fafc;
                padding: 15px;
                border-radius: 8px;
            }
            .quotation-meta div {
                flex: 1;
            }
            .quotation-meta strong {
                color: #1e40af;
            }
            .introduction {
                background-color: #eff6ff;
                padding: 20px;
                border-left: 4px solid #2563eb;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
            }
            .project-title {
                color: #1e40af;
                font-size: 22px;
                font-weight: bold;
                margin: 25px 0 15px 0;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 10px;
            }
            .pricing-summary {
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                color: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }
            .pricing-summary .main-price {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .pricing-summary .subsidy-info {
                font-size: 16px;
                opacity: 0.9;
            }
            .pricing-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .pricing-table thead {
                background-color: #2563eb;
                color: white;
            }
            .pricing-table th, .pricing-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #e5e7eb;
            }
            .pricing-table th {
                font-weight: bold;
                text-align: center;
            }
            .pricing-table tbody tr:nth-child(even) {
                background-color: #f9fafb;
            }
            .pricing-table tbody tr:hover {
                background-color: #f3f4f6;
            }
            .terms-conditions {
                margin-top: 30px;
            }
            .terms-conditions h3 {
                color: #1e40af;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 5px;
                margin-bottom: 15px;
            }
            .terms-conditions h4 {
                color: #374151;
                margin-top: 20px;
                margin-bottom: 10px;
            }
            .warranty-section {
                background-color: #fef3c7;
                padding: 15px;
                border-radius: 8px;
                margin: 10px 0;
                border-left: 4px solid #f59e0b;
            }
            .warranty-section h5 {
                color: #92400e;
                margin-bottom: 8px;
            }
            .warranty-section ul {
                margin: 5px 0;
                padding-left: 20px;
            }
            .scope-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 20px;
            }
            .scope-section .company-scope, .scope-section .customer-scope {
                background-color: #f9fafb;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }
            .scope-section .company-scope {
                border-left: 4px solid #10b981;
            }
            .scope-section .customer-scope {
                border-left: 4px solid #f59e0b;
            }
            .footer {
                margin-top: 40px;
                text-align: center;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-info">
                <h1>PRAKASH GREEN ENERGY</h1>
                <p><strong>Complete Solar Solution Provider</strong></p>
                <p>📞 Contact: +91-XXXXXXXXXX | ✉️ Email: info@prakashgreenenergy.com</p>
                <p>🌐 Website: www.prakashgreenenergy.com</p>
            </div>
        </div>
        
        <div class="quotation-content">
            <div class="quotation-meta">
                <div>
                    <p><strong>Date:</strong> ${this.formatDate(quotation.createdAt)}</p>
                    <p><strong>Quotation No:</strong> ${quotation.quotationNumber || quotation.id}</p>
                </div>
                <div>
                    <p><strong>To:</strong> ${quotation.customerName}</p>
                    <p><strong>Mobile:</strong> ${quotation.customerMobile}</p>
                    <p><strong>Address:</strong> ${quotation.customerAddress}</p>
                </div>
            </div>
            
            <p><strong>Dear Sir/Madam,</strong></p>
            
            <p><strong>Sub:</strong> Requirement of ${quotation.systemCapacity} ${quotation.projectType.replace('_', '-')} Solar Power Generation System - Reg</p>
            
            <p><strong>Ref:</strong> Discussion with ${quotation.createdBy} on ${this.formatDate(quotation.sourceVisitDate || quotation.createdAt)}</p>
            
            <div class="introduction">
                <p>We are pleased to submit our quotation for <strong>${quotation.projectTitle || `${quotation.systemCapacity} Solar System`}</strong> as per your requirements discussed during our site visit.</p>
                <p>Our solution provides reliable, efficient, and cost-effective solar energy for your ${quotation.propertyType} property.</p>
            </div>
            
            <h2 class="project-title">${quotation.projectTitle || `${quotation.systemCapacity} ${quotation.projectType.replace('_', ' ')} Solar System`}</h2>
            
            <div class="pricing-summary">
                <div class="main-price">
                    Total System Cost: ₹${(quotation.pricing?.totalSystemCost || 0).toLocaleString()} 
                    ${quotation.pricing?.subsidyAmount ? `- Subsidy: ₹${quotation.pricing.subsidyAmount.toLocaleString()}` : ''}
                    = <strong>₹${(quotation.pricing?.customerPayment || quotation.pricing?.totalSystemCost || 0).toLocaleString()}</strong>
                </div>
                <div class="subsidy-info">
                    ${quotation.pricing?.subsidyAmount ? 
                      `Government Subsidy of ₹${quotation.pricing.subsidyAmount.toLocaleString()} will be credited to your account` : 
                      'No government subsidy applicable for this system type'
                    }
                </div>
            </div>
            
            <h3>Bill of Materials for ${quotation.projectType.replace('_', ' ')} System</h3>
            <table class="pricing-table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Description</th>
                        <th>Specification</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${(quotation.billOfMaterials || this.generateDefaultBOM(quotation)).map((item: BOMItem, index: number) => `
                    <tr>
                        <td style="text-align: center">${index + 1}</td>
                        <td>${item.item}</td>
                        <td>${item.specification}</td>
                        <td style="text-align: center">${item.quantity}</td>
                        <td style="text-align: center">${item.unit}</td>
                        <td style="text-align: right">₹${(item.amount || 0).toLocaleString()}</td>
                    </tr>
                    `).join('')}
                    <tr style="background-color: #2563eb; color: white; font-weight: bold;">
                        <td colspan="5" style="text-align: right; padding: 15px;">Total System Cost:</td>
                        <td style="text-align: right; padding: 15px;">₹${(quotation.pricing?.totalSystemCost || 0).toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="terms-conditions">
                <h3>Terms & Conditions</h3>
                
                <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 15px 0;">
                    <p style="color: #dc2626; font-weight: bold; margin: 0;">
                        ⚠️ <strong>Important:</strong> Physical Damages will not be Covered under Warranty
                    </p>
                </div>
                
                <h4>📋 Warranty Details:</h4>
                ${(quotation.warranties || this.generateDefaultWarranties(quotation)).map((warranty: Warranty) => `
                <div class="warranty-section">
                    <h5>🔧 ${warranty.component.replace('_', ' ').toUpperCase()}</h5>
                    <ul>
                        <li>✅ ${warranty.manufacturingWarranty} Manufacturing Defect Warranty</li>
                        <li>🔧 ${warranty.serviceWarranty} Service Warranty</li>
                        ${warranty.performanceWarranty ? `<li>⚡ ${warranty.performanceWarranty}</li>` : ''}
                    </ul>
                </div>
                `).join('')}
                
                <h4>💰 Payment Details:</h4>
                <ul>
                    <li><strong>90% Advance</strong> along with Purchase Order</li>
                    <li><strong>10% Balance</strong> after completion of work</li>
                    <li>Payment can be made via NEFT/RTGS/UPI</li>
                </ul>
                
                <h4>📅 Delivery Period:</h4>
                <p><strong>2-3 Weeks</strong> from order confirmation and advance payment</p>
                
                <div class="scope-section">
                    <div class="company-scope">
                        <h4>🏢 Our Scope of Work:</h4>
                        ${this.generateCompanyScope(quotation)}
                    </div>
                    
                    <div class="customer-scope">
                        <h4>👤 Customer's Scope of Work:</h4>
                        ${this.generateCustomerScope(quotation)}
                    </div>
                </div>
                
                <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <h4 style="color: #065f46; margin-top: 0;">🌟 Why Choose Prakash Green Energy?</h4>
                    <ul style="color: #047857;">
                        <li>✅ <strong>Expert Installation:</strong> Certified technicians with 5+ years experience</li>
                        <li>✅ <strong>Quality Products:</strong> Tier-1 branded components with international certifications</li>
                        <li>✅ <strong>Complete Support:</strong> From design to commissioning and after-sales service</li>
                        <li>✅ <strong>Guaranteed Performance:</strong> System performance monitoring and optimization</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Thank you for considering Prakash Green Energy for your solar needs!</strong></p>
            <p>For any queries, please feel free to contact us. We look forward to serving you.</p>
            <p style="margin-top: 15px; color: #9ca3af; font-size: 12px;">
                This quotation is valid for 30 days from the date of issue.
            </p>
        </div>
    </body>
    </html>
    `;
    
    return template;
  }

  /**
   * Generate company scope based on configuration
   */
  private static generateCompanyScope(quotation: any): string {
    const scopes = [];
    
    if (quotation.systemConfiguration?.civilWorkScope === 'company_scope') {
      scopes.push('<p>🏗️ <strong>Civil Work:</strong> Complete foundation and structure setup</p>');
    }
    
    if (quotation.systemConfiguration?.netMeterScope === 'company_scope') {
      scopes.push('<p>⚡ <strong>Net Metering:</strong> Complete application and documentation with EB</p>');
    }
    
    scopes.push('<p>🔧 <strong>Installation:</strong> Complete system installation and commissioning</p>');
    scopes.push('<p>🧪 <strong>Testing:</strong> Performance testing and system optimization</p>');
    scopes.push('<p>📜 <strong>Documentation:</strong> All technical certificates and compliance documents</p>');
    scopes.push('<p>🎓 <strong>Training:</strong> Basic system operation training for customer</p>');
    
    return scopes.join('');
  }

  /**
   * Generate customer scope based on configuration
   */
  private static generateCustomerScope(quotation: any): string {
    const scopes = [];
    
    if (quotation.systemConfiguration?.civilWorkScope === 'customer_scope') {
      scopes.push('<p>🏗️ <strong>Civil Work:</strong> Earth pit digging and foundation preparation</p>');
    }
    
    if (quotation.systemConfiguration?.netMeterScope === 'customer_scope') {
      scopes.push('<p>⚡ <strong>EB Office Work:</strong> Net meter application and approvals</p>');
    }
    
    scopes.push('<p>🔌 <strong>Electricity:</strong> AC & DC power points near inverter location</p>');
    scopes.push('<p>📄 <strong>Documents:</strong> Property documents for subsidy applications</p>');
    scopes.push('<p>🚧 <strong>Site Access:</strong> Clear access to installation areas</p>');
    scopes.push('<p>💧 <strong>Basic Facilities:</strong> Water facility for construction work</p>');
    
    return scopes.join('');
  }

  /**
   * Generate default BOM if not provided
   */
  private static generateDefaultBOM(quotation: any): BOMItem[] {
    const bom: BOMItem[] = [];
    const config = quotation.systemConfiguration || {};
    
    if (quotation.projectType === 'on_grid') {
      bom.push(
        {
          sno: 1,
          item: 'Solar Panel',
          specification: `${config.panelWatts || '540W'} Poly/Mono Crystalline`,
          quantity: config.panelCount || 10,
          unit: 'Nos',
          amount: 0
        },
        {
          sno: 2,
          item: 'Solar Inverter',
          specification: `${config.inverterWatts || '5kW'} ${config.inverterPhase || 'Single Phase'}`,
          quantity: 1,
          unit: 'Nos',
          amount: 0
        },
        {
          sno: 3,
          item: 'Mounting Structure',
          specification: `${config.structureType || 'GP Structure'} with Rails`,
          quantity: 1,
          unit: 'Set',
          amount: 0
        },
        {
          sno: 4,
          item: 'DC Cable',
          specification: '4 sq mm Solar DC Cable',
          quantity: 100,
          unit: 'Mtrs',
          amount: 0
        },
        {
          sno: 5,
          item: 'AC Cable',
          specification: '4 sq mm PVC Insulated Cable',
          quantity: 50,
          unit: 'Mtrs',
          amount: 0
        },
        {
          sno: 6,
          item: 'Earthing Kit',
          specification: `${config.earth || 'AC+DC'} Earthing with GI Pipe`,
          quantity: 1,
          unit: 'Set',
          amount: 0
        }
      );
      
      if (config.lightningArrest) {
        bom.push({
          sno: 7,
          item: 'Lightning Arrestor',
          specification: 'DC Lightning Protection Device',
          quantity: 1,
          unit: 'Nos',
          amount: 0
        });
      }
    }
    
    return bom;
  }

  /**
   * Generate default warranties if not provided
   */
  private static generateDefaultWarranties(quotation: any): Warranty[] {
    const warranties: Warranty[] = [];
    
    if (quotation.projectType === 'on_grid') {
      warranties.push(
        {
          component: 'Solar Panel',
          manufacturingWarranty: '25 Years',
          serviceWarranty: '5 Years',
          performanceWarranty: '25 Years Performance Warranty (80% after 25 years)'
        },
        {
          component: 'Solar Inverter',
          manufacturingWarranty: '5 Years',
          serviceWarranty: '5 Years',
          performanceWarranty: undefined
        },
        {
          component: 'Mounting Structure',
          manufacturingWarranty: '10 Years',
          serviceWarranty: '2 Years',
          performanceWarranty: undefined
        },
        {
          component: 'Installation Work',
          manufacturingWarranty: '2 Years',
          serviceWarranty: '1 Year',
          performanceWarranty: undefined
        }
      );
    }
    
    return warranties;
  }

  /**
   * Generate quotations for other project types (simplified)
   */
  static generateOffGridQuotation(quotation: any): string {
    // Similar to on-grid but with battery components
    return this.generateOnGridQuotation(quotation).replace(
      'On-Grid Solar System',
      'Off-Grid Solar System with Battery Backup'
    );
  }

  static generateHybridQuotation(quotation: any): string {
    // Combination of grid-tied and battery backup
    return this.generateOnGridQuotation(quotation).replace(
      'On-Grid Solar System',
      'Hybrid Solar System (Grid-Tied with Battery Backup)'
    );
  }

  static generateWaterHeaterQuotation(quotation: any): string {
    // Water heater specific template
    return this.generateOnGridQuotation(quotation).replace(
      'Solar Power Generation System',
      'Solar Water Heating System'
    );
  }

  static generateWaterPumpQuotation(quotation: any): string {
    // Water pump specific template
    return this.generateOnGridQuotation(quotation).replace(
      'Solar Power Generation System',
      'Solar Water Pumping System'
    );
  }

  /**
   * Convert HTML to PDF (enhanced implementation with proper error handling)
   * TODO: Replace with actual PDF generation service (Puppeteer, PDFKit, or cloud service)
   */
  private static async convertHtmlToPDF(htmlContent: string, quotation: any, options: any = {}): Promise<PDFGenerationResult> {
    // Validate HTML content
    if (!htmlContent || htmlContent.length < 100) {
      throw new Error('Invalid HTML content for PDF generation');
    }

    const fileName = `quotation-${quotation.id || 'draft'}-${Date.now()}.pdf`;
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // TODO: Implement actual PDF generation here
      // Example implementation would be:
      /*
      import puppeteer from 'puppeteer';
      
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });
      await browser.close();
      
      // Upload to cloud storage (AWS S3, Google Cloud, etc.)
      const pdfUrl = await uploadPDFToStorage(pdfBuffer, fileName);
      */
      
      // For now, simulate the PDF generation process
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
      
      // In a real implementation, this would be the actual storage URL
      const pdfUrl = `/api/quotations/${quotation.id}/documents/${fileName}`;
      
      console.log('PDF generation process completed:', {
        fileName,
        documentId,
        contentLength: htmlContent.length,
        templateType: options.templateType || 'standard',
        quotationId: quotation.id
      });
      
      // Log that this is a placeholder implementation
      console.warn('WARNING: Using placeholder PDF generation. Implement actual PDF service in production.');
      
      return {
        pdfUrl,
        documentId,
        fileName,
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error(`PDF generation service error: ${error.message}`);
    }
  }

  /**
   * Format date for display
   */
  private static formatDate(date: any): string {
    if (!date) return new Date().toLocaleDateString('en-IN');
    
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}