# CORRECTED QUOTATION SYSTEM IMPLEMENTATION PLAN
## Addressing Site Visit Data Integration & Partial Completion Workflow

---

## CRITICAL ISSUE WITH ORIGINAL PLAN

The original implementation plan **COMPLETELY MISSED** the most important workflow:

**Site Visit Form Data → Quotation Completion → Template Output**

### The Real User Journey:

1. **Site Visit Marketing Form**: User selects "on_grid" project type
2. **Detailed Configuration Shows**: 25+ fields (solarPanelMake, panelWatts, inverterMake, etc.)
3. **Partial Completion**: User fills some fields, leaves others empty during site visit
4. **Later Quotation Creation**: Complete the missing information
5. **Final Output**: Must exactly match the provided template format with accurate calculations

---

## COMPLETE ANALYSIS OF EXISTING SITE VISIT DATA STRUCTURES

### 1. Marketing Site Visit Form - Full Field Analysis

Based on actual codebase analysis:

```typescript
// Marketing Form captures 5 project types, each with detailed configurations

interface MarketingData {
  updateRequirements: boolean;
  projectType?: 'on_grid' | 'off_grid' | 'hybrid' | 'water_heater' | 'water_pump';
  
  onGridConfig?: {
    // Solar Panel Details
    solarPanelMake: string[];        // Multiple brands selectable
    panelWatts: string;              // "530W", "540W", etc.
    panelCount: number;              // Calculated or manual entry
    
    // Inverter Details  
    inverterMake: string[];          // Multiple brands selectable
    inverterWatts: string;           // "5kw", "10kw", etc.
    inverterPhase: string;           // "single_phase", "three_phase"
    inverterKW?: number;             // Optional calculated value
    inverterQty?: number;            // Optional quantity
    
    // Installation Details
    lightningArrest: boolean;        // Required safety equipment
    earth: string;                   // "ac", "dc", "ac_dc"
    floor?: string;                  // "0" (Ground) to "3rd"
    structureHeight: number;         // Height in feet
    structureType?: string;          // "gp_structure", "mono_rail"
    
    // Structure-specific configurations
    gpStructure?: {
      lowerEndHeight?: string;       // "0" to "14" feet
      higherEndHeight?: string;      // "0" to "14" feet
    };
    monoRail?: {
      type?: string;                 // "mini_rail", "long_rail"
    };
    
    // Scope of Work Responsibilities
    civilWorkScope?: string;         // "customer_scope", "company_scope"
    netMeterScope?: string;          // "customer_scope", "company_scope"
    electricalWorkScope?: string;    // "customer_scope", "company_scope"
    plumbingWorkScope?: string;      // "customer_scope", "company_scope"
    
    // Financial
    projectValue: number;            // Estimated project value
    others?: string;                 // Additional specifications
  };
  
  // Similar detailed structures for:
  offGridConfig?: OffGridConfig;     // Adds battery details
  hybridConfig?: HybridConfig;       // Combines grid + battery
  waterHeaterConfig?: WaterHeaterConfig;  // Litre capacity, heating coil
  waterPumpConfig?: WaterPumpConfig;      // HP, drive type, pump details
}
```

### 2. Technical Site Visit Form Data

```typescript
interface TechnicalData {
  serviceTypes: string[];           // Multiple services: on_grid, off_grid, hybrid, etc.
  workType: string;                // installation, amc, service, repair, etc.
  workingStatus: string;           // "pending", "completed"
  pendingRemarks?: string;         // If work is pending, why?
  teamMembers: string[];           // Team assigned to work
  description?: string;            // Technical work description
}
```

### 3. Admin Site Visit Form Data

```typescript
interface AdminData {
  bankProcess?: {
    step: string;                  // registration, verification, approval, etc.
    description?: string;          // Process details
  };
  ebProcess?: {
    type: string;                  // new_connection, tariff_change, etc.
    description?: string;          // EB process details
  };
  purchase?: string;               // Purchase details
  driving?: string;                // Transportation details
  officialCashTransactions?: string;  // Cash handling
  officialPersonalWork?: string;   // Personal work during official time
  others?: string;                 // Other administrative work
}
```

---

## THE MISSING WORKFLOW: SITE VISIT → QUOTATION COMPLETION

### Problem Scenarios in Real Usage:

