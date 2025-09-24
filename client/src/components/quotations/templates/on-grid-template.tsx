import { forwardRef } from "react";
import { EnterpriseQuotation } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  email?: string;
}

interface OnGridTemplateProps {
  quotation: EnterpriseQuotation;
  customer: Customer;
  companyLogo?: string;
}

export const OnGridTemplate = forwardRef<HTMLDivElement, OnGridTemplateProps>(
  ({ quotation, customer, companyLogo }, ref) => {
    const { billOfMaterials, warranties, companyScope, customerScope } = quotation;

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
                <p><strong>Managing Director:</strong> {quotation.templateData.managingDirectorName}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Customer Details */}
        <section className="customer-details mb-6">
          <p className="mb-4">Dear Sir,</p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="mb-2">
              <strong>Sub:</strong> {quotation.templateData.subjectLine}
            </p>
            <p className="mb-2">
              <strong>Ref:</strong> {quotation.templateData.customerReference}
            </p>
            <p className="mb-2">
              <strong>Customer:</strong> {customer.name}
            </p>
            <p className="mb-2">
              <strong>Address:</strong> {customer.address}
            </p>
            <p>
              <strong>Mobile:</strong> {customer.mobile}
            </p>
          </div>
        </section>

        {/* Introduction */}
        <section className="introduction mb-6">
          <p className="leading-relaxed text-gray-700">
            {quotation.templateData.introductionText || 
              "Thank you for choosing Prakash Green Energy for your solar energy requirements. We are pleased to submit our technical and commercial offer for your consideration. With years of experience in solar installations, we ensure quality products and reliable service."
            }
          </p>
        </section>

        {/* Project Summary */}
        <section className="quotation-summary mb-8">
          <h2 className="text-xl font-bold mb-4 text-blue-600">{quotation.projectTitle}</h2>
          <div className="pricing-summary bg-blue-50 p-6 rounded-lg">
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-blue-800">
                Total Amount {formatCurrency(quotation.financials.finalCustomerPayment)} – Subsidy Amount {formatCurrency(quotation.financials.subsidyAmount)} = {formatCurrency(quotation.financials.finalCustomerPayment - quotation.financials.subsidyAmount)}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>System Capacity:</strong> {quotation.systemCapacity}</p>
                <p><strong>Price per kW:</strong> {formatCurrency(quotation.financials.pricePerUnit)}</p>
              </div>
              <div>
                <p><strong>Subsidy per kW:</strong> {formatCurrency(quotation.financials.subsidyAmount / parseFloat(quotation.systemCapacity))}</p>
                <p><strong>Net Customer Payment:</strong> {formatCurrency(quotation.financials.finalCustomerPayment - quotation.financials.subsidyAmount)}</p>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-green-100 rounded border-l-4 border-green-500">
              <p className="text-green-800">
                <strong>Subsidy Benefit:</strong> {quotation.systemCapacity} Subsidy {formatCurrency(quotation.financials.subsidyAmount)} will be credited to the customer's account after successful installation and net metering completion.
              </p>
            </div>
          </div>
        </section>

        {/* Bill of Materials */}
        <section className="bill-of-materials mb-8">
          <h3 className="text-lg font-bold mb-4 text-blue-600">Bill of Materials for {quotation.systemCapacity} On-Grid Solar System</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-gray-300 p-3 text-left">S.No</th>
                  <th className="border border-gray-300 p-3 text-left">Description</th>
                  <th className="border border-gray-300 p-3 text-left">Specification</th>
                  <th className="border border-gray-300 p-3 text-center">Quantity</th>
                  <th className="border border-gray-300 p-3 text-center">Unit</th>
                  <th className="border border-gray-300 p-3 text-right">Rate (₹)</th>
                  <th className="border border-gray-300 p-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {billOfMaterials.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3 text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-3">
                      <strong>{item.item}</strong>
                      {item.brand && <div className="text-sm text-gray-600">Brand: {item.brand}</div>}
                    </td>
                    <td className="border border-gray-300 p-3 text-sm">{item.specification}</td>
                    <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 p-3 text-center">{item.unit}</td>
                    <td className="border border-gray-300 p-3 text-right">
                      {item.rate ? formatCurrency(item.rate) : '-'}
                    </td>
                    <td className="border border-gray-300 p-3 text-right">
                      {item.amount ? formatCurrency(item.amount) : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-bold">
                  <td colSpan={6} className="border border-gray-300 p-3 text-right">Total System Cost:</td>
                  <td className="border border-gray-300 p-3 text-right">{formatCurrency(quotation.financials.finalCustomerPayment)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Warranty Details */}
        <section className="warranty-details mb-8">
          <h3 className="text-lg font-bold mb-4 text-blue-600">Warranty Details</h3>
          <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500 mb-4">
            <p className="text-red-800 font-bold">
              <em>***Physical Damages will not be Covered***</em>
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {warranties.map((warranty, index) => (
              <div key={index} className="warranty-item bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold mb-3 text-blue-700 capitalize">
                  {warranty.component.replace('_', ' ')}
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>{warranty.manufacturingWarranty}</strong> Manufacturing defect Warranty</li>
                  <li><strong>{warranty.serviceWarranty}</strong> Service Warranty</li>
                  {warranty.performanceWarranty && (
                    <li><strong>Performance:</strong> {warranty.performanceWarranty}</li>
                  )}
                  {warranty.replacementWarranty && (
                    <li><strong>Replacement:</strong> {warranty.replacementWarranty}</li>
                  )}
                </ul>
                {warranty.exclusions.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    <strong>Exclusions:</strong> {warranty.exclusions.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Payment Terms */}
        <section className="payment-terms mb-6">
          <h3 className="text-lg font-bold mb-3 text-blue-600">Payment Details</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>{quotation.paymentTerms.advancePercentage}% Advance:</strong> {formatCurrency(quotation.financials.advanceAmount)} - {quotation.paymentTerms.advanceTrigger.replace('_', ' ')}
              </li>
              <li>
                <strong>{quotation.paymentTerms.balancePercentage}% Balance:</strong> {formatCurrency(quotation.financials.balanceAmount)} - {quotation.paymentTerms.balanceTrigger.replace('_', ' ')}
              </li>
            </ul>
          </div>
        </section>

        {/* Delivery Period */}
        <section className="delivery mb-6">
          <h3 className="text-lg font-bold mb-3 text-blue-600">Delivery Period</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p>{quotation.deliveryPeriod}</p>
          </div>
        </section>

        {/* Scope of Work */}
        <section className="scope-of-work mb-6">
          <h3 className="text-lg font-bold mb-4 text-blue-600">Scope of Work</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Scope */}
            <div>
              <h4 className="font-bold mb-3 text-green-700">Our Scope of Work</h4>
              <div className="bg-green-50 p-4 rounded-lg">
                {companyScope.map((scope, index) => (
                  <div key={index} className="mb-3">
                    <h5 className="font-semibold text-green-800 capitalize">{scope.category.replace('_', ' ')}</h5>
                    <p className="text-sm text-green-700">{scope.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Scope */}
            <div>
              <h4 className="font-bold mb-3 text-orange-700">Customer's Scope of Work</h4>
              <div className="bg-orange-50 p-4 rounded-lg">
                {customerScope.map((scope, index) => (
                  <div key={index} className="mb-3">
                    <h5 className="font-semibold text-orange-800 capitalize">{scope.category.replace('_', ' ')}</h5>
                    <p className="text-sm text-orange-700">{scope.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Terms & Conditions */}
        <section className="terms-conditions mb-6">
          <h3 className="text-lg font-bold mb-3 text-blue-600">Terms & Conditions</h3>
          <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li>This quotation is valid for 30 days from the date of issue.</li>
              <li>Installation will commence after receipt of advance payment and site readiness.</li>
              <li>GST will be charged as applicable at the time of billing.</li>
              <li>Any additional civil work requirements will be charged separately.</li>
              <li>Government subsidy processing and documentation will be handled by us.</li>
              <li>Net metering approval and connection will be coordinated with TANGEDCO.</li>
              <li>All disputes are subject to Chennai jurisdiction only.</li>
            </ul>
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
              <p><strong>Contact Person:</strong> {quotation.templateData.contactPerson}</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString('en-IN')}</p>
              <p className="text-sm text-gray-600 mt-2">
                Thank you for your business. We look forward to serving you.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }
);

OnGridTemplate.displayName = "OnGridTemplate";