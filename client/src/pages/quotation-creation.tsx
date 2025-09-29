import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  AlertTriangle, 
  Plus,
  Search,
  FileText,
  Calculator,
  User,
  Settings,
  Zap,
  Battery,
  Droplets,
  Wrench,
  Info,
  Sun
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  insertQuotationSchema, 
  type InsertQuotation, 
  type QuotationProject,
  quotationProjectSchema,
  quotationFollowUpSchema,
  siteVisitMappingSchema,
  solarPanelBrands,
  inverterMakes,
  panelWatts,
  inverterWatts,
  inverterPhases,
  earthingTypes,
  floorLevels,
  structureTypes,
  monoRailOptions,
  heightRange,
  workScopeOptions,
  propertyTypes,
  customerDetailsSchema
} from "@shared/schema";

// Create extended project schema with GST fields
const quotationProjectSchemaWithGST = quotationProjectSchema.and(z.object({
  gstAmount: z.number().min(0).default(0),
  totalWithGST: z.number().min(0).default(0)
}));

// Use the proper quotation schema for validation
const quotationFormSchema = insertQuotationSchema.omit({
  quotationNumber: true, // Generated server-side
  createdAt: true,       // Set server-side
  updatedAt: true        // Set server-side
}).extend({
  // Override for frontend form compatibility
  projects: z.array(quotationProjectSchemaWithGST).min(1, "At least one project is required"),
  followUps: z.array(quotationFollowUpSchema).default([]),
  siteVisitMapping: siteVisitMappingSchema.optional(),
  // Add temporary customer data fields for site visit forms
  customerData: customerDetailsSchema.optional(),
  // Add GST-related total fields
  totalGSTAmount: z.number().min(0).default(0),
  totalWithGST: z.number().min(0).default(0)
});

type QuotationFormData = z.infer<typeof quotationFormSchema>;

// Wizard steps configuration
const WIZARD_STEPS = [
  { 
    id: "source", 
    title: "Source Selection", 
    description: "Choose how to create this quotation",
    icon: Search
  },
  { 
    id: "customer", 
    title: "Customer Details", 
    description: "Customer information and contact details",
    icon: User
  },
  { 
    id: "projects", 
    title: "Project Configuration", 
    description: "Solar systems and project specifications",
    icon: Zap
  },
  { 
    id: "pricing", 
    title: "Pricing & Terms", 
    description: "Costs, payments, and delivery terms",
    icon: Calculator
  },
  { 
    id: "review", 
    title: "Review & Submit", 
    description: "Final review before creating quotation",
    icon: FileText
  }
];

// Business rules from the directive
const BUSINESS_RULES = {
  pricing: {
    onGridPerKW: 68000,
    offGridPerKW: 85000,  // Off-grid costs more due to battery storage
    hybridPerKW: 95000,   // Hybrid costs most due to dual functionality
    waterPumpPerHP: 45000, // Water pump pricing per HP
    waterHeaterPerLitre: 350 // Water heater pricing per litre
  },
  subsidy: {
    onGridPerKW: 26000,
    hybridPerKW: 15000,   // Reduced subsidy for hybrid systems
    offGridPerKW: 0,
    waterHeater: 0.3,     // 30% subsidy up to max ₹20,000
    waterPump: 0.4        // 40% subsidy for agricultural use
  },
  payment: {
    advancePercentage: 90,
    balancePercentage: 10
  },
  gst: {
    percentage: 18        // 18% GST as per backend implementation
  }
};

// Site visit mapping interface
interface SiteVisitMapping {
  id: string;
  customer: {
    name: string;
    mobile: string;
    address: string;
  };
  visitOutcome: string;
  completenessAnalysis: {
    completenessScore: number;
    missingCriticalFields: string[];
    missingImportantFields: string[];
    missingOptionalFields: string[];
    qualityGrade: string;
    canCreateQuotation: boolean;
    recommendedAction: string;
  };
}

// Site Visit Customer Details Form Component
function SiteVisitCustomerDetailsForm({ form, siteVisitMapping, fallbackSiteVisitData }: { form: any; siteVisitMapping: any; fallbackSiteVisitData?: any }) {
  const [customerState, setCustomerState] = useState<any>({});

  // Extract customer data from site visit mapping with updated structure - be very flexible
  const siteVisitCustomerData = siteVisitMapping?.originalSiteVisitData?.customer ?? 
                                siteVisitMapping?.customer ?? 
                                siteVisitMapping?.originalSiteVisitData?.customerData ??
                                fallbackSiteVisitData?.customer ?? 
                                fallbackSiteVisitData?.customerData ??
                                {};

  useEffect(() => {
    // Initialize customer state with site visit data
    const initialCustomerData = {
      name: siteVisitCustomerData.name || "",
      mobile: siteVisitCustomerData.mobile || "",
      address: siteVisitCustomerData.address || "",
      ebServiceNumber: siteVisitCustomerData.ebServiceNumber || "",
      propertyType: siteVisitCustomerData.propertyType || "",
      location: siteVisitCustomerData.location || ""
    };
    
    setCustomerState(initialCustomerData);
    
    // Update form with customer data
    form.setValue("customerData", initialCustomerData);
    
    // Set the real customerId from the mapping response, not sentinel values
    if (siteVisitMapping?.quotationData?.customerId) {
      form.setValue("customerId", siteVisitMapping.quotationData.customerId);
    } else if (siteVisitCustomerData.id) {
      form.setValue("customerId", siteVisitCustomerData.id);
    }
    // If no customer ID available, the backend will create/find the customer during submission
  }, [siteVisitMapping, form, siteVisitCustomerData]);

  const updateCustomerField = (field: string, value: any) => {
    const updatedCustomerData = { ...customerState, [field]: value };
    setCustomerState(updatedCustomerData);
    form.setValue("customerData", updatedCustomerData);
    
    // Keep the real customerId from mapping response, don't overwrite with sentinel strings
    // The backend will handle customer ID resolution when the quotation is submitted
  };

  const isFieldFromSiteVisit = (field: string) => {
    const value = siteVisitCustomerData[field];
    return value && typeof value === 'string' && value.trim() !== "";
  };

  const renderFieldStatus = (field: string) => {
    if (isFieldFromSiteVisit(field)) {
      return (
        <Badge variant="secondary" className="text-xs ml-2">
          <Check className="h-3 w-3 mr-1" />
          From Site Visit
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs ml-2 text-orange-600">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Needs Input
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Site Visit Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Customer information has been pre-filled from the site visit. You can review and complete any missing details below.
        </AlertDescription>
      </Alert>

      {/* Customer Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Name */}
        <div className="space-y-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">Customer Name *</label>
            {renderFieldStatus("name")}
          </div>
          <Input
            value={customerState.name || ""}
            onChange={(e) => updateCustomerField("name", e.target.value)}
            placeholder="Enter customer name"
            className={isFieldFromSiteVisit("name") ? "bg-green-50 border-green-200" : ""}
            data-testid="input-customer-name"
          />
          {!customerState.name && (
            <p className="text-xs text-red-600">Customer name is required</p>
          )}
        </div>

        {/* Mobile Number */}
        <div className="space-y-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">Mobile Number *</label>
            {renderFieldStatus("mobile")}
          </div>
          <Input
            value={customerState.mobile || ""}
            onChange={(e) => updateCustomerField("mobile", e.target.value)}
            placeholder="Enter mobile number"
            className={isFieldFromSiteVisit("mobile") ? "bg-green-50 border-green-200" : ""}
            data-testid="input-customer-mobile"
          />
          {!customerState.mobile && (
            <p className="text-xs text-red-600">Mobile number is required</p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">Address *</label>
            {renderFieldStatus("address")}
          </div>
          <Textarea
            value={customerState.address || ""}
            onChange={(e) => updateCustomerField("address", e.target.value)}
            placeholder="Enter customer address"
            className={isFieldFromSiteVisit("address") ? "bg-green-50 border-green-200" : ""}
            data-testid="textarea-customer-address"
          />
          {!customerState.address && (
            <p className="text-xs text-red-600">Address is required</p>
          )}
        </div>

        {/* Property Type */}
        <div className="space-y-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">Property Type *</label>
            {renderFieldStatus("propertyType")}
          </div>
          <Select value={customerState.propertyType || undefined} onValueChange={(value) => updateCustomerField("propertyType", value)}>
            <SelectTrigger 
              className={isFieldFromSiteVisit("propertyType") ? "bg-green-50 border-green-200" : ""}
              data-testid="select-property-type"
            >
              <SelectValue placeholder="Select property type" />
            </SelectTrigger>
            <SelectContent>
              {propertyTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!customerState.propertyType && (
            <p className="text-xs text-red-600">Property type is required</p>
          )}
        </div>

        {/* EB Service Number */}
        <div className="space-y-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">EB Service Number</label>
            {renderFieldStatus("ebServiceNumber")}
          </div>
          <Input
            value={customerState.ebServiceNumber || ""}
            onChange={(e) => updateCustomerField("ebServiceNumber", e.target.value)}
            placeholder="Enter EB service number (optional)"
            className={isFieldFromSiteVisit("ebServiceNumber") ? "bg-green-50 border-green-200" : ""}
            data-testid="input-eb-service-number"
          />
        </div>

        {/* Location */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">Customer Location</label>
            {renderFieldStatus("location")}
          </div>
          <Input
            value={customerState.location || ""}
            onChange={(e) => updateCustomerField("location", e.target.value)}
            placeholder="Enter specific location details (optional)"
            className={isFieldFromSiteVisit("location") ? "bg-green-50 border-green-200" : ""}
            data-testid="input-customer-location"
          />
        </div>
      </div>

      {/* Missing Fields Summary */}
      {siteVisitMapping?.completenessAnalysis && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-blue-600" />
              Site Visit Data Completeness
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completeness Score</span>
              <Badge variant="outline">
                {siteVisitMapping.completenessAnalysis.completenessScore}% Complete
              </Badge>
            </div>
            
            {siteVisitMapping.completenessAnalysis.missingCriticalFields?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <p className="text-sm font-medium text-red-800 mb-1">Missing Critical Fields:</p>
                <p className="text-xs text-red-600">
                  {siteVisitMapping.completenessAnalysis.missingCriticalFields.join(", ")}
                </p>
              </div>
            )}
            
            {siteVisitMapping.completenessAnalysis.missingImportantFields?.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                <p className="text-sm font-medium text-yellow-800 mb-1">Missing Important Fields:</p>
                <p className="text-xs text-yellow-600">
                  {siteVisitMapping.completenessAnalysis.missingImportantFields.join(", ")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Alert>
        <User className="h-4 w-4" />
        <AlertDescription>
          Fields marked with a green background were captured during the site visit. 
          Please complete any missing required fields marked in orange to proceed.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Manual Project Configuration Component
function ManualProjectConfiguration({ form }: { form: any }) {
  const [selectedProjectType, setSelectedProjectType] = useState<string | null>(null);
  const [activeProjectIndex, setActiveProjectIndex] = useState<number | null>(null);

  const projects = form.watch("projects") || [];

  const addProject = (projectType: string) => {
    const currentProjects = form.getValues("projects") || [];
    let newProject: any = {
      projectType,
      projectValue: 0,
      subsidyAmount: 0,
      customerPayment: 0
    };

    // Add default fields based on project type
    switch (projectType) {
      case "on_grid":
        newProject = {
          ...newProject,
          systemKW: 1,
          pricePerKW: BUSINESS_RULES.pricing.onGridPerKW,
          solarPanelMake: [],
          panelWatts: "530",
          panelCount: 1,
          inverterMake: [],
          inverterWatts: "3kw",
          inverterKW: 3,
          inverterQty: 1,
          inverterPhase: "single_phase",
          lightningArrest: false,
          earth: "dc",
          floor: "0",
          structureHeight: 0,
          structureType: "gp_structure",
          gpStructure: {
            lowerEndHeight: "0",
            higherEndHeight: "0"
          },
          monoRail: {
            type: "mini_rail"
          },
          civilWorkScope: "customer_scope",
          netMeterScope: "customer_scope",
          others: ""
        };
        break;
      case "off_grid":
        newProject = {
          ...newProject,
          systemKW: 1,
          pricePerKW: BUSINESS_RULES.pricing.offGridPerKW,
          solarPanelMake: [],
          panelWatts: "530",
          panelCount: 1,
          inverterMake: [],
          inverterWatts: "3kw",
          inverterKW: 3,
          inverterQty: 1,
          inverterPhase: "single_phase",
          lightningArrest: false,
          earth: "dc",
          floor: "0",
          structureHeight: 0,
          structureType: "gp_structure",
          batteryBrand: "exide",
          batteryType: "lead_acid",
          batteryAH: "100",
          voltage: 12,
          batteryCount: 1,
          batteryStands: 1,
          electricalWorkScope: "customer_scope",
          civilWorkScope: "customer_scope",
          others: ""
        };
        break;
      case "hybrid":
        newProject = {
          ...newProject,
          systemKW: 1,
          pricePerKW: BUSINESS_RULES.pricing.hybridPerKW,
          solarPanelMake: [],
          panelWatts: "530",
          panelCount: 1,
          inverterMake: [],
          inverterWatts: "3kw",
          inverterKW: 3,
          inverterQty: 1,
          inverterPhase: "single_phase",
          lightningArrest: false,
          earth: "dc",
          floor: "0",
          structureHeight: 0,
          structureType: "gp_structure",
          batteryBrand: "exide",
          batteryType: "lead_acid",
          batteryAH: "100",
          voltage: 12,
          batteryCount: 1,
          batteryStands: 1,
          electricalWorkScope: "customer_scope",
          netMeterScope: "customer_scope",
          others: ""
        };
        break;
      case "water_heater":
        newProject = {
          ...newProject,
          brand: "venus",
          litre: 100,
          heatingCoil: "",
          floor: "0",
          plumbingWorkScope: "customer_scope",
          civilWorkScope: "customer_scope",
          others: ""
        };
        break;
      case "water_pump":
        newProject = {
          ...newProject,
          hp: "1",
          drive: "vfd",
          structureHeight: 0,
          structureType: "gp_structure",
          panelBrand: [],
          panelCount: 1,
          gpStructure: {
            lowerEndHeight: "0",
            higherEndHeight: "0"
          },
          monoRail: {
            type: "mini_rail"
          },
          plumbingWorkScope: "customer_scope",
          civilWorkScope: "customer_scope",
          others: ""
        };
        break;
    }

    // Define subsidy mapping for safe lookups
    const subsidyMapping = {
      "on_grid": "onGridPerKW",
      "off_grid": "offGridPerKW", 
      "hybrid": "hybridPerKW",
      "water_heater": null, // No subsidy
      "water_pump": null    // No subsidy
    } as const;

    // Calculate initial pricing for all project types
    if (["on_grid", "off_grid", "hybrid"].includes(projectType)) {
      const baseValue = newProject.systemKW * newProject.pricePerKW;
      const gstAmount = baseValue * (BUSINESS_RULES.gst.percentage / 100);
      newProject.projectValue = baseValue;
      newProject.gstAmount = gstAmount;
      newProject.totalWithGST = baseValue + gstAmount;
      
      // Get subsidy key safely with validation
      const subsidyKey = subsidyMapping[projectType as keyof typeof subsidyMapping];
      if (subsidyKey && BUSINESS_RULES.subsidy[subsidyKey] !== undefined) {
        newProject.subsidyAmount = newProject.systemKW * BUSINESS_RULES.subsidy[subsidyKey];
      } else {
        newProject.subsidyAmount = 0;
      }
      
      newProject.customerPayment = newProject.totalWithGST - newProject.subsidyAmount;
    } else if (projectType === "water_heater") {
      // Set default pricing for water heater based on capacity
      const baseValue = newProject.litre * BUSINESS_RULES.pricing.waterHeaterPerLitre;
      const gstAmount = baseValue * (BUSINESS_RULES.gst.percentage / 100);
      newProject.projectValue = baseValue;
      newProject.gstAmount = gstAmount;
      newProject.totalWithGST = baseValue + gstAmount;
      // Calculate subsidy: 30% up to max ₹20,000
      const maxSubsidy = Math.min(newProject.projectValue * BUSINESS_RULES.subsidy.waterHeater, 20000);
      newProject.subsidyAmount = maxSubsidy;
      newProject.customerPayment = newProject.totalWithGST - newProject.subsidyAmount;
    } else if (projectType === "water_pump") {
      // Set default pricing for water pump based on HP
      const hpValue = parseFloat(newProject.hp) || 1;
      const baseValue = hpValue * BUSINESS_RULES.pricing.waterPumpPerHP;
      const gstAmount = baseValue * (BUSINESS_RULES.gst.percentage / 100);
      newProject.projectValue = baseValue;
      newProject.gstAmount = gstAmount;
      newProject.totalWithGST = baseValue + gstAmount;
      // Calculate subsidy: 40% for agricultural use
      newProject.subsidyAmount = newProject.projectValue * BUSINESS_RULES.subsidy.waterPump;
      newProject.customerPayment = newProject.totalWithGST - newProject.subsidyAmount;
    } else {
      // Fallback for unknown project types
      console.error(`Unknown project type: ${projectType}`);
      newProject.projectValue = 0;
      newProject.subsidyAmount = 0;
      newProject.customerPayment = 0;
    }

    form.setValue("projects", [...currentProjects, newProject]);
    setActiveProjectIndex(currentProjects.length);
    setSelectedProjectType(null);
  };

  const removeProject = (index: number) => {
    const currentProjects = form.getValues("projects") || [];
    const updatedProjects = currentProjects.filter((_: any, i: number) => i !== index);
    form.setValue("projects", updatedProjects);
    setActiveProjectIndex(null);
  };

  const updateProject = (index: number, updatedData: any) => {
    const currentProjects = form.getValues("projects") || [];
    const updatedProjects = [...currentProjects];
    updatedProjects[index] = { ...updatedProjects[index], ...updatedData };

    // Define subsidy mapping for safe lookups (same as in addProject)
    const subsidyMapping = {
      "on_grid": "onGridPerKW",
      "off_grid": "offGridPerKW", 
      "hybrid": "hybridPerKW",
      "water_heater": null, // No subsidy
      "water_pump": null    // No subsidy
    } as const;

    // Recalculate pricing for all project types
    const project = updatedProjects[index];
    
    if (["on_grid", "off_grid", "hybrid"].includes(project.projectType)) {
      const baseValue = project.systemKW * project.pricePerKW;
      const gstAmount = baseValue * (BUSINESS_RULES.gst.percentage / 100);
      project.projectValue = baseValue;
      project.gstAmount = gstAmount;
      project.totalWithGST = baseValue + gstAmount;
      
      // Get subsidy key safely with validation
      const subsidyKey = subsidyMapping[project.projectType as keyof typeof subsidyMapping];
      if (subsidyKey && BUSINESS_RULES.subsidy[subsidyKey] !== undefined) {
        project.subsidyAmount = project.systemKW * BUSINESS_RULES.subsidy[subsidyKey];
      } else {
        project.subsidyAmount = 0;
      }
      
      project.customerPayment = project.totalWithGST - project.subsidyAmount;
    } else if (project.projectType === "water_heater") {
      // Recalculate pricing for water heater
      if (updatedData.hasOwnProperty('projectValue')) {
        // If project value is directly updated, recalculate GST, subsidy and payment
        const gstAmount = project.projectValue * (BUSINESS_RULES.gst.percentage / 100);
        project.gstAmount = gstAmount;
        project.totalWithGST = project.projectValue + gstAmount;
        const maxSubsidy = Math.min(project.projectValue * BUSINESS_RULES.subsidy.waterHeater, 20000);
        project.subsidyAmount = maxSubsidy;
        project.customerPayment = project.totalWithGST - project.subsidyAmount;
      } else if (updatedData.hasOwnProperty('litre')) {
        // If litre is updated, recalculate based on capacity
        const baseValue = project.litre * BUSINESS_RULES.pricing.waterHeaterPerLitre;
        const gstAmount = baseValue * (BUSINESS_RULES.gst.percentage / 100);
        project.projectValue = baseValue;
        project.gstAmount = gstAmount;
        project.totalWithGST = baseValue + gstAmount;
        const maxSubsidy = Math.min(project.projectValue * BUSINESS_RULES.subsidy.waterHeater, 20000);
        project.subsidyAmount = maxSubsidy;
        project.customerPayment = project.totalWithGST - project.subsidyAmount;
      }
    } else if (project.projectType === "water_pump") {
      // Recalculate pricing for water pump
      if (updatedData.hasOwnProperty('projectValue')) {
        // If project value is directly updated, recalculate GST, subsidy and payment
        const gstAmount = project.projectValue * (BUSINESS_RULES.gst.percentage / 100);
        project.gstAmount = gstAmount;
        project.totalWithGST = project.projectValue + gstAmount;
        project.subsidyAmount = project.projectValue * BUSINESS_RULES.subsidy.waterPump;
        project.customerPayment = project.totalWithGST - project.subsidyAmount;
      } else if (updatedData.hasOwnProperty('hp')) {
        // If HP is updated, recalculate based on HP
        const hpValue = parseFloat(project.hp) || 1;
        const baseValue = hpValue * BUSINESS_RULES.pricing.waterPumpPerHP;
        const gstAmount = baseValue * (BUSINESS_RULES.gst.percentage / 100);
        project.projectValue = baseValue;
        project.gstAmount = gstAmount;
        project.totalWithGST = baseValue + gstAmount;
        project.subsidyAmount = project.projectValue * BUSINESS_RULES.subsidy.waterPump;
        project.customerPayment = project.totalWithGST - project.subsidyAmount;
      }
    } else {
      // Fallback for unknown project types
      console.error(`Unknown project type during update: ${project.projectType}`);
    }

    form.setValue("projects", updatedProjects);
  };

  return (
    <div className="space-y-6">
      {/* Add Project Type Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Project Configuration</h4>
          <Select value={selectedProjectType || ""} onValueChange={setSelectedProjectType}>
            <SelectTrigger className="w-48" data-testid="select-project-type">
              <SelectValue placeholder="Add Project Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on_grid">On-Grid Solar</SelectItem>
              <SelectItem value="off_grid">Off-Grid Solar</SelectItem>
              <SelectItem value="hybrid">Hybrid Solar</SelectItem>
              <SelectItem value="water_heater">Solar Water Heater</SelectItem>
              <SelectItem value="water_pump">Solar Water Pump</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedProjectType && (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => addProject(selectedProjectType)}
              data-testid="button-add-project"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedProjectType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Project
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedProjectType(null)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Project List */}
      {projects.length === 0 && (
        <Alert>
          <Plus className="h-4 w-4" />
          <AlertDescription>
            No projects configured yet. Please add at least one project to continue.
          </AlertDescription>
        </Alert>
      )}

      {projects.length > 0 && (
        <div className="space-y-4">
          <h5 className="font-medium">Configured Projects ({projects.length})</h5>
          <div className="grid gap-4">
            {projects.map((project: any, index: number) => (
              <Card key={index} className={`border transition-colors ${
                activeProjectIndex === index ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {project.projectType === 'on_grid' && <Zap className="h-5 w-5 text-blue-600" />}
                      {project.projectType === 'off_grid' && <Battery className="h-5 w-5 text-green-600" />}
                      {project.projectType === 'hybrid' && <Settings className="h-5 w-5 text-purple-600" />}
                      {project.projectType === 'water_heater' && <Droplets className="h-5 w-5 text-orange-600" />}
                      {project.projectType === 'water_pump' && <Wrench className="h-5 w-5 text-red-600" />}
                      <h4 className="font-medium capitalize">
                        {project.projectType.replace('_', ' ')} System
                      </h4>
                      <Badge variant="outline">
                        ₹{project.projectValue?.toLocaleString() || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveProjectIndex(activeProjectIndex === index ? null : index)}
                        data-testid={`button-configure-project-${index}`}
                      >
                        {activeProjectIndex === index ? 'Collapse' : 'Configure'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeProject(index)}
                        data-testid={`button-remove-project-${index}`}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {activeProjectIndex === index && (
                  <CardContent className="pt-0">
                    <ProjectConfigurationForm
                      project={project}
                      projectIndex={index}
                      onUpdate={(updatedData) => updateProject(index, updatedData)}
                    />
                  </CardContent>
                )}

                {activeProjectIndex !== index && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {project.systemKW && (
                        <div>
                          <span className="text-muted-foreground">System Capacity:</span>
                          <div className="font-medium">{project.systemKW} kW</div>
                        </div>
                      )}
                      {project.panelCount && (
                        <div>
                          <span className="text-muted-foreground">Solar Panels:</span>
                          <div className="font-medium">{project.panelCount} panels</div>
                        </div>
                      )}
                      {project.subsidyAmount > 0 && (
                        <div>
                          <span className="text-muted-foreground">Govt. Subsidy:</span>
                          <div className="font-medium text-green-600">₹{project.subsidyAmount.toLocaleString()}</div>
                        </div>
                      )}
                      {project.customerPayment && (
                        <div>
                          <span className="text-muted-foreground">Customer Payment:</span>
                          <div className="font-medium">₹{project.customerPayment.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Project Configuration Form Component
function ProjectConfigurationForm({ project, projectIndex, onUpdate }: {
  project: any;
  projectIndex: number;
  onUpdate: (data: any) => void;
}) {
  const handleFieldChange = (field: string, value: any) => {
    onUpdate({ [field]: value });
  };

  const renderSolarSystemFields = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">System Capacity (kW)</label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            value={project.systemKW || 1}
            onChange={(e) => handleFieldChange('systemKW', parseFloat(e.target.value) || 1)}
            data-testid={`input-system-kw-${projectIndex}`}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Price per kW (₹)</label>
          <Input
            type="number"
            min="0"
            value={project.pricePerKW || 0}
            onChange={(e) => handleFieldChange('pricePerKW', parseFloat(e.target.value) || 0)}
            data-testid={`input-price-per-kw-${projectIndex}`}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Solar Panel Make * (Multiple Selection)</label>
          <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
            {solarPanelBrands.map((brand) => (
              <div key={brand} className="flex items-center space-x-2">
                <Checkbox
                  id={`panel-${brand}-${projectIndex}`}
                  checked={project.solarPanelMake?.includes(brand) || false}
                  onCheckedChange={(checked) => {
                    const currentMakes = project.solarPanelMake || [];
                    const newMakes = checked 
                      ? [...currentMakes, brand]
                      : currentMakes.filter((m: string) => m !== brand);
                    handleFieldChange('solarPanelMake', newMakes);
                  }}
                />
                <label htmlFor={`panel-${brand}-${projectIndex}`} className="text-sm">
                  {brand.replace('_', ' ').toUpperCase()}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Panel Watts</label>
          <Select value={project.panelWatts || "530"} onValueChange={(value) => handleFieldChange('panelWatts', value)}>
            <SelectTrigger data-testid={`select-panel-watts-${projectIndex}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {panelWatts.map((watts) => (
                <SelectItem key={watts} value={watts}>
                  {watts}W
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Inverter Make * (Multiple Selection)</label>
          <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
            {inverterMakes.map((make) => (
              <div key={make} className="flex items-center space-x-2">
                <Checkbox
                  id={`inverter-${make}-${projectIndex}`}
                  checked={project.inverterMake?.includes(make) || false}
                  onCheckedChange={(checked) => {
                    const currentMakes = project.inverterMake || [];
                    const newMakes = checked 
                      ? [...currentMakes, make]
                      : currentMakes.filter((m: string) => m !== make);
                    handleFieldChange('inverterMake', newMakes);
                  }}
                />
                <label htmlFor={`inverter-${make}-${projectIndex}`} className="text-sm">
                  {make.toUpperCase()}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Inverter Watts</label>
          <Select value={project.inverterWatts || "3kw"} onValueChange={(value) => handleFieldChange('inverterWatts', value)}>
            <SelectTrigger data-testid={`select-inverter-watts-${projectIndex}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {inverterWatts.map((watts) => (
                <SelectItem key={watts} value={watts}>
                  {watts}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Inverter KW</label>
          <Input
            type="number"
            value={project.inverterKW || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                handleFieldChange('inverterKW', undefined);
              } else {
                handleFieldChange('inverterKW', parseFloat(value) || 0);
              }
            }}
            min="0"
            step="0.1"
            placeholder="Enter inverter KW rating"
            data-testid={`input-inverter-kw-${projectIndex}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Inverter Qty</label>
          <Input
            type="number"
            value={project.inverterQty || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                handleFieldChange('inverterQty', undefined);
              } else {
                handleFieldChange('inverterQty', parseInt(value) || 1);
              }
            }}
            min="1"
            placeholder="Enter inverter quantity"
            data-testid={`input-inverter-qty-${projectIndex}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Inverter Phase</label>
          <Select value={project.inverterPhase || "single_phase"} onValueChange={(value) => handleFieldChange('inverterPhase', value)}>
            <SelectTrigger data-testid={`select-inverter-phase-${projectIndex}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {inverterPhases.map((phase) => (
                <SelectItem key={phase} value={phase}>
                  {phase === 'single_phase' ? 'Single Phase' : 'Three Phase'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Earth Connection</label>
          <Select value={project.earth || "dc"} onValueChange={(value) => handleFieldChange('earth', value)}>
            <SelectTrigger data-testid={`select-earth-${projectIndex}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {earthingTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === 'ac_dc' ? 'AC/DC' : type.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Panel Count</label>
          <Input
            type="number"
            min="1"
            value={project.panelCount || 1}
            onChange={(e) => handleFieldChange('panelCount', parseInt(e.target.value) || 1)}
            data-testid={`input-panel-count-${projectIndex}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Structure Height (ft)</label>
          <Input
            type="number"
            value={project.structureHeight || 0}
            onChange={(e) => handleFieldChange('structureHeight', parseInt(e.target.value) || 0)}
            min="0"
            data-testid={`input-structure-height-${projectIndex}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Floor Level *</label>
          <Select value={project.floor || '0'} onValueChange={(value) => handleFieldChange('floor', value)}>
            <SelectTrigger data-testid={`select-floor-${projectIndex}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {floorLevels.map((floor) => (
                <SelectItem key={floor} value={floor}>
                  {floor === '0' ? 'Ground Floor' : `${floor}${floor === '1' ? 'st' : floor === '2' ? 'nd' : floor === '3' ? 'rd' : 'th'} Floor`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Project Value (₹)</label>
          <Input
            type="number"
            value={project.projectValue || 0}
            onChange={(e) => handleFieldChange('projectValue', parseInt(e.target.value) || 0)}
            min="0"
            data-testid={`input-project-value-${projectIndex}`}
          />
        </div>
      </div>

      {/* Structure Details Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-700">Structure Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Structure Type *</label>
            <Select value={project.structureType || 'gp_structure'} onValueChange={(value) => handleFieldChange('structureType', value)}>
              <SelectTrigger data-testid={`select-structure-type-${projectIndex}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {structureTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'gp_structure' ? 'GP Structure' : 'Mono Rail'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {project.structureType === 'gp_structure' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lower End Height (ft)</label>
                <Select 
                  value={project.gpStructure?.lowerEndHeight || '0'} 
                  onValueChange={(value) => handleFieldChange('gpStructure', { 
                    ...project.gpStructure, 
                    lowerEndHeight: value 
                  })}
                >
                  <SelectTrigger data-testid={`select-lower-height-${projectIndex}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {heightRange.map((height) => (
                      <SelectItem key={height} value={height}>
                        {height} ft
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Higher End Height (ft)</label>
                <Select 
                  value={project.gpStructure?.higherEndHeight || '0'} 
                  onValueChange={(value) => handleFieldChange('gpStructure', { 
                    ...project.gpStructure, 
                    higherEndHeight: value 
                  })}
                >
                  <SelectTrigger data-testid={`select-higher-height-${projectIndex}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {heightRange.map((height) => (
                      <SelectItem key={height} value={height}>
                        {height} ft
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {project.structureType === 'mono_rail' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Mono Rail Type</label>
              <Select 
                value={project.monoRail?.type || 'mini_rail'} 
                onValueChange={(value) => handleFieldChange('monoRail', { 
                  ...project.monoRail, 
                  type: value 
                })}
              >
                <SelectTrigger data-testid={`select-mono-rail-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monoRailOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'mini_rail' ? 'Mini Rail' : 'Long Rail'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Work Scope Section */}
      {project.projectType === 'on_grid' && (
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700">Work Scope</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Civil Work Scope</label>
              <Select value={project.civilWorkScope || 'customer_scope'} onValueChange={(value) => handleFieldChange('civilWorkScope', value)}>
                <SelectTrigger data-testid={`select-civil-work-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workScopeOptions.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope === 'customer_scope' ? 'Customer Scope' : 'Company Scope'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Net Meter Scope</label>
              <Select value={project.netMeterScope || 'customer_scope'} onValueChange={(value) => handleFieldChange('netMeterScope', value)}>
                <SelectTrigger data-testid={`select-net-meter-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workScopeOptions.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope === 'customer_scope' ? 'Customer Scope' : 'Company Scope'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Hybrid specific scope */}
      {project.projectType === 'hybrid' && (
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700">Work Scope</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Electrical Work Scope</label>
              <Select value={project.electricalWorkScope || 'customer_scope'} onValueChange={(value) => handleFieldChange('electricalWorkScope', value)}>
                <SelectTrigger data-testid={`select-electrical-work-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workScopeOptions.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope === 'customer_scope' ? 'Customer Scope' : 'Company Scope'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Net Meter Scope</label>
              <Select value={project.netMeterScope || 'customer_scope'} onValueChange={(value) => handleFieldChange('netMeterScope', value)}>
                <SelectTrigger data-testid={`select-net-meter-hybrid-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workScopeOptions.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope === 'customer_scope' ? 'Customer Scope' : 'Company Scope'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Off-Grid Work Scope Section */}
      {project.projectType === 'off_grid' && (
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700">Work Scope</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Electrical Work Scope</label>
              <Select value={project.electricalWorkScope || 'customer_scope'} onValueChange={(value) => handleFieldChange('electricalWorkScope', value)}>
                <SelectTrigger data-testid={`select-electrical-work-offgrid-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workScopeOptions.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope === 'customer_scope' ? 'Customer Scope' : 'Company Scope'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Civil Work Scope</label>
              <Select value={project.civilWorkScope || 'customer_scope'} onValueChange={(value) => handleFieldChange('civilWorkScope', value)}>
                <SelectTrigger data-testid={`select-civil-work-offgrid-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workScopeOptions.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope === 'customer_scope' ? 'Customer Scope' : 'Company Scope'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Lightning Arrestor */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`lightningArrest-${projectIndex}`}
          checked={project.lightningArrest || false}
          onCheckedChange={(checked) => handleFieldChange('lightningArrest', checked)}
        />
        <label htmlFor={`lightningArrest-${projectIndex}`} className="text-sm font-medium">Lightning Arrestor Required</label>
      </div>

      {/* Additional Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Additional Notes</label>
        <Textarea
          value={project.others || ''}
          onChange={(e) => handleFieldChange('others', e.target.value)}
          placeholder="Any additional specifications or notes..."
          data-testid={`textarea-notes-${projectIndex}`}
        />
      </div>
    </div>
  );

  const renderBatteryFields = () => (
    <div className="space-y-4 mt-4">
      <h4 className="font-medium text-sm text-gray-700">Battery Configuration</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Battery Brand</label>
          <Select value={project.batteryBrand || "exide"} onValueChange={(value) => handleFieldChange('batteryBrand', value)}>
            <SelectTrigger data-testid={`select-battery-brand-${projectIndex}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exide">Exide</SelectItem>
              <SelectItem value="utl">UTL</SelectItem>
              <SelectItem value="exide_utl">Exide UTL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Battery Type</label>
          <Select value={project.batteryType || "lead_acid"} onValueChange={(value) => handleFieldChange('batteryType', value)}>
            <SelectTrigger data-testid={`select-battery-type-${projectIndex}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lead_acid">Lead Acid</SelectItem>
              <SelectItem value="lithium">Lithium</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Battery AH</label>
          <Select value={project.batteryAH || "100"} onValueChange={(value) => handleFieldChange('batteryAH', value)}>
            <SelectTrigger data-testid={`select-battery-ah-${projectIndex}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 AH</SelectItem>
              <SelectItem value="120">120 AH</SelectItem>
              <SelectItem value="150">150 AH</SelectItem>
              <SelectItem value="200">200 AH</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Voltage (V)</label>
          <Input
            type="number"
            min="0"
            value={project.voltage || 12}
            onChange={(e) => handleFieldChange('voltage', parseFloat(e.target.value) || 12)}
            data-testid={`input-voltage-${projectIndex}`}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Battery Count</label>
          <Input
            type="number"
            min="1"
            value={project.batteryCount || 1}
            onChange={(e) => handleFieldChange('batteryCount', parseInt(e.target.value) || 1)}
            data-testid={`input-battery-count-${projectIndex}`}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Battery Stands</label>
          <Input
            type="number"
            min="1"
            value={project.batteryStands || 1}
            onChange={(e) => handleFieldChange('batteryStands', parseInt(e.target.value) || 1)}
            data-testid={`input-battery-stands-${projectIndex}`}
          />
        </div>
      </div>
    </div>
  );

  if (project.projectType === 'water_heater') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Water Heater Brand *</label>
            <Select value={project.brand || "venus"} onValueChange={(value) => handleFieldChange('brand', value)}>
              <SelectTrigger data-testid={`select-heater-brand-${projectIndex}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="venus">Venus</SelectItem>
                <SelectItem value="pressurised">Pressurised</SelectItem>
                <SelectItem value="non_pressurised">Non Pressurised</SelectItem>
                <SelectItem value="hykon">Hykon</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Capacity (Litre) *</label>
            <Input
              type="number"
              min="50"
              value={project.litre || 100}
              onChange={(e) => handleFieldChange('litre', parseInt(e.target.value) || 100)}
              placeholder="100, 150, 200, 300..."
              data-testid={`input-litre-${projectIndex}`}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Heating Coil Type</label>
            <Input
              value={project.heatingCoil || ''}
              onChange={(e) => handleFieldChange('heatingCoil', e.target.value)}
              placeholder="Standard, Premium, etc."
              data-testid={`input-heating-coil-${projectIndex}`}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Floor Level *</label>
            <Select value={project.floor || '0'} onValueChange={(value) => handleFieldChange('floor', value)}>
              <SelectTrigger data-testid={`select-floor-heater-${projectIndex}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {floorLevels.map((floor) => (
                  <SelectItem key={floor} value={floor}>
                    {floor === '0' ? 'Ground Floor' : `${floor}${floor === '1' ? 'st' : floor === '2' ? 'nd' : floor === '3' ? 'rd' : 'th'} Floor`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Value (₹)</label>
            <Input
              type="number"
              min="0"
              value={project.projectValue || 0}
              onChange={(e) => handleFieldChange('projectValue', parseFloat(e.target.value) || 0)}
              data-testid={`input-project-value-${projectIndex}`}
            />
          </div>
        </div>

        {/* Work Scope Section for Water Heater */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700">Work Scope</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plumbing Work Scope</label>
              <Select value={project.plumbingWorkScope || 'customer_scope'} onValueChange={(value) => handleFieldChange('plumbingWorkScope', value)}>
                <SelectTrigger data-testid={`select-plumbing-work-heater-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workScopeOptions.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope === 'customer_scope' ? 'Customer Scope' : 'Company Scope'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Civil Work Scope</label>
              <Select value={project.civilWorkScope || 'customer_scope'} onValueChange={(value) => handleFieldChange('civilWorkScope', value)}>
                <SelectTrigger data-testid={`select-civil-work-heater-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workScopeOptions.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope === 'customer_scope' ? 'Customer Scope' : 'Company Scope'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Additional Notes</label>
          <Textarea
            value={project.others || ''}
            onChange={(e) => handleFieldChange('others', e.target.value)}
            placeholder="Any additional specifications or notes..."
            data-testid={`textarea-heater-notes-${projectIndex}`}
          />
        </div>
      </div>
    );
  }

  if (project.projectType === 'water_pump') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Motor HP *</label>
            <Select value={project.hp || "1"} onValueChange={(value) => handleFieldChange('hp', value)}>
              <SelectTrigger data-testid={`select-hp-${projectIndex}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5 HP</SelectItem>
                <SelectItem value="1">1 HP</SelectItem>
                <SelectItem value="2">2 HP</SelectItem>
                <SelectItem value="3">3 HP</SelectItem>
                <SelectItem value="5">5 HP</SelectItem>
                <SelectItem value="7.5">7.5 HP</SelectItem>
                <SelectItem value="10">10 HP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Drive Type</label>
            <Select value={project.drive || "vfd"} onValueChange={(value) => handleFieldChange('drive', value)}>
              <SelectTrigger data-testid={`select-drive-${projectIndex}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vfd">VFD (Variable Frequency Drive)</SelectItem>
                <SelectItem value="direct">Direct Drive</SelectItem>
                <SelectItem value="submersible">Submersible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Panel Brand * (Multiple Selection)</label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
              {solarPanelBrands.map((brand) => (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox
                    id={`pump-panel-${brand}-${projectIndex}`}
                    checked={project.panelBrand?.includes(brand) || false}
                    onCheckedChange={(checked) => {
                      const currentMakes = project.panelBrand || [];
                      const newMakes = checked 
                        ? [...currentMakes, brand]
                        : currentMakes.filter((m: string) => m !== brand);
                      handleFieldChange('panelBrand', newMakes);
                    }}
                  />
                  <label htmlFor={`pump-panel-${brand}-${projectIndex}`} className="text-sm">
                    {brand.replace('_', ' ').toUpperCase()}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Panel Count *</label>
            <Input
              type="number"
              min="1"
              value={project.panelCount || 1}
              onChange={(e) => handleFieldChange('panelCount', parseInt(e.target.value) || 1)}
              data-testid={`input-pump-panel-count-${projectIndex}`}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Structure Height (ft)</label>
            <Input
              type="number"
              min="0"
              value={project.structureHeight || 0}
              onChange={(e) => handleFieldChange('structureHeight', parseFloat(e.target.value) || 0)}
              data-testid={`input-pump-structure-height-${projectIndex}`}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Value (₹)</label>
            <Input
              type="number"
              min="0"
              value={project.projectValue || 0}
              onChange={(e) => handleFieldChange('projectValue', parseFloat(e.target.value) || 0)}
              data-testid={`input-pump-project-value-${projectIndex}`}
            />
          </div>
        </div>

        {/* Structure Details Section for Water Pump */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700">Structure Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Structure Type *</label>
              <Select value={project.structureType || 'gp_structure'} onValueChange={(value) => handleFieldChange('structureType', value)}>
                <SelectTrigger data-testid={`select-pump-structure-type-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {structureTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === 'gp_structure' ? 'GP Structure' : 'Mono Rail'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {project.structureType === 'gp_structure' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lower End Height (ft)</label>
                  <Select 
                    value={project.gpStructure?.lowerEndHeight || '0'} 
                    onValueChange={(value) => handleFieldChange('gpStructure', { 
                      ...project.gpStructure, 
                      lowerEndHeight: value 
                    })}
                  >
                    <SelectTrigger data-testid={`select-pump-lower-height-${projectIndex}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {heightRange.map((height) => (
                        <SelectItem key={height} value={height}>
                          {height} ft
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Higher End Height (ft)</label>
                  <Select 
                    value={project.gpStructure?.higherEndHeight || '0'} 
                    onValueChange={(value) => handleFieldChange('gpStructure', { 
                      ...project.gpStructure, 
                      higherEndHeight: value 
                    })}
                  >
                    <SelectTrigger data-testid={`select-pump-higher-height-${projectIndex}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {heightRange.map((height) => (
                        <SelectItem key={height} value={height}>
                          {height} ft
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {project.structureType === 'mono_rail' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Mono Rail Type</label>
                <Select 
                  value={project.monoRail?.type || 'mini_rail'} 
                  onValueChange={(value) => handleFieldChange('monoRail', { 
                    ...project.monoRail, 
                    type: value 
                  })}
                >
                  <SelectTrigger data-testid={`select-pump-mono-rail-${projectIndex}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monoRailOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === 'mini_rail' ? 'Mini Rail' : 'Long Rail'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Work Scope Section for Water Pump */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700">Work Scope</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plumbing Work Scope</label>
              <Select value={project.plumbingWorkScope || 'customer_scope'} onValueChange={(value) => handleFieldChange('plumbingWorkScope', value)}>
                <SelectTrigger data-testid={`select-plumbing-work-pump-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workScopeOptions.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope === 'customer_scope' ? 'Customer Scope' : 'Company Scope'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Civil Work Scope</label>
              <Select value={project.civilWorkScope || 'customer_scope'} onValueChange={(value) => handleFieldChange('civilWorkScope', value)}>
                <SelectTrigger data-testid={`select-civil-work-pump-${projectIndex}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workScopeOptions.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {scope === 'customer_scope' ? 'Customer Scope' : 'Company Scope'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Additional Notes</label>
          <Textarea
            value={project.others || ''}
            onChange={(e) => handleFieldChange('others', e.target.value)}
            placeholder="Any additional specifications or notes..."
            data-testid={`textarea-pump-notes-${projectIndex}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderSolarSystemFields()}
      {(project.projectType === 'off_grid' || project.projectType === 'hybrid') && renderBatteryFields()}
      
      <Separator />
      
      {/* Pricing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <span className="text-sm text-muted-foreground">Base Value:</span>
          <div className="font-medium">₹{project.projectValue?.toLocaleString() || 0}</div>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">GST (18%):</span>
          <div className="font-medium text-blue-600">₹{project.gstAmount?.toLocaleString() || 0}</div>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Govt. Subsidy:</span>
          <div className="font-medium text-green-600">-₹{project.subsidyAmount?.toLocaleString() || 0}</div>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Customer Payment:</span>
          <div className="font-medium text-lg">₹{project.customerPayment?.toLocaleString() || 0}</div>
        </div>
      </div>
    </div>
  );
}

export default function QuotationCreation() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [quotationSource, setQuotationSource] = useState<"manual" | "site_visit">("manual");
  const [selectedSiteVisit, setSelectedSiteVisit] = useState<string | null>(null);
  const [siteVisitMapping, setSiteVisitMapping] = useState<any>(null);
  const { toast } = useToast();

  // Form management
  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      customerId: "",
      source: "manual",
      projects: [],
      totalSystemCost: 0,
      totalGSTAmount: 0,
      totalWithGST: 0,
      totalSubsidyAmount: 0,
      totalCustomerPayment: 0,
      advancePaymentPercentage: 90,
      advanceAmount: 0,
      balanceAmount: 0,
      paymentTerms: "advance_90_balance_10",
      deliveryTimeframe: "2_3_weeks",
      termsTemplate: "standard",
      status: "draft",
      followUps: [],
      communicationPreference: "whatsapp",
      documentVersion: 1,
      preparedBy: "",
      internalNotes: "",
      customerNotes: "",
      attachments: []
    }
  });

  // Fetch mappable site visits for selection
  const { data: siteVisits, isLoading: isLoadingSiteVisits } = useQuery({
    queryKey: ["/api/quotations/site-visits/mappable"],
    enabled: quotationSource === "site_visit"
  });

  // Fetch customers for manual entry
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["/api/customers"],
    enabled: quotationSource === "manual"
  });

  // Fetch complete site visit mapping data when selected - pulls ALL data without leaving anything
  const { data: mappingData, isLoading: isLoadingMapping, error: mappingError } = useQuery({
    queryKey: [`/api/quotations/site-visits/${selectedSiteVisit}/mapping-data`],
    enabled: !!selectedSiteVisit && quotationSource === "site_visit",
    retry: false // Don't retry on error, we'll handle it manually
  });

  // Fallback: Fetch basic site visit data if mapping fails
  const { data: fallbackSiteVisitData, isLoading: isLoadingFallback } = useQuery({
    queryKey: [`/api/site-visits/${selectedSiteVisit}`],
    enabled: !!selectedSiteVisit && quotationSource === "site_visit" && !!mappingError,
    retry: false
  });

  // Create quotation mutation using proper apiRequest with auth
  const createQuotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const url = quotationSource === "site_visit" && selectedSiteVisit 
        ? `/api/quotations/from-site-visit/${selectedSiteVisit}`
        : "/api/quotations";
      
      const response = await apiRequest(url, "POST", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Quotation Created",
        description: `Quotation ${data.quotation?.quotationNumber || 'new'} has been created successfully.`
      });
      // Invalidate all quotation-related queries (including filtered ones)
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"], exact: false });
      setLocation("/quotations");
    },
    onError: (error: any) => {
      console.error("Error creating quotation:", error);
      
      // Handle structured validation errors
      if (error.status === 422 && error.completenessAnalysis) {
        toast({
          title: "Site Visit Data Incomplete",
          description: error.message,
          variant: "destructive"
        });
        // Could show detailed missing fields UI here
      } else {
        toast({
          title: "Error Creating Quotation",
          description: "Please check all required fields and try again.",
          variant: "destructive"
        });
      }
    }
  });

  // Handle site visit selection and auto-populate form
  useEffect(() => {
    if (mappingData && (mappingData as any).quotationData) {
      const data = (mappingData as any).quotationData;
      const metadata = (mappingData as any).mappingMetadata;
      const originalSiteVisitData = (mappingData as any).originalSiteVisitData;
      
      // Extract customer data from multiple possible paths - be flexible
      const customerData = originalSiteVisitData?.customer || 
                          originalSiteVisitData?.customerData || 
                          metadata?.originalSiteVisitData?.customer ||
                          metadata?.customer ||
                          data.customerData ||
                          {}; // Default to empty object to allow manual entry
      
      // Auto-populate form with mapped data, ensuring proper QuotationProject structure
      const mappedProjects: QuotationProject[] = (data.projects || []).map((project: any) => {
        // Ensure full QuotationProject compliance with all required fields
        return {
          projectType: project.projectType,
          projectValue: project.projectValue || 0,
          subsidyAmount: project.subsidyAmount || 0,
          customerPayment: project.customerPayment || 0,
          // Include all other QuotationProject fields as defined in schema
          systemKW: project.systemKW,
          pricePerKW: project.pricePerKW,
          solarPanelMake: project.solarPanelMake || [],
          panelWatts: project.panelWatts,
          panelCount: project.panelCount,
          inverterMake: project.inverterMake || [],
          inverterWatts: project.inverterWatts,
          inverterKW: project.inverterKW,
          inverterQty: project.inverterQty,
          inverterPhase: project.inverterPhase,
          ...project // Include all other mapped fields from site visit
        } as QuotationProject;
      });
      
      // Set customer data in the form for site visit source
      const customerFormData = {
        name: customerData?.name || "",
        mobile: customerData?.mobile || "",
        address: customerData?.address || "",
        propertyType: customerData?.propertyType || "",
        ebServiceNumber: customerData?.ebServiceNumber || "",
        location: customerData?.location || ""
      };
      
      form.reset({
        ...form.getValues(),
        source: "site_visit", // Ensure source is properly set
        customerId: data.customerId || customerData?.id || "",
        customerData: customerFormData, // Add customer data for site visit form
        projects: mappedProjects,
        totalSystemCost: data.totalSystemCost || 0,
        totalGSTAmount: data.totalGSTAmount || 0,
        totalWithGST: data.totalWithGST || 0,
        totalSubsidyAmount: data.totalSubsidyAmount || 0,
        totalCustomerPayment: data.totalCustomerPayment || 0,
        advancePaymentPercentage: data.advancePaymentPercentage || 90,
        advanceAmount: data.advanceAmount || 0,
        balanceAmount: data.balanceAmount || 0,
        paymentTerms: data.paymentTerms || "advance_90_balance_10",
        deliveryTimeframe: data.deliveryTimeframe || "2_3_weeks",
        termsTemplate: data.termsTemplate || "standard",
        status: data.status || "draft",
        followUps: data.followUps || [],
        communicationPreference: data.communicationPreference || "whatsapp",
        documentVersion: data.documentVersion || 1,
        internalNotes: data.internalNotes || "",
        customerNotes: data.customerNotes || "",
        attachments: data.attachments || [],
        siteVisitMapping: metadata ? {
          ...metadata,
          mappedAt: metadata.mappedAt instanceof Date ? metadata.mappedAt : new Date(metadata.mappedAt)
        } : undefined
      });
      
      // Enhanced mapping data with customer info for SiteVisitCustomerDetailsForm
      const enhancedMapping = {
        ...mappingData,
        // Add customer data directly at the expected paths
        customer: customerData,
        originalSiteVisitData: {
          ...originalSiteVisitData,
          customerData: customerData
        },
        mappingMetadata: {
          ...metadata,
          // Add customer data for the form component from the original site visit
          customer: customerData,
          // Also add to originalSiteVisitData for compatibility
          originalSiteVisitData: {
            ...originalSiteVisitData,
            customerData: customerData
          }
        },
        // Include completeness analysis at the top level
        completenessAnalysis: metadata?.completenessAnalysis || (mappingData as any).completenessAnalysis
      };
      
      setSiteVisitMapping(enhancedMapping);
      
      toast({
        title: "Complete Site Visit Data Mapped", 
        description: `All available data mapped with ${metadata?.completenessAnalysis?.completenessScore || 0}% completeness. Grade: ${metadata?.completenessAnalysis?.qualityGrade || 'Unknown'}`
      });
    }
  }, [mappingData, form]);

  // Handle fallback data when mapping fails but site visit data is available
  useEffect(() => {
    if (fallbackSiteVisitData && mappingError && !mappingData) {
      const siteVisit = fallbackSiteVisitData as any;
      
      // Extract customer data - be flexible with missing data
      const customerData = siteVisit.customer || siteVisit.customerData || {};
      
      // Set customer data in the form for fallback case - allow partial data
      const customerFormData = {
        name: customerData?.name || "",
        mobile: customerData?.mobile || "",
        address: customerData?.address || "",
        propertyType: customerData?.propertyType || "",
        ebServiceNumber: customerData?.ebServiceNumber || "",
        location: customerData?.location || ""
      };
      
      // Create basic mapping metadata for partial data
      const partialMapping = {
        sourceVisitId: siteVisit.id,
        mappedAt: new Date(),
        completenessScore: Object.values(customerFormData).filter(v => v && v.trim()).length * 16, // Rough percentage based on filled fields
        missingCriticalFields: [],
        missingOptionalFields: [],
        dataQualityNotes: "Fallback mapping - allowing partial customer data completion by user.",
        customer: customerData,
        originalSiteVisitData: {
          visitInfo: {
            id: siteVisit.id,
            visitPurpose: siteVisit.visitPurpose,
            status: siteVisit.status,
            department: siteVisit.department,
            visitOutcome: siteVisit.visitOutcome
          },
          customer: customerData,
          customerData: customerData
        }
      };
      
      // Populate form with customer data only
      form.reset({
        ...form.getValues(),
        source: "site_visit",
        customerId: customerData?.id || "",
        customerData: customerFormData, // Add customer data for fallback case
        projects: [], // Empty projects - user will need to add manually
        siteVisitMapping: partialMapping ? {
          ...partialMapping,
          mappedAt: partialMapping.mappedAt instanceof Date ? partialMapping.mappedAt : new Date(partialMapping.mappedAt)
        } : undefined
      });
      
      setSiteVisitMapping(partialMapping);
      
      toast({
        title: "Site Visit Data Retrieved",
        description: "Available customer information loaded. Please complete any missing details below.",
        variant: "default"
      });
    }
  }, [fallbackSiteVisitData, mappingError, mappingData, form]);

  // Navigation functions
  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const values = form.getValues();
    switch (currentStep) {
      case 0: // Source selection
        return quotationSource === "manual" || (quotationSource === "site_visit" && selectedSiteVisit);
      case 1: // Customer details
        if (quotationSource === "manual") {
          return values.customerId !== undefined && values.customerId !== "";
        } else {
          // For site visit source, check that customer data is complete and valid
          const customerData = values.customerData;
          if (!customerData) return false;
          
          const isNameValid = customerData.name && customerData.name.trim().length >= 2;
          const isMobileValid = customerData.mobile && customerData.mobile.trim().length >= 10;
          const isAddressValid = customerData.address && customerData.address.trim().length >= 3;
          const isPropertyTypeValid = customerData.propertyType && customerData.propertyType.trim() !== "";
          
          return isNameValid && isMobileValid && isAddressValid && isPropertyTypeValid;
        }
      case 2: // Projects
        return values.projects && values.projects.length > 0;
      case 3: // Pricing
        return (values.totalCustomerPayment || 0) > 0;
      default:
        return true;
    }
  };

  // Calculate project totals when projects change
  const watchedProjects = form.watch("projects");
  useEffect(() => {
    const calculateTotals = () => {
      const values = form.getValues();
      const projects = values.projects || [];
      
      const totalSystemCost = projects.reduce((sum: number, project: any) => sum + (project.projectValue || 0), 0);
      const totalGSTAmount = projects.reduce((sum: number, project: any) => sum + (project.gstAmount || 0), 0);
      const totalWithGST = totalSystemCost + totalGSTAmount;
      const totalSubsidyAmount = projects.reduce((sum: number, project: any) => sum + (project.subsidyAmount || 0), 0);
      const totalCustomerPayment = totalWithGST - totalSubsidyAmount;
      const advanceAmount = Math.round(totalCustomerPayment * 0.9);
      const balanceAmount = totalCustomerPayment - advanceAmount;

      form.setValue("totalSystemCost", totalSystemCost);
      form.setValue("totalGSTAmount", totalGSTAmount);
      form.setValue("totalWithGST", totalWithGST);
      form.setValue("totalSubsidyAmount", totalSubsidyAmount);
      form.setValue("totalCustomerPayment", totalCustomerPayment);
      form.setValue("advanceAmount", advanceAmount);
      form.setValue("balanceAmount", balanceAmount);
    };

    if (quotationSource === "manual") {
      calculateTotals();
    }
  }, [watchedProjects, form, quotationSource]);

  const onSubmit = (data: QuotationFormData) => {
    // Validate business rules before submission
    const totalSystemCost = data.projects.reduce((sum, p) => sum + p.projectValue, 0);
    const totalGSTAmount = data.projects.reduce((sum, p) => sum + (p.gstAmount || 0), 0);
    const totalWithGST = totalSystemCost + totalGSTAmount;
    const totalSubsidyAmount = data.projects.reduce((sum, p) => sum + p.subsidyAmount, 0);
    const calculatedCustomerPayment = totalWithGST - totalSubsidyAmount;
    
    // Ensure all pricing is consistent with business rules
    if (Math.abs(data.totalCustomerPayment - calculatedCustomerPayment) > 1) {
      toast({
        title: "Pricing Error",
        description: "Pricing calculations don't match business rules. Please refresh the data.",
        variant: "destructive"
      });
      return;
    }
    
    // Prepare final submission with proper QuotationProject validation
    const submissionData: QuotationFormData = {
      ...data,
      source: quotationSource, // Use the actual selected source
      preparedBy: "current-user-id", // Should come from auth context
      projects: data.projects, // Already validated by schema
      totalSystemCost,
      totalSubsidyAmount,
      totalCustomerPayment: calculatedCustomerPayment,
      advanceAmount: Math.round(calculatedCustomerPayment * (data.advancePaymentPercentage / 100)),
      balanceAmount: calculatedCustomerPayment - Math.round(calculatedCustomerPayment * (data.advancePaymentPercentage / 100))
    };
    
    createQuotationMutation.mutate(submissionData);
  };

  return (
    <div className="container mx-auto py-6" data-testid="quotation-creation-page">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/quotations")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotations
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Create New Quotation</h1>
            <p className="text-muted-foreground">
              Generate professional quotations for solar energy systems
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-4 mb-6">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const IconComponent = step.icon;
            
            return (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : isActive 
                        ? "border-primary text-primary" 
                        : "border-muted-foreground text-muted-foreground"
                  }`}
                  data-testid={`step-indicator-${step.id}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <IconComponent className="h-5 w-5" />
                  )}
                </div>
                
                <div className="ml-3 min-w-0 flex-1">
                  <p className={`text-sm font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`mx-4 h-px bg-border flex-1`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 0: Source Selection */}
          {currentStep === 0 && (
            <Card data-testid="card-source-selection">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Choose Quotation Source
                </CardTitle>
                <CardDescription>
                  Select how you want to create this quotation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Manual Creation Option */}
                  <Card 
                    className={`cursor-pointer border-2 transition-colors ${
                      quotationSource === "manual" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => {
                      setQuotationSource("manual");
                      form.setValue("source", "manual");
                    }}
                    data-testid="card-manual-creation"
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Manual Creation</CardTitle>
                          <CardDescription>
                            Create quotation from scratch with custom inputs
                          </CardDescription>
                        </div>
                        <div className="ml-auto">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            quotationSource === "manual" ? "border-primary bg-primary" : "border-muted-foreground"
                          }`} />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Site Visit Integration Option */}
                  <Card 
                    className={`cursor-pointer border-2 transition-colors ${
                      quotationSource === "site_visit" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => {
                      setQuotationSource("site_visit");
                      form.setValue("source", "site_visit");
                    }}
                    data-testid="card-site-visit-integration"
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 text-green-600">
                          <Zap className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">From Site Visit</CardTitle>
                          <CardDescription>
                            Auto-populate from existing site visit data
                          </CardDescription>
                        </div>
                        <div className="ml-auto">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            quotationSource === "site_visit" ? "border-primary bg-primary" : "border-muted-foreground"
                          }`} />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </div>

                {/* Site Visit Selection */}
                {quotationSource === "site_visit" && (
                  <div className="space-y-4">
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-3">Select Site Visit</h4>
                      {isLoadingSiteVisits ? (
                        <div className="flex items-center justify-center p-8">
                          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                      ) : (siteVisits as any)?.data?.length > 0 ? (
                        <div className="grid gap-3">
                          {((siteVisits as any)?.data || []).map((visit: SiteVisitMapping) => (
                            <Card 
                              key={visit.id}
                              className={`cursor-pointer border transition-colors ${
                                selectedSiteVisit === visit.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => setSelectedSiteVisit(visit.id)}
                              data-testid={`card-site-visit-${visit.id}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h5 className="font-medium">{visit.customer.name}</h5>
                                      <Badge 
                                        variant={visit.completenessAnalysis.qualityGrade === 'A' ? 'default' : 
                                                visit.completenessAnalysis.qualityGrade === 'B' ? 'secondary' : 'destructive'}
                                      >
                                        Grade {visit.completenessAnalysis.qualityGrade}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{visit.customer.mobile}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{visit.customer.address}</p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium mb-1">
                                      {visit.completenessAnalysis.completenessScore}% Complete
                                    </div>
                                    <Progress 
                                      value={visit.completenessAnalysis.completenessScore} 
                                      className="w-20 h-2"
                                    />
                                  </div>
                                </div>

                                {visit.completenessAnalysis.missingCriticalFields.length > 0 && (
                                  <Alert className="mt-3">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                      Missing critical fields: {visit.completenessAnalysis.missingCriticalFields.join(", ")}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            No site visits available for quotation mapping. Please complete site visits first.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 1: Customer Details */}
          {currentStep === 1 && (
            <Card data-testid="card-customer-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
                <CardDescription>
                  {quotationSource === "site_visit" && siteVisitMapping ? 
                    "Review and complete customer details from site visit" :
                    "Enter customer details for the quotation"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {quotationSource === "manual" ? (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Customer</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-customer">
                                <SelectValue placeholder="Select a customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingCustomers ? (
                                <div className="p-4 text-center">Loading customers...</div>
                              ) : (
                                ((customers as any)?.data || []).map((customer: any) => (
                                  <SelectItem key={customer.id} value={customer.id}>
                                    {customer.name} - {customer.mobile}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Alert>
                      <User className="h-4 w-4" />
                      <AlertDescription>
                        If the customer is not in the list, please create them in the Customers section first.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <SiteVisitCustomerDetailsForm 
                    form={form}
                    siteVisitMapping={siteVisitMapping}
                    fallbackSiteVisitData={fallbackSiteVisitData}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Project Configuration */}
          {currentStep === 2 && (
            <Card data-testid="card-project-configuration">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Project Configuration
                </CardTitle>
                <CardDescription>
                  {quotationSource === "site_visit" && siteVisitMapping ? 
                    "Review and update project specifications from site visit" :
                    "Configure solar systems and project specifications"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Show completeness analysis for site visit projects */}
                {quotationSource === "site_visit" && siteVisitMapping && (
                  <div className="space-y-4">
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertDescription>
                        Site visit data has been mapped and is now editable. You can modify any configuration details, add missing information, or adjust specifications as needed.
                      </AlertDescription>
                    </Alert>
                    
                    {/* Data Completeness Analysis */}
                    {(siteVisitMapping as any)?.completenessAnalysis && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Info className="h-4 w-4 text-blue-600" />
                            Site Visit Data Completeness
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Overall Quality Grade</span>
                            <Badge variant="outline" className={
                              (siteVisitMapping as any).completenessAnalysis.qualityGrade === "A" ? "bg-green-100 text-green-800" :
                              (siteVisitMapping as any).completenessAnalysis.qualityGrade === "B" ? "bg-blue-100 text-blue-800" :
                              (siteVisitMapping as any).completenessAnalysis.qualityGrade === "C" ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }>
                              Grade {(siteVisitMapping as any).completenessAnalysis.qualityGrade}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Data Completeness</span>
                            <Badge variant="outline">
                              {(siteVisitMapping as any).completenessAnalysis.completenessScore}% Complete
                            </Badge>
                          </div>
                          
                          {(siteVisitMapping as any).completenessAnalysis.missingCriticalFields?.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                              <p className="text-sm font-medium text-red-800 mb-1">Missing Critical Fields:</p>
                              <p className="text-xs text-red-600">
                                {(siteVisitMapping as any).completenessAnalysis.missingCriticalFields.join(", ")}
                              </p>
                            </div>
                          )}
                          
                          {(siteVisitMapping as any).completenessAnalysis.missingImportantFields?.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                              <p className="text-sm font-medium text-yellow-800 mb-1">Missing Important Fields:</p>
                              <p className="text-xs text-yellow-600">
                                {(siteVisitMapping as any).completenessAnalysis.missingImportantFields.join(", ")}
                              </p>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500">
                            <p className="font-medium mb-1">You can now edit all project details below:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              <li>Solar panel makes and specifications</li>
                              <li>Inverter makes, capacity and phase details</li>
                              <li>Structure types and installation heights</li>
                              <li>Work scopes for civil and electrical work</li>
                              <li>Battery configurations and earthing details</li>
                              <li>Project pricing and payment calculations</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
                
                {/* Always show the full editable configuration for both manual and site visit projects */}
                <ManualProjectConfiguration form={form} />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Pricing & Terms */}
          {currentStep === 3 && (
            <Card data-testid="card-pricing-terms">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Pricing & Payment Terms
                </CardTitle>
                <CardDescription>
                  Review pricing calculations and payment terms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pricing Summary */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Pricing Summary</h4>
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base System Cost:</span>
                        <span className="font-medium">₹{form.watch("totalSystemCost")?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST (18%):</span>
                        <span className="font-medium text-blue-600">₹{form.watch("totalGSTAmount")?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total with GST:</span>
                        <span className="font-medium">₹{form.watch("totalWithGST")?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Government Subsidy:</span>
                        <span className="font-medium text-green-600">-₹{form.watch("totalSubsidyAmount")?.toLocaleString() || 0}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="font-medium">Customer Payment:</span>
                        <span className="font-bold text-lg">₹{form.watch("totalCustomerPayment")?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Payment Terms</h4>
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Advance (90%):</span>
                        <span className="font-medium">₹{form.watch("advanceAmount")?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Balance (10%):</span>
                        <span className="font-medium">₹{form.watch("balanceAmount")?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Timeline:</span>
                        <span className="font-medium">{form.watch("deliveryTimeframe")?.replace('_', '-') || '2-3 weeks'}</span>
                      </div>
                    </div>
                    
                    {/* Terms Configuration */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="deliveryTimeframe"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Timeframe</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-delivery-timeframe">
                                  <SelectValue placeholder="Select delivery timeframe" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1_2_weeks">1-2 weeks</SelectItem>
                                <SelectItem value="2_3_weeks">2-3 weeks</SelectItem>
                                <SelectItem value="3_4_weeks">3-4 weeks</SelectItem>
                                <SelectItem value="1_month">1 month</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="communicationPreference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Communication Preference</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-communication-preference">
                                  <SelectValue placeholder="How to send quotation" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                                <SelectItem value="print">Print Copy</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-4">
                  <h4 className="font-medium">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="internalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Internal Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Notes for internal team (not visible to customer)" 
                              className="min-h-[80px]" 
                              data-testid="textarea-internal-notes"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customerNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Special instructions or notes for customer" 
                              className="min-h-[80px]" 
                              data-testid="textarea-customer-notes"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <Card data-testid="card-review-submit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Review & Submit
                </CardTitle>
                <CardDescription>
                  Final review before creating the quotation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Quotation Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Source:</span>
                        <Badge variant="outline">
                          {quotationSource === "site_visit" ? "Site Visit" : "Manual"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Projects:</span>
                        <span className="font-medium">{form.watch("projects").length} system(s)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Value:</span>
                        <span className="font-medium">₹{form.watch("totalCustomerPayment")?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery:</span>
                        <span className="font-medium">{form.watch("deliveryTimeframe")?.replace('_', '-') || 'TBD'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Quality Check</h4>
                    {quotationSource === "site_visit" && siteVisitMapping && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Data Completeness:</span>
                          <Badge variant={
                            (siteVisitMapping as any).completenessAnalysis?.qualityGrade === 'A' ? 'default' :
                            (siteVisitMapping as any).completenessAnalysis?.qualityGrade === 'B' ? 'secondary' : 'destructive'
                          }>
                            Grade {(siteVisitMapping as any).completenessAnalysis?.qualityGrade || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completeness Score:</span>
                          <span className="font-medium">
                            {(siteVisitMapping as any).completenessAnalysis?.completenessScore || 0}%
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      All required fields have been validated and pricing calculations are complete.
                    </div>
                  </div>
                </div>

                {/* Warnings and Recommendations */}
                {quotationSource === "site_visit" && siteVisitMapping && (
                  (siteVisitMapping as any).businessRuleWarnings?.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Business Rule Warnings:</div>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {(siteVisitMapping as any).businessRuleWarnings.map((warning: string, index: number) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )
                )}

                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Ready to create quotation. The document will be generated with all specifications and can be sent to the customer.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              data-testid="button-previous"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep === WIZARD_STEPS.length - 1 ? (
              <Button
                type="submit"
                disabled={!canProceed() || createQuotationMutation.isPending}
                data-testid="button-submit"
              >
                {createQuotationMutation.isPending ? "Creating..." : "Create Quotation"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                data-testid="button-next"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
