import { forwardRef } from "react";
import { EnterpriseQuotation } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  email?: string;
}

interface BaseTemplateProps {
  quotation: EnterpriseQuotation;
  customer: Customer;
  companyLogo?: string;
}

// Base template component that other templates extend
export const BaseTemplate = forwardRef<HTMLDivElement, BaseTemplateProps>(
  ({ quotation, customer, companyLogo }, ref) => {
    const { templateData, financials, paymentTerms } = quotation;

    return (
      <div ref={ref} className="quotation-document bg-white p-8 max-w-4xl mx-auto text-black print:p-6 print:max-w-none">
        {/* Company Header */}
        <header className="company-header mb-8 border-b-2 border-gray-300 pb-6">
          <div className="flex items-center justify-between">
            <div className="company-info">
              <h1 className="text-3xl font-bold text-blue-600 mb-2">PRAKASH GREEN ENERGY</h1>
              <p className="text-lg text-gray-600 mb-1">Complete Solar Solution Provider</p>
              <p className="text-sm text-gray-500">GST: 33AAPFP1855N1ZI | CIN: U40106TN2018PTC125932</p>
            </div>
            {companyLogo && (
              <div className="company-logo">
                <img src={companyLogo} alt="Prakash Green Energy" className="h-16 w-auto" />
              </div>
            )}
          </div>
          
          <div className="contact-details mt-4 text-sm text-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Head Office:</strong> No.123, Main Street, Chennai - 600001</p>
                <p><strong>Phone:</strong> +91 9876543210 | <strong>Email:</strong> info@prakashgreenenergy.com</p>
              </div>
              <div>
                <p><strong>Website:</strong> www.prakashgreenenergy.com</p>
                <p><strong>Managing Director:</strong> {templateData.managingDirectorName}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Customer Details Section */}
        <section className="customer-details mb-6">
          <p className="mb-4">Dear Sir/Madam,</p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="mb-2">
              <strong>Subject:</strong> {templateData.subjectLine}
            </p>
            <p className="mb-2">
              <strong>Reference:</strong> {templateData.customerReference}
            </p>
            <p className="mb-2">
              <strong>Customer:</strong> {customer.name}
            </p>
            <p className="mb-2">
              <strong>Address:</strong> {customer.address}
            </p>
            <p className="mb-2">
              <strong>Mobile:</strong> {customer.mobile}
            </p>
            {customer.email && (
              <p>
                <strong>Email:</strong> {customer.email}
              </p>
            )}
          </div>
        </section>

        {/* Introduction */}
        <section className="introduction mb-6">
          <p className="leading-relaxed text-gray-700">
            {templateData.introductionText || 
              "Thank you for your interest in our solar energy solutions. We are pleased to submit our quotation for your requirements. Prakash Green Energy is committed to providing high-quality solar solutions with excellent after-sales service."
            }
          </p>
        </section>

        {/* Project Summary */}
        <section className="quotation-summary mb-8">
          <h2 className="text-xl font-bold mb-4 text-blue-600">{quotation.projectTitle}</h2>
          <div className="pricing-summary bg-blue-50 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
              <div>
                <p><strong>System Capacity:</strong> {quotation.systemCapacity}</p>
                <p><strong>Total System Cost:</strong> {formatCurrency(financials.finalCustomerPayment)}</p>
              </div>
              <div>
                <p><strong>Subsidy Amount:</strong> {formatCurrency(financials.subsidyAmount)}</p>
                <p><strong>Customer Payment:</strong> {formatCurrency(financials.finalCustomerPayment - financials.subsidyAmount)}</p>
              </div>
            </div>
            
            {financials.subsidyAmount > 0 && (
              <div className="mt-4 p-4 bg-green-100 rounded border-l-4 border-green-500">
                <p className="text-green-800">
                  <strong>Note:</strong> Subsidy amount of {formatCurrency(financials.subsidyAmount)} will be credited directly to your account after installation and commissioning.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* This is where child templates will add their specific content */}
        <div className="template-content">
          {/* Content will be inserted by specific templates */}
        </div>

        {/* Payment Terms */}
        <section className="payment-terms mb-6">
          <h3 className="text-lg font-bold mb-3 text-blue-600">Payment Terms</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>{paymentTerms.advancePercentage}% Advance Payment:</strong> {formatCurrency(financials.advanceAmount)} - {paymentTerms.advanceTrigger === 'custom' ? paymentTerms.customAdvanceTrigger : paymentTerms.advanceTrigger.replace('_', ' ')}
              </li>
              <li>
                <strong>{paymentTerms.balancePercentage}% Balance Payment:</strong> {formatCurrency(financials.balanceAmount)} - {paymentTerms.balanceTrigger === 'custom' ? paymentTerms.customBalanceTrigger : paymentTerms.balanceTrigger.replace('_', ' ')}
              </li>
            </ul>

            {paymentTerms.accountDetails && (
              <div className="mt-4 p-4 bg-blue-50 rounded border-l-4 border-blue-500">
                <h4 className="font-bold mb-2">Bank Account Details:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Bank Name:</strong> {paymentTerms.accountDetails.bankName}</p>
                    <p><strong>Account Number:</strong> {paymentTerms.accountDetails.accountNumber}</p>
                  </div>
                  <div>
                    <p><strong>IFSC Code:</strong> {paymentTerms.accountDetails.ifscCode}</p>
                    <p><strong>Account Holder:</strong> {paymentTerms.accountDetails.accountHolderName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Delivery Period */}
        <section className="delivery mb-6">
          <h3 className="text-lg font-bold mb-3 text-blue-600">Delivery Schedule</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p><strong>Delivery Period:</strong> {quotation.deliveryPeriod}</p>
            {quotation.installationDuration && (
              <p><strong>Installation Duration:</strong> {quotation.installationDuration}</p>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t-2 border-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="font-bold mb-2">For Prakash Green Energy</p>
              <div className="mt-8">
                <p className="border-t border-gray-400 pt-2 inline-block">Authorized Signatory</p>
              </div>
            </div>
            <div className="text-right">
              <p><strong>Contact Person:</strong> {templateData.contactPerson}</p>
              <p><strong>Date:</strong> {formatDate(new Date())}</p>
              <p className="text-sm text-gray-600 mt-2">
                This quotation is valid for 30 days from the date of issue.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }
);

BaseTemplate.displayName = "BaseTemplate";