#### Scenario 1: Partial Marketing Data Entry
```
Site Visit Marketing Form for "On-Grid 5kW System":
✅ Filled: projectType = "on_grid"
✅ Filled: solarPanelMake = ["Tata", "Waaree"] 
✅ Filled: panelWatts = "540W"
❌ Missing: inverterMake (customer undecided)
❌ Missing: inverterWatts (depends on final capacity)
❌ Missing: projectValue (needs calculation)
❌ Missing: structureType (site survey needed)
❌ Missing: civilWorkScope (customer will decide later)

QUOTATION SYSTEM MUST: Allow completion of missing fields + accurate calculation
```

#### Scenario 2: Multiple Project Types from Single Visit
```
Single Customer Site Visit Result:
✅ onGridConfig: Partially filled (50% complete)
✅ waterHeaterConfig: Basic details only (30% complete) 
✅ waterPumpConfig: Almost complete (90% complete)

QUOTATION SYSTEM MUST: Generate 3 separate quotations, each completable independently
```

#### Scenario 3: Technical + Marketing Data Integration
```
Technical Data: serviceTypes = ["on_grid", "installation"]
Marketing Data: onGridConfig = { partially filled }

QUOTATION MUST: Use technical data for installation scope + marketing data for specifications
```

---

## CORRECTED IMPLEMENTATION PLAN

### Phase 1: Site Visit Data Mapping & Validation (3 weeks)

#### 1.1 Data Completeness Analyzer
```typescript
// NEW: Analyze what's complete vs incomplete from site visit
export class SiteVisitDataAnalyzer {
  static analyzeCompleteness(siteVisit: SiteVisit): DataCompletenessReport {
    const report: DataCompletenessReport = {
      projectTypes: [],
      overallCompleteness: 0
    };
    
    if (siteVisit.marketingData?.onGridConfig) {
      report.projectTypes.push({
        type: 'on_grid',
        completeness: this.calculateOnGridCompleteness(siteVisit.marketingData.onGridConfig),
        missingFields: this.getOnGridMissingFields(siteVisit.marketingData.onGridConfig),
        criticalMissing: this.getOnGridCriticalMissing(siteVisit.marketingData.onGridConfig)
      });
    }
    
    // Similar analysis for other project types...
    
    return report;
  }
  
  private static calculateOnGridCompleteness(config: OnGridConfig): number {
    const requiredFields = [
      'solarPanelMake', 'panelWatts', 'inverterMake', 'inverterWatts', 
      'inverterPhase', 'panelCount', 'structureHeight', 'lightningArrest',
      'earth', 'civilWorkScope', 'netMeterScope'
    ];
    
    const optionalFields = [
      'inverterKW', 'inverterQty', 'floor', 'structureType', 
      'gpStructure', 'monoRail', 'projectValue', 'others'
    ];
    
    let filledRequired = 0;
    let filledOptional = 0;
    
    requiredFields.forEach(field => {
      if (this.isFieldFilled(config[field])) filledRequired++;
    });
    
    optionalFields.forEach(field => {
      if (this.isFieldFilled(config[field])) filledOptional++;
    });
    
    // Required fields weight 80%, optional fields weight 20%
    return (filledRequired / requiredFields.length) * 0.8 + 
           (filledOptional / optionalFields.length) * 0.2;
  }
  
  private static getOnGridCriticalMissing(config: OnGridConfig): string[] {
    const critical = [];
    if (!config.solarPanelMake?.length) critical.push('Solar Panel Make');
    if (!config.panelWatts) critical.push('Panel Wattage');
    if (!config.inverterMake?.length) critical.push('Inverter Make');
    if (!config.inverterWatts) critical.push('Inverter Capacity');
    if (!config.panelCount) critical.push('Panel Count');
    if (!config.structureHeight) critical.push('Structure Height');
    return critical;
  }
}
```

#### 1.2 Smart Default Value Engine
```typescript
// NEW: Intelligent defaults based on partial data
export class SmartDefaultEngine {
  static generateDefaults(projectType: string, partialConfig: any): any {
    switch (projectType) {
      case 'on_grid':
        return this.getOnGridDefaults(partialConfig);
      case 'off_grid':
        return this.getOffGridDefaults(partialConfig);
      // ... other types
    }
  }
  
  private static getOnGridDefaults(partial: Partial<OnGridConfig>): OnGridConfig {
    const defaults: OnGridConfig = {
      solarPanelMake: partial.solarPanelMake || ['tata_power'],
      panelWatts: partial.panelWatts || '540W',
      inverterMake: partial.inverterMake || ['solis'],
      inverterWatts: partial.inverterWatts || '5kw',
      inverterPhase: partial.inverterPhase || 'single_phase',
      lightningArrest: partial.lightningArrest ?? true,
      earth: partial.earth || 'ac_dc',
      panelCount: partial.panelCount || this.calculatePanelCount(partial),
      structureHeight: partial.structureHeight || 8,
      projectValue: partial.projectValue || this.estimateProjectValue(partial),
      structureType: partial.structureType || 'gp_structure',
      civilWorkScope: partial.civilWorkScope || 'customer_scope',
      netMeterScope: partial.netMeterScope || 'customer_scope',
      ...partial // Override with any provided values
    };
    
    // Calculate dependent values
    if (!partial.inverterKW && partial.panelWatts && partial.panelCount) {
      defaults.inverterKW = this.calculateInverterKW(partial.panelWatts, partial.panelCount);
    }
    
    return defaults;
  }
  
  private static calculatePanelCount(partial: Partial<OnGridConfig>): number {
    if (partial.projectValue) {
      // Estimate based on project value (₹68,000 per kW, 540W panels)
      const estimatedKW = partial.projectValue / 68000;
      return Math.ceil((estimatedKW * 1000) / 540);
    }
    return 10; // Default 5kW system with 540W panels
  }
}
```

### Phase 2: Unified Quotation Builder with Site Visit Integration (4 weeks)

#### 2.1 Site Visit → Quotation Generator
```typescript
// CORRECTED: Proper integration with existing site visit data
export class SiteVisitQuotationGenerator {
  static async generateFromSiteVisit(siteVisitId: string): Promise<QuotationDraft[]> {
    const siteVisit = await SiteVisitService.getById(siteVisitId);
    const analysis = SiteVisitDataAnalyzer.analyzeCompleteness(siteVisit);
    const quotations: QuotationDraft[] = [];
    
    // Generate quotation for each project type found in site visit
    for (const projectAnalysis of analysis.projectTypes) {
      const quotation = await this.generateSingleQuotation(
        siteVisit, 
        projectAnalysis.type,
        projectAnalysis
      );
      quotations.push(quotation);
    }
    
    return quotations;
  }
  
  private static async generateSingleQuotation(
    siteVisit: SiteVisit,
    projectType: string,
    analysis: ProjectAnalysis
  ): Promise<QuotationDraft> {
    // Extract project-specific config from site visit
    const partialConfig = this.extractProjectConfig(siteVisit.marketingData, projectType);
    
    // Generate intelligent defaults for missing fields
    const completeConfig = SmartDefaultEngine.generateDefaults(projectType, partialConfig);
    
    // Calculate pricing based on complete configuration
    const pricing = PricingEngine.calculate(projectType, completeConfig);
    
    // Generate Bill of Materials
    const bom = BOMGenerator.generate(projectType, completeConfig);
    
    // Create quotation draft
    return {
      // Customer details from site visit
      customerId: siteVisit.customer.id,
      customerName: siteVisit.customer.name,
      customerMobile: siteVisit.customer.mobile,
      customerAddress: siteVisit.customer.address,
      propertyType: siteVisit.customer.propertyType,
      
      // Link to source site visit
      siteVisitId: siteVisit.id,
      sourceVisitDate: siteVisit.createdAt,
      sourceVisitPurpose: siteVisit.visitPurpose,
      
      // Project configuration
      projectType: projectType,
      systemCapacity: this.calculateCapacity(completeConfig),
      projectTitle: this.generateProjectTitle(projectType, completeConfig),
      
      // Technical specifications from site visit
      technicalRequirements: this.extractTechnicalRequirements(
        siteVisit.technicalData, 
        siteVisit.marketingData
      ),
      
      // Installation scope from admin data
      installationScope: this.extractInstallationScope(siteVisit.adminData),
      
      // Configuration details
      systemConfiguration: completeConfig,
      
      // Financial calculations
      pricing: pricing,
      
      // Generated components
      billOfMaterials: bom,
      warranties: WarrantyEngine.generate(projectType, completeConfig),
      
      // Completion tracking
      dataCompleteness: analysis.completeness,
      missingFields: analysis.missingFields,
      needsReview: analysis.criticalMissing.length > 0,
      
      // Status
      status: 'draft',
      createdBy: siteVisit.createdBy,
      createdAt: new Date()
    };
  }
}
```

#### 2.2 Enhanced Quotation Builder UI
```typescript
// CORRECTED: Handle partial data from site visit
const QuotationBuilder = ({ 
  siteVisitId, 
  initialQuotations, 
  mode = 'site_visit_completion' 
}) => {
  const [quotations, setQuotations] = useState<QuotationDraft[]>(initialQuotations);
  const [activeTab, setActiveTab] = useState(0);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>({});
  
  const activeQuotation = quotations[activeTab];
  
  return (
    <div className="quotation-builder">
      {/* Site Visit Context Header */}
      {mode === 'site_visit_completion' && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Site Visit Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Visit Date</p>
                <p className="font-medium">{formatDate(initialQuotations[0]?.sourceVisitDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Completeness</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${activeQuotation.dataCompleteness * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{Math.round(activeQuotation.dataCompleteness * 100)}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Missing Critical Fields</p>
                <p className="font-medium text-orange-600">{activeQuotation.missingFields?.length || 0} fields</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Project Tabs */}
      <Tabs value={activeTab.toString()} onValueChange={(v) => setActiveTab(parseInt(v))}>
        <TabsList className="grid w-full grid-cols-auto">
          {quotations.map((quotation, index) => (
            <TabsTrigger key={index} value={index.toString()} className="relative">
              {quotation.projectTitle}
              {quotation.needsReview && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {quotations.map((quotation, index) => (
          <TabsContent key={index} value={index.toString()}>
            <QuotationFormSections
              quotation={quotation}
              onUpdate={(updates) => updateQuotation(index, updates)}
              completionStatus={completionStatus[index]}
              showCompletionHints={quotation.needsReview}
            />
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Completion Assistant */}
      {activeQuotation.needsReview && (
        <CompletionAssistant
          quotation={activeQuotation}
          onFieldComplete={(field) => markFieldComplete(activeTab, field)}
        />
      )}
      
      {/* Actions */}
      <div className="flex justify-between mt-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveDraft}>
            Save Draft
          </Button>
          <Button variant="outline" onClick={previewQuotation}>
            Preview
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={generatePDF}
            disabled={!isQuotationComplete(activeQuotation)}
          >
            Generate PDF
          </Button>
          <Button 
            onClick={sendToCustomer}
            disabled={!isQuotationComplete(activeQuotation)}
          >
            Send to Customer
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### Phase 3: Template Engine with Exact Format Matching (3 weeks)

#### 3.1 Template System Matching Your Format
```typescript
// CORRECTED: Match exact format from your provided template
export class ExactTemplateEngine {
  static generateOnGridQuotation(quotation: QuotationDraft): string {
    // Match your exact format structure
    const template = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Quotation - ${quotation.quotationNumber}</title>
        <style>
            /* Exact styling to match your company format */
            .header { /* Company header styling */ }
            .quotation-content { /* Content styling */ }
            .pricing-table { /* Pricing table styling */ }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="prakash-green-energy-logo.png" alt="Company Logo">
            <div class="company-info">
                <h1>PRAKASH GREEN ENERGY</h1>
                <p>Complete Solar Solution Provider</p>
                <p>Contact: +91-XXXXXXXXXX | Email: info@prakashgreenenergy.com</p>
            </div>
        </div>
        
        <div class="quotation-content">
            <p><strong>Date:</strong> ${formatDate(quotation.createdAt)}</p>
            <p><strong>To:</strong> ${quotation.customerName}</p>
            <p><strong>Mobile:</strong> ${quotation.customerMobile}</p>
            <p><strong>Address:</strong> ${quotation.customerAddress}</p>
            
            <p>Dear Sir,</p>
            
            <p><strong>Sub:</strong> Requirement of ${quotation.systemCapacity} ${quotation.projectType.replace('_', '-')} Solar Power Generation System - Reg</p>
            
            <p><strong>Ref:</strong> Discussion with ${quotation.createdBy} on ${formatDate(quotation.sourceVisitDate)}</p>
            
            <div class="introduction">
                <p>We are pleased to submit our quotation for ${quotation.projectTitle} as per your requirements discussed during our site visit.</p>
            </div>
            
            <h2>${quotation.projectTitle}</h2>
            
            <div class="pricing-summary">
                <p><strong>Total Amount ₹${quotation.pricing.totalSystemCost.toLocaleString()} – Subsidy Amount ₹${quotation.pricing.subsidyAmount.toLocaleString()} = ₹${quotation.pricing.customerPayment.toLocaleString()}</strong></p>
                <p>${quotation.systemCapacity} Subsidy ₹${quotation.pricing.subsidyAmount.toLocaleString()} Will be Credited to The Customer's Account</p>
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
                    ${quotation.billOfMaterials.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.item}</td>
                        <td>${item.specification}</td>
                        <td>${item.quantity}</td>
                        <td>${item.unit}</td>
                        <td>₹${(item.amount || 0).toLocaleString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="terms-conditions">
                <h3>Terms & Conditions</h3>
                
                <h4>Warranty Details:</h4>
                <p><em>***Physical Damages will not be Covered***</em></p>
                
                ${quotation.warranties.map(warranty => `
                <div class="warranty-section">
                    <h5>${warranty.component.replace('_', ' ')}</h5>
                    <ul>
                        <li>${warranty.manufacturingWarranty} Manufacturing defect Warranty</li>
                        <li>${warranty.serviceWarranty} Service Warranty</li>
                        ${warranty.performanceWarranty ? `<li>${warranty.performanceWarranty}</li>` : ''}
                    </ul>
                </div>
                `).join('')}
                
                <h4>Payment Details:</h4>
                <ul>
                    <li>90% Advance Along with Purchase Order</li>
                    <li>10% After completion of work</li>
                </ul>
                
                <h4>Delivery Period:</h4>
                <p>2-3 Weeks from order confirmation</p>
                
                <h4>Our Scope of Work:</h4>
                ${this.generateCompanyScope(quotation)}
                
                <h4>Customer's Scope of Work:</h4>
                ${this.generateCustomerScope(quotation)}
            </div>
        </div>
    </body>
    </html>
    `;
    
    return template;
  }
  
  private static generateCompanyScope(quotation: QuotationDraft): string {
    // Generate scope based on configuration
    const scopes = [];
    
    if (quotation.systemConfiguration.civilWorkScope === 'company_scope') {
      scopes.push('<p><strong>Structure:</strong> South facing slant mounting 4-5 feet</p>');
    }
    
    if (quotation.systemConfiguration.netMeterScope === 'company_scope') {
      scopes.push('<p><strong>Net Metering:</strong> Complete net metering setup and documentation</p>');
    }
    
    scopes.push('<p><strong>Installation:</strong> Complete system installation and commissioning</p>');
    scopes.push('<p><strong>Testing:</strong> Performance testing and documentation</p>');
    
    return scopes.join('');
  }
  
  private static generateCustomerScope(quotation: QuotationDraft): string {
    const scopes = [];
    
    if (quotation.systemConfiguration.civilWorkScope === 'customer_scope') {
      scopes.push('<p><strong>Civil Work:</strong> Earth pit digging, 1 feet chamber</p>');
    }
    
    if (quotation.systemConfiguration.netMeterScope === 'customer_scope') {
      scopes.push('<p><strong>EB Office Work:</strong> Net meter application and approvals</p>');
    }
    
    scopes.push('<p><strong>Electricity:</strong> AC & DC point near inverter location</p>');
    scopes.push('<p><strong>Documentation:</strong> Property documents for subsidies</p>');
    
    return scopes.join('');
  }
}
```

### Phase 4: Accurate Pricing Engine (2 weeks)

#### 4.1 Precise Pricing Calculations
```typescript
// CORRECTED: Match your exact pricing structure
export class PrecisePricingEngine {
  // Based on your sample: 3kW = ₹2,04,000 (₹68,000/kW)
  private static readonly PRICING_RULES = {
    on_grid: {
      pricePerKW: 68000,        // Your exact rate
      subsidyPerKW: 26000,      // Government fixed rate
      maxSubsidyKW: 10,         // Maximum capacity for subsidy
      advancePercent: 90,       // 90% advance payment
      balancePercent: 10        // 10% balance payment
    },
    off_grid: {
      pricePerKW: 85000,        // Higher due to batteries
      subsidyPerKW: 0,          // No government subsidy
      maxSubsidyKW: 0,
      advancePercent: 90,
      balancePercent: 10
    },
    hybrid: {
      pricePerKW: 95000,        // Premium for hybrid functionality
      subsidyPerKW: 26000,      // Grid portion gets subsidy
      maxSubsidyKW: 10,
      advancePercent: 90,
      balancePercent: 10
    },
    water_heater: {
      pricePerLitre: 80,        // ₹80 per litre
      fixedInstallation: 5000,  // Fixed installation cost
      subsidyPerLitre: 15,      // Government subsidy
      advancePercent: 90,
      balancePercent: 10
    },
    water_pump: {
      pricePerHP: 25000,        // ₹25,000 per HP
      subsidyPerHP: 0,          // No subsidy
      advancePercent: 90,
      balancePercent: 10
    }
  };
  
  static calculate(projectType: string, config: any): PricingResult {
    const rules = this.PRICING_RULES[projectType];
    
    switch (projectType) {
      case 'on_grid':
        return this.calculateOnGrid(config, rules);
      case 'off_grid':
        return this.calculateOffGrid(config, rules);
      case 'hybrid':
        return this.calculateHybrid(config, rules);
      case 'water_heater':
        return this.calculateWaterHeater(config, rules);
      case 'water_pump':
        return this.calculateWaterPump(config, rules);
      default:
        throw new Error(`Unknown project type: ${projectType}`);
    }
  }
  
  private static calculateOnGrid(config: OnGridConfig, rules: any): PricingResult {
    // Calculate system capacity from panel specifications
    const panelWattage = parseInt(config.panelWatts.replace('W', ''));
    const systemWattage = panelWattage * config.panelCount;
    const systemKW = systemWattage / 1000;
    
    // Calculate costs
    const totalSystemCost = Math.round(systemKW * rules.pricePerKW);
    const eligibleKW = Math.min(systemKW, rules.maxSubsidyKW);
    const subsidyAmount = Math.round(eligibleKW * rules.subsidyPerKW);
    const customerPayment = totalSystemCost - subsidyAmount;
    const advanceAmount = Math.round(customerPayment * (rules.advancePercent / 100));
    const balanceAmount = customerPayment - advanceAmount;
    
    return {
      systemCapacity: `${systemKW}kW`,
      totalSystemCost,
      subsidyAmount,
      customerPayment,
      advanceAmount,
      balanceAmount,
      pricePerKW: rules.pricePerKW,
      subsidyPerKW: rules.subsidyPerKW,
      calculations: {
        panelWattage,
        panelCount: config.panelCount,
        systemWattage,
        systemKW,
        eligibleKW
      }
    };
  }
  
  // Similar precise calculations for other project types...
}
```

---

## IMPLEMENTATION TIMELINE (CORRECTED)

| Phase | Duration | Key Deliverable | Site Visit Integration |
|-------|----------|-----------------|------------------------|
| Phase 1 | 3 weeks | Site Visit Data Analysis & Smart Defaults | ✅ Full integration |
| Phase 2 | 4 weeks | Unified Quotation Builder with Completion | ✅ Partial data handling |
| Phase 3 | 3 weeks | Exact Template Format Matching | ✅ Your format output |
| Phase 4 | 2 weeks | Precise Pricing Engine | ✅ Accurate calculations |
| **Total** | **12 weeks** | **Complete Working System** | **✅ End-to-end workflow** |

---

## CRITICAL SUCCESS FACTORS

1. **Data Flow Integrity**: Site visit data must seamlessly flow to quotation completion
2. **Partial Data Handling**: System must work with incomplete site visit data
3. **Format Accuracy**: Final output must exactly match your provided template
4. **Calculation Precision**: Pricing must match your business rules (₹68,000/kW, etc.)
5. **Multiple Project Support**: Handle multiple quotations from single site visit
6. **User Experience**: Smooth completion workflow for sales team

This corrected plan addresses your specific concern about the site visit → quotation integration workflow that was completely missing from the original implementation plan.