import { useState, useRef } from "react";
import { EnterpriseQuotation } from "@shared/schema";
import { OnGridTemplate } from "./on-grid-template";
import { BaseTemplate } from "./base-template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Eye, FileText, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  email?: string;
}

interface TemplateEngineProps {
  quotation: EnterpriseQuotation;
  customer: Customer;
  onPdfGenerated?: (url: string) => void;
  onEmailSent?: () => void;
}

export function TemplateEngine({ quotation, customer, onPdfGenerated, onEmailSent }: TemplateEngineProps) {
  const [outputFormat, setOutputFormat] = useState<'pdf' | 'html'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Select the appropriate template based on project type
  const renderTemplate = () => {
    const templateProps = {
      quotation,
      customer,
      ref: templateRef
    };

    switch (quotation.templateData.templateType) {
      case 'on_grid_template':
        return <OnGridTemplate {...templateProps} />;
      case 'off_grid_template':
      case 'hybrid_template':
      case 'water_heater_template':
      case 'water_pump_template':
      default:
        // For now, use base template for other types
        return <BaseTemplate {...templateProps} />;
    }
  };

  const generatePDF = async () => {
    if (!templateRef.current) {
      toast({
        title: "Error",
        description: "Template not ready for PDF generation",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Use html2pdf library or similar for client-side PDF generation
      // For now, we'll use the browser's print functionality
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Quotation - ${quotation.quotationNumber}</title>
              <meta charset="utf-8">
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  font-family: Arial, sans-serif; 
                  color: #000; 
                  background: white;
                }
                .quotation-document { 
                  max-width: none !important; 
                  margin: 0 !important; 
                  padding: 0 !important;
                }
                @media print {
                  body { margin: 0; padding: 0; }
                  .quotation-document { page-break-inside: avoid; }
                }
                @page { 
                  margin: 1cm; 
                  size: A4; 
                }
                /* Tailwind-like styles for print */
                .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
                .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
                .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
                .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
                .text-xs { font-size: 0.75rem; line-height: 1rem; }
                .font-bold { font-weight: 700; }
                .text-blue-600 { color: #2563eb; }
                .text-blue-800 { color: #1e40af; }
                .text-gray-600 { color: #4b5563; }
                .text-gray-700 { color: #374151; }
                .text-green-800 { color: #166534; }
                .text-red-800 { color: #991b1b; }
                .bg-gray-50 { background-color: #f9fafb; }
                .bg-blue-50 { background-color: #eff6ff; }
                .bg-green-100 { background-color: #dcfce7; }
                .bg-red-50 { background-color: #fef2f2; }
                .border { border-width: 1px; border-color: #d1d5db; }
                .border-b-2 { border-bottom-width: 2px; }
                .border-t-2 { border-top-width: 2px; }
                .border-l-4 { border-left-width: 4px; }
                .border-gray-300 { border-color: #d1d5db; }
                .border-blue-500 { border-color: #3b82f6; }
                .border-green-500 { border-color: #22c55e; }
                .border-red-500 { border-color: #ef4444; }
                .p-4 { padding: 1rem; }
                .p-6 { padding: 1.5rem; }
                .p-8 { padding: 2rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mb-3 { margin-bottom: 0.75rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mb-8 { margin-bottom: 2rem; }
                .mt-4 { margin-top: 1rem; }
                .mt-8 { margin-top: 2rem; }
                .rounded { border-radius: 0.25rem; }
                .rounded-lg { border-radius: 0.5rem; }
                .grid { display: grid; }
                .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .gap-4 { gap: 1rem; }
                .gap-6 { gap: 1.5rem; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-between { justify-content: space-between; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .leading-relaxed { line-height: 1.625; }
                .space-y-1 > * + * { margin-top: 0.25rem; }
                .space-y-2 > * + * { margin-top: 0.5rem; }
                .list-disc { list-style-type: disc; }
                .list-inside { list-style-position: inside; }
                .capitalize { text-transform: capitalize; }
                .border-collapse { border-collapse: collapse; }
                .w-full { width: 100%; }
                .h-16 { height: 4rem; }
                .w-auto { width: auto; }
                .overflow-x-auto { overflow-x: auto; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 0.75rem; border: 1px solid #d1d5db; }
                th { background-color: #dbeafe; font-weight: 600; }
                tr:hover { background-color: #f9fafb; }
                .inline-block { display: inline-block; }
                .border-t { border-top: 1px solid #d1d5db; }
                .pt-2 { padding-top: 0.5rem; }
                .hover\\:bg-gray-50:hover { background-color: #f9fafb; }
              </style>
            </head>
            <body>
              ${templateRef.current.outerHTML}
            </body>
          </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then trigger print
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
        
        toast({
          title: "PDF Generated",
          description: "PDF is ready for download. Use your browser's print dialog to save as PDF.",
        });
        
        onPdfGenerated?.(quotation.quotationNumber || 'quotation');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendToCustomer = async () => {
    setIsSending(true);
    try {
      const response = await fetch(`/api/quotations/${quotation.id}/send-to-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerEmail: customer.email,
          includeAttachment: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send quotation');
      }

      toast({
        title: "Quotation Sent",
        description: `Quotation has been sent to ${customer.email}`,
      });
      
      onEmailSent?.();
    } catch (error) {
      console.error('Send email error:', error);
      toast({
        title: "Error",
        description: "Failed to send quotation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const previewInNewTab = () => {
    if (!templateRef.current) return;
    
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Preview - ${quotation.quotationNumber}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-gray-100 p-4">
            <div class="max-w-4xl mx-auto">
              ${templateRef.current.outerHTML}
            </div>
          </body>
        </html>
      `;
      
      previewWindow.document.write(htmlContent);
      previewWindow.document.close();
    }
  };

  return (
    <div className="template-engine space-y-6">
      {/* Template Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="format-select" className="text-sm font-medium">
                Output Format:
              </label>
              <Select value={outputFormat} onValueChange={(value: 'pdf' | 'html') => setOutputFormat(value)}>
                <SelectTrigger id="format-select" className="w-32" data-testid="select-output-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={previewInNewTab}
                variant="outline"
                size="sm"
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              
              <Button
                onClick={generatePDF}
                disabled={isGenerating}
                size="sm"
                data-testid="button-generate-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate PDF'}
              </Button>
              
              {customer.email && (
                <Button
                  onClick={sendToCustomer}
                  disabled={isSending}
                  variant="secondary"
                  size="sm"
                  data-testid="button-send-customer"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {isSending ? 'Sending...' : 'Send to Customer'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Document Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
            {renderTemplate()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}