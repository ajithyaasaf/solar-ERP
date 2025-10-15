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
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
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
  panelTypes,
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
    waterHeater: 0.3,     // 30% subsidy up to max ₹20,000
    waterPump: 0.4        // 40% subsidy for agricultural use
  },
  payment: {
    advancePercentage: 90,
    balancePercentage: 10
  },
  gst: {
    percentage: 8.9        // 8.9% GST as per business requirements
  }
};

// Subsidy calculation based on kW ranges (only for residential properties)
// For on_grid and hybrid projects:
// Up to 1 kW: ₹30,000
// 1-2 kW: ₹60,000
// 2-10 kW: ₹78,000
// Above 10 kW: No subsidy
const calculateSubsidy = (kw: number, propertyType: string, projectType: string): number => {
  // Subsidy only applies to residential properties for on_grid and hybrid
  if (propertyType !== 'residential') {
    return 0;
  }

  // Only on_grid and hybrid projects get subsidy
  if (!['on_grid', 'hybrid'].includes(projectType)) {
    return 0;
  }

  // Range-based subsidy with proper range comparisons
  if (kw <= 1) {
    return 30000;
  } else if (kw > 1 && kw <= 2) {
    return 60000;
  } else if (kw > 2 && kw <= 10) {
    return 78000;
  } else {
    // Above 10 kW: No subsidy
    return 0;
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

// Manual Customer Details Form Component
function ManualCustomerDetailsForm({ form }: { form: any }) {
  const [customerState, setCustomerState] = useState<any>({
    name: "",
    mobile: "",
    address: "",
    email: "",
    propertyType: "",
    ebServiceNumber: "",
    location: ""
  });
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  
  // Watch form's customerData to keep local state in sync
  const formCustomerData = form.watch("customerData");
  const formCustomerId = form.watch("customerId");
  
  // Sync local state with form data when it changes
  useEffect(() => {
    if (formCustomerData && Object.keys(formCustomerData).length > 0) {
      setCustomerState(formCustomerData);
      // If there's a customerId, mark as auto-filled
      if (formCustomerId) {
        setIsAutoFilled(true);
      }
    } else {
      // Reset to empty state if no customer data
      setCustomerState({
        name: "",
        mobile: "",
        address: "",
        email: "",
        propertyType: "",
        ebServiceNumber: "",
        location: ""
      });
      setIsAutoFilled(false);
    }
  }, [formCustomerData, formCustomerId]);

  const handleCustomerChange = (customerData: any) => {
    // Update local state
    setCustomerState(customerData);
    
    // Update form's customerData field
    form.setValue("customerData", {
      name: customerData.name || "",
      mobile: customerData.mobile || "",
      address: customerData.address || "",
      email: customerData.email || "",
      propertyType: customerData.propertyType || "",
      ebServiceNumber: customerData.ebServiceNumber || "",
      location: customerData.location || ""
    });
    
    // If customer has an ID, set it and mark as auto-filled
    if (customerData.id) {
      form.setValue("customerId", customerData.id);
      setIsAutoFilled(true);
    } else {
      form.setValue("customerId", "");
      setIsAutoFilled(false);
    }
  };

  const updateCustomerField = (field: string, value: any) => {
    const updatedCustomerData = { ...customerState, [field]: value };
    setCustomerState(updatedCustomerData);
    form.setValue("customerData", updatedCustomerData);
    
    // Keep the customerId even when editing - the backend will handle the update
    // Just remove the visual "Auto-filled" badge to indicate the field was modified
  };

  return (
    <div className="space-y-6">
      {/* Customer Search/Autocomplete */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Search Customer</label>
        <CustomerAutocomplete
          value={customerState}
          onChange={handleCustomerChange}
          onCustomerSelected={(customerId) => {
            form.setValue("customerId", customerId);
          }}
          placeholder="Start typing customer name or mobile number..."
        />
        <p className="text-xs text-muted-foreground">
          Search for existing customer or enter new customer details below
        </p>
      </div>

      {/* Customer Details Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">Customer Name *</label>
            {isAutoFilled && customerState.name && (
              <Badge variant="secondary" className="text-xs ml-2">
                <Check className="h-3 w-3 mr-1" />
                Auto-filled
              </Badge>
            )}
          </div>
          <Input
            value={customerState.name || ""}
            onChange={(e) => updateCustomerField("name", e.target.value)}
            placeholder="Enter customer name"
            className={isAutoFilled && customerState.name ? "bg-green-50 border-green-200" : ""}
            data-testid="input-customer-name"
          />
        </div>

        {/* Mobile */}
        <div className="space-y-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">Mobile Number *</label>
            {isAutoFilled && customerState.mobile && (
              <Badge variant="secondary" className="text-xs ml-2">
                <Check className="h-3 w-3 mr-1" />
                Auto-filled
              </Badge>
            )}
          </div>
          <Input
            value={customerState.mobile || ""}
            onChange={(e) => updateCustomerField("mobile", e.target.value)}
            placeholder="Enter mobile number"
            className={isAutoFilled && customerState.mobile ? "bg-green-50 border-green-200" : ""}
            data-testid="input-customer-mobile"
          />
        </div>

        {/* Address */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">Address *</label>
            {isAutoFilled && customerState.address && (
              <Badge variant="secondary" className="text-xs ml-2">
                <Check className="h-3 w-3 mr-1" />
                Auto-filled
              </Badge>
            )}
          </div>
          <Textarea
            value={customerState.address || ""}
            onChange={(e) => updateCustomerField("address", e.target.value)}
            placeholder="Enter full address"
            className={isAutoFilled && customerState.address ? "bg-green-50 border-green-200" : ""}
            data-testid="textarea-customer-address"
          />
        </div>

        {/* Property Type */}
        <div className="space-y-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">Property Type *</label>
            {isAutoFilled && customerState.propertyType && (
              <Badge variant="secondary" className="text-xs ml-2">
                <Check className="h-3 w-3 mr-1" />
                Auto-filled
              </Badge>
            )}
          </div>
          <Select 
            value={customerState.propertyType || undefined} 
            onValueChange={(value) => updateCustomerField("propertyType", value)}
          >
            <SelectTrigger 
              className={isAutoFilled && customerState.propertyType ? "bg-green-50 border-green-200" : ""}
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
            <p className="text-xs text-red-600">Property type is required for subsidy calculation</p>
          )}
        </div>

        {/* EB Service Number */}
        <div className="space-y-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">EB Service Number</label>
            {isAutoFilled && customerState.ebServiceNumber && (
              <Badge variant="secondary" className="text-xs ml-2">
                <Check className="h-3 w-3 mr-1" />
                Auto-filled
              </Badge>
            )}
          </div>
          <Input
            value={customerState.ebServiceNumber || ""}
            onChange={(e) => updateCustomerField("ebServiceNumber", e.target.value)}
            placeholder="Enter EB service number (optional)"
            className={isAutoFilled && customerState.ebServiceNumber ? "bg-green-50 border-green-200" : ""}
            data-testid="input-eb-service-number"
          />
        </div>

        {/* Location */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center">
            <label className="text-sm font-medium">Customer Location</label>
            {isAutoFilled && customerState.location && (
              <Badge variant="secondary" className="text-xs ml-2">
                <Check className="h-3 w-3 mr-1" />
                Auto-filled
              </Badge>
            )}
          </div>
          <Input
            value={customerState.location || ""}
            onChange={(e) => updateCustomerField("location", e.target.value)}
            placeholder="Enter specific location details (optional)"
            className={isAutoFilled && customerState.location ? "bg-green-50 border-green-200" : ""}
            data-testid="input-customer-location"
          />
        </div>
      </div>

      {/* Help Text */}
      {isAutoFilled && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>
            Customer details have been auto-filled from the database. You can modify any field as needed.
          </AlertDescription>
        </Alert>
      )}
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
          panelType: "bifacial",
          dcrPanelCount: 0,
          nonDcrPanelCount: 0,
          panelCount: 0,
          inverterMake: [],
          inverterKW: 3,
          inverterQty: 1,
          inverterPhase: "single_phase",
          lightningArrest: false,
          electricalAccessories: false,
          earth: "dc",
          floor: "0",
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
          panelType: "bifacial",
          dcrPanelCount: 0,
          nonDcrPanelCount: 0,
          panelCount: 0,
          inverterMake: [],
          inverterKW: 3,
          inverterQty: 1,
          inverterPhase: "single_phase",
          lightningArrest: false,
          electricalAccessories: false,
          earth: "dc",
          floor: "0",
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
          panelType: "bifacial",
          dcrPanelCount: 0,
          nonDcrPanelCount: 0,
          panelCount: 0,
          inverterMake: [],
          inverterKW: 3,
          inverterQty: 1,
          inverterPhase: "single_phase",
          lightningArrest: false,
          electricalAccessories: false,
          earth: "dc",
          floor: "0",
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
          panelWatts: "530",
          panelType: "bifacial",
          structureType: "gp_structure",
          panelBrand: [],
          dcrPanelCount: 0,
          nonDcrPanelCount: 0,
          panelCount: 0,
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

    // Calculate initial pricing for all project types
    if (["on_grid", "off_grid", "hybrid"].includes(projectType)) {
      newProject.gstPercentage = BUSINESS_RULES.gst.percentage;
      
      // Calculate system kW from panel data (this is the source of truth)
      const calculatedKW = (parseInt(newProject.panelWatts) * newProject.panelCount) / 1000;
      newProject.systemKW = calculatedKW;
      
      // Calculate default project value based on systemKW and default rate
      const defaultRatePerKW = projectType === 'on_grid' ? BUSINESS_RULES.pricing.onGridPerKW : 
                               projectType === 'off_grid' ? BUSINESS_RULES.pricing.offGridPerKW : 
                               BUSINESS_RULES.pricing.hybridPerKW;
      
      // Calculate total value including GST
      const basePrice = Math.round(calculatedKW * defaultRatePerKW);
      const totalWithGST = Math.round(basePrice * (1 + newProject.gstPercentage / 100));
      
      newProject.projectValue = totalWithGST;
      newProject.basePrice = basePrice;
      newProject.gstAmount = totalWithGST - basePrice;
      newProject.pricePerKW = defaultRatePerKW;
      
      // Get propertyType from form (for manual entry: from customer, for site visit: from customerData)
      const formValues = form.getValues();
      const propertyType = formValues.customerData?.propertyType || formValues.selectedCustomer?.propertyType || '';
      
      // Use the new calculateSubsidy function
      newProject.subsidyAmount = calculateSubsidy(calculatedKW, propertyType, projectType);
      newProject.customerPayment = newProject.projectValue - newProject.subsidyAmount;
    } else if (projectType === "water_heater") {
      // Set default pricing for water heater based on capacity (total including GST)
      const baseValue = newProject.litre * BUSINESS_RULES.pricing.waterHeaterPerLitre;
      const totalWithGST = baseValue * (1 + BUSINESS_RULES.gst.percentage / 100);
      newProject.projectValue = Math.round(totalWithGST);
      newProject.gstPercentage = BUSINESS_RULES.gst.percentage;
      
      // Calculate base price and GST from total
      const basePrice = Math.round(newProject.projectValue / (1 + newProject.gstPercentage / 100));
      const gstAmount = newProject.projectValue - basePrice;
      
      newProject.basePrice = basePrice;
      newProject.gstAmount = gstAmount;
      
      // Calculate subsidy: 30% up to max ₹20,000 (applied on base price)
      const maxSubsidy = Math.min(basePrice * BUSINESS_RULES.subsidy.waterHeater, 20000);
      newProject.subsidyAmount = maxSubsidy;
      newProject.customerPayment = newProject.projectValue - newProject.subsidyAmount;
    } else if (projectType === "water_pump") {
      // Set default pricing for water pump based on HP (total including GST)
      const hpValue = parseFloat(newProject.hp) || 1;
      const baseValue = hpValue * BUSINESS_RULES.pricing.waterPumpPerHP;
      const totalWithGST = baseValue * (1 + BUSINESS_RULES.gst.percentage / 100);
      newProject.projectValue = Math.round(totalWithGST);
      newProject.gstPercentage = BUSINESS_RULES.gst.percentage;
      
      // Calculate base price and GST from total
      const basePrice = Math.round(newProject.projectValue / (1 + newProject.gstPercentage / 100));
      const gstAmount = newProject.projectValue - basePrice;
      
      newProject.basePrice = basePrice;
      newProject.gstAmount = gstAmount;
      
      // Calculate subsidy: 40% for agricultural use (applied on base price)
      newProject.subsidyAmount = Math.round(basePrice * BUSINESS_RULES.subsidy.waterPump);
      newProject.customerPayment = newProject.projectValue - newProject.subsidyAmount;
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

    // Recalculate pricing for all project types
    const project = updatedProjects[index];
    
    if (["on_grid", "off_grid", "hybrid"].includes(project.projectType)) {
      // Ensure gstPercentage is set
      if (!project.gstPercentage) {
        project.gstPercentage = BUSINESS_RULES.gst.percentage;
      }
      
      // Calculate system kW from panel data (this is the source of truth)
      const calculatedKW = (parseInt(project.panelWatts) * project.panelCount) / 1000;
      
      // Store systemKW for backend compatibility
      project.systemKW = calculatedKW;
      
      // Calculate base price and GST from project value (which is total including GST)
      const basePrice = Math.round(project.projectValue / (1 + project.gstPercentage / 100));
      const gstAmount = project.projectValue - basePrice;
      
      project.basePrice = basePrice;
      project.gstAmount = gstAmount;
      
      // Calculate and store rate per kW (derived value for backend)
      project.pricePerKW = calculatedKW > 0 ? Math.round(basePrice / calculatedKW) : 0;
      
      // Get propertyType from form (for manual entry: from customer, for site visit: from customerData)
      const formValues = form.getValues();
      const propertyType = formValues.customerData?.propertyType || formValues.selectedCustomer?.propertyType || '';
      
      // Use the new calculateSubsidy function
      project.subsidyAmount = calculateSubsidy(calculatedKW, propertyType, project.projectType);
      project.customerPayment = project.projectValue - project.subsidyAmount;
    } else if (project.projectType === "water_heater") {
      // Ensure gstPercentage is set
      if (!project.gstPercentage) {
        project.gstPercentage = BUSINESS_RULES.gst.percentage;
      }
      
      // Recalculate pricing for water heater
      if (updatedData.hasOwnProperty('projectValue') || updatedData.hasOwnProperty('gstPercentage')) {
        // If project value or GST percentage is directly updated, recalculate base, GST, subsidy and payment
        const basePrice = Math.round(project.projectValue / (1 + project.gstPercentage / 100));
        const gstAmount = project.projectValue - basePrice;
        
        project.basePrice = basePrice;
        project.gstAmount = gstAmount;
        
        const maxSubsidy = Math.min(basePrice * BUSINESS_RULES.subsidy.waterHeater, 20000);
        project.subsidyAmount = maxSubsidy;
        project.customerPayment = project.projectValue - project.subsidyAmount;
      } else if (updatedData.hasOwnProperty('litre')) {
        // If litre is updated, recalculate based on capacity
        const baseValue = project.litre * BUSINESS_RULES.pricing.waterHeaterPerLitre;
        const totalWithGST = baseValue * (1 + project.gstPercentage / 100);
        project.projectValue = Math.round(totalWithGST);
        
        const basePrice = Math.round(project.projectValue / (1 + project.gstPercentage / 100));
        const gstAmount = project.projectValue - basePrice;
        
        project.basePrice = basePrice;
        project.gstAmount = gstAmount;
        
        const maxSubsidy = Math.min(basePrice * BUSINESS_RULES.subsidy.waterHeater, 20000);
        project.subsidyAmount = maxSubsidy;
        project.customerPayment = project.projectValue - project.subsidyAmount;
      }
    } else if (project.projectType === "water_pump") {
      // Ensure gstPercentage is set
      if (!project.gstPercentage) {
        project.gstPercentage = BUSINESS_RULES.gst.percentage;
      }
      
      // Recalculate pricing for water pump
      if (updatedData.hasOwnProperty('projectValue') || updatedData.hasOwnProperty('gstPercentage')) {
        // If project value or GST percentage is directly updated, recalculate base, GST, subsidy and payment
        const basePrice = Math.round(project.projectValue / (1 + project.gstPercentage / 100));
        const gstAmount = project.projectValue - basePrice;
        
        project.basePrice = basePrice;
        project.gstAmount = gstAmount;
        
        project.subsidyAmount = Math.round(basePrice * BUSINESS_RULES.subsidy.waterPump);
        project.customerPayment = project.projectValue - project.subsidyAmount;
      } else if (updatedData.hasOwnProperty('hp')) {
        // If HP is updated, recalculate based on HP
        const hpValue = parseFloat(project.hp) || 1;
        const baseValue = hpValue * BUSINESS_RULES.pricing.waterPumpPerHP;
        const totalWithGST = baseValue * (1 + project.gstPercentage / 100);
        project.projectValue = Math.round(totalWithGST);
        
        const basePrice = Math.round(project.projectValue / (1 + project.gstPercentage / 100));
        const gstAmount = project.projectValue - basePrice;
        
        project.basePrice = basePrice;
        project.gstAmount = gstAmount;
        
        project.subsidyAmount = Math.round(basePrice * BUSINESS_RULES.subsidy.waterPump);
        project.customerPayment = project.projectValue - project.subsidyAmount;
      }
    } else {
      // Fallback for unknown project types
      console.error(`Unknown project type during update: ${project.projectType}`);
    }

    form.setValue("projects", updatedProjects);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Add Project Type Selection */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="font-medium text-sm sm:text-base">Project Configuration</h4>
          <Select value={selectedProjectType || ""} onValueChange={setSelectedProjectType}>
            <SelectTrigger className="w-full sm:w-56" data-testid="select-project-type">
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
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              onClick={() => addProject(selectedProjectType)}
              data-testid="button-add-project"
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedProjectType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Project
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedProjectType(null)}
              className="w-full sm:w-auto"
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
        <div className="space-y-3 sm:space-y-4">
          <h5 className="font-medium text-sm sm:text-base">Configured Projects ({projects.length})</h5>
          <div className="grid gap-3 sm:gap-4">
            {projects.map((project: any, index: number) => (
              <Card key={index} className={`border transition-colors ${
                activeProjectIndex === index ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <CardHeader className="p-3 sm:p-4 pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {project.projectType === 'on_grid' && <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />}
                      {project.projectType === 'off_grid' && <Battery className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />}
                      {project.projectType === 'hybrid' && <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 shrink-0" />}
                      {project.projectType === 'water_heater' && <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 shrink-0" />}
                      {project.projectType === 'water_pump' && <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 shrink-0" />}
                      <h4 className="font-medium text-sm sm:text-base capitalize">
                        {project.projectType.replace('_', ' ')} System
                      </h4>
                      <Badge variant="outline" className="text-xs">
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
                        className="text-xs sm:text-sm"
                      >
                        {activeProjectIndex === index ? 'Collapse' : 'Configure'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeProject(index)}
                        data-testid={`button-remove-project-${index}`}
                        className="text-xs sm:text-sm"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {activeProjectIndex === index && (
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <ProjectConfigurationForm
                      project={project}
                      projectIndex={index}
                      onUpdate={(updatedData) => updateProject(index, updatedData)}
                    />
                  </CardContent>
                )}

                {activeProjectIndex !== index && (
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
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

  // Auto-calculate system kW from panel data (actual decimal value)
  const actualSystemKW = project.panelWatts && project.panelCount 
    ? (parseInt(project.panelWatts) * project.panelCount) / 1000
    : 0;

  // Round system kW: ≤3.5 → 3, >3.5 → 4
  const roundedSystemKW = actualSystemKW > 0 
    ? (actualSystemKW <= 3.5 ? Math.floor(actualSystemKW) : Math.ceil(actualSystemKW))
    : 0;

  // Display actual kW with 2 decimals
  const calculatedSystemKW = actualSystemKW.toFixed(2);

  // Calculate rate per kW from base price using ROUNDED kW
  const calculatedRatePerKW = project.basePrice && roundedSystemKW > 0
    ? Math.round(project.basePrice / roundedSystemKW)
    : 0;

  // Calculate GST per kW using ROUNDED kW
  const calculatedGSTPerKW = project.gstAmount && roundedSystemKW > 0
    ? Math.round(project.gstAmount / roundedSystemKW)
    : 0;

  const renderSolarSystemFields = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">System Capacity (kW) <span className="text-xs text-muted-foreground">(Auto-calculated)</span></label>
          <Input
            type="text"
            value={`${calculatedSystemKW} (Rounded: ${roundedSystemKW} kW)`}
            disabled
            className="bg-muted cursor-not-allowed"
            data-testid={`input-system-kw-${projectIndex}`}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Rate per kW (₹) <span className="text-xs text-muted-foreground">(Auto-calculated)</span></label>
          <Input
            type="text"
            value={calculatedRatePerKW.toLocaleString()}
            disabled
            className="bg-muted cursor-not-allowed"
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
          <label className="text-sm font-medium">Panel Type *</label>
          <Select value={project.panelType || "bifacial"} onValueChange={(value) => handleFieldChange('panelType', value)}>
            <SelectTrigger data-testid={`select-panel-type-${projectIndex}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {panelTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === 'bifacial' ? 'Bifacial' : type === 'topcon' ? 'Topcon' : 'Mono-PERC'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <label className="text-sm font-medium">Inverter KW *</label>
          <Input
            type="number"
            value={project.inverterKW || ''}
            onChange={(e) => {
              const value = e.target.value;
              const kw = parseFloat(value) || 0;
              handleFieldChange('inverterKW', value === '' ? undefined : kw);
              
              if (kw > 0) {
                const autoPhase = kw < 6 ? 'single_phase' : 'three_phase';
                handleFieldChange('inverterPhase', autoPhase);
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
              const qty = parseInt(value) || 1;
              handleFieldChange('inverterQty', value === '' ? undefined : qty);
              
              if (project.electricalAccessories && qty > 0) {
                handleFieldChange('electricalCount', qty);
              }
            }}
            min="1"
            placeholder="Enter inverter quantity"
            data-testid={`input-inverter-qty-${projectIndex}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Inverter Phase <span className="text-xs text-muted-foreground">(Auto-selected based on KW)</span></label>
          <Select 
            value={project.inverterPhase || "single_phase"} 
            onValueChange={(value) => handleFieldChange('inverterPhase', value)}
          >
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
          <label className="text-sm font-medium flex items-center gap-2">
            <Checkbox
              id={`lightning-arrest-${projectIndex}`}
              checked={project.lightningArrest || false}
              onCheckedChange={(checked) => handleFieldChange('lightningArrest', checked)}
              data-testid={`checkbox-lightning-arrest-${projectIndex}`}
            />
            <span>Lightning Arrestor</span>
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Checkbox
              id={`electrical-accessories-${projectIndex}`}
              checked={project.electricalAccessories || false}
              onCheckedChange={(checked) => {
                handleFieldChange('electricalAccessories', checked);
                if (checked && project.inverterQty) {
                  handleFieldChange('electricalCount', project.inverterQty);
                } else if (!checked) {
                  handleFieldChange('electricalCount', undefined);
                }
              }}
              data-testid={`checkbox-electrical-accessories-${projectIndex}`}
            />
            <span>Electrical Accessories</span>
          </label>
          {project.electricalAccessories && (
            <Input
              type="number"
              value={project.electricalCount || ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFieldChange('electricalCount', value === '' ? undefined : parseInt(value) || 0);
              }}
              min="0"
              placeholder="Electrical count (auto-filled from Inverter Qty)"
              data-testid={`input-electrical-count-${projectIndex}`}
              className="mt-2"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Earth Connection (Multiple Selection)</label>
          <div className="space-y-2 border rounded p-2">
            {earthingTypes.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`earth-${type}-${projectIndex}`}
                  checked={Array.isArray(project.earth) ? project.earth.includes(type) : project.earth === type}
                  onCheckedChange={(checked) => {
                    const currentEarth = Array.isArray(project.earth) ? project.earth : (project.earth ? [project.earth] : []);
                    const newEarth = checked 
                      ? [...currentEarth, type]
                      : currentEarth.filter((e: string) => e !== type);
                    handleFieldChange('earth', newEarth);
                  }}
                  data-testid={`checkbox-earth-${type}-${projectIndex}`}
                />
                <label htmlFor={`earth-${type}-${projectIndex}`} className="text-sm cursor-pointer">
                  {type === 'ac_dc' ? 'AC/DC' : type.toUpperCase()}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">DCR Panel Count</label>
          <Input
            type="number"
            min="0"
            value={project.dcrPanelCount || 0}
            onChange={(e) => {
              const dcrCount = parseInt(e.target.value) || 0;
              handleFieldChange('dcrPanelCount', dcrCount);
              const totalCount = dcrCount + (project.nonDcrPanelCount || 0);
              handleFieldChange('panelCount', totalCount);
            }}
            data-testid={`input-dcr-panel-count-${projectIndex}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">NON-DCR Panel Count</label>
          <Input
            type="number"
            min="0"
            value={project.nonDcrPanelCount || 0}
            onChange={(e) => {
              const nonDcrCount = parseInt(e.target.value) || 0;
              handleFieldChange('nonDcrPanelCount', nonDcrCount);
              const totalCount = (project.dcrPanelCount || 0) + nonDcrCount;
              handleFieldChange('panelCount', totalCount);
            }}
            data-testid={`input-non-dcr-panel-count-${projectIndex}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Total Panel Count <span className="text-xs text-muted-foreground">(Auto-calculated)</span></label>
          <Input
            type="number"
            min="1"
            value={project.panelCount || 0}
            disabled
            className="bg-muted cursor-not-allowed"
            data-testid={`input-panel-count-${projectIndex}`}
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
          <label className="text-sm font-medium">Project Value (₹) <span className="text-xs text-muted-foreground">(Total incl. GST)</span></label>
          <Input
            type="number"
            value={project.projectValue || 0}
            onChange={(e) => handleFieldChange('projectValue', parseFloat(e.target.value) || 0)}
            min="0"
            data-testid={`input-project-value-${projectIndex}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">GST Percentage (%)</label>
          <Input
            type="number"
            value={project.gstPercentage ?? 18}
            onChange={(e) => {
              const val = e.target.value;
              handleFieldChange('gstPercentage', val === '' ? 0 : parseFloat(val) || 0);
            }}
            min="0"
            max="100"
            step="0.1"
            data-testid={`input-gst-percentage-${projectIndex}`}
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
            <label className="text-sm font-medium">Project Value (₹) <span className="text-xs text-muted-foreground">(Total incl. GST)</span></label>
            <Input
              type="number"
              min="0"
              value={project.projectValue || 0}
              onChange={(e) => handleFieldChange('projectValue', parseFloat(e.target.value) || 0)}
              data-testid={`input-project-value-${projectIndex}`}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">GST Percentage (%)</label>
            <Input
              type="number"
              value={project.gstPercentage || 18}
              onChange={(e) => handleFieldChange('gstPercentage', parseFloat(e.target.value) || 18)}
              min="0"
              max="100"
              step="0.1"
              data-testid={`input-gst-percentage-${projectIndex}`}
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
            <label className="text-sm font-medium">Project Value (₹) <span className="text-xs text-muted-foreground">(Total incl. GST)</span></label>
            <Input
              type="number"
              min="0"
              value={project.projectValue || 0}
              onChange={(e) => handleFieldChange('projectValue', parseFloat(e.target.value) || 0)}
              data-testid={`input-pump-project-value-${projectIndex}`}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">GST Percentage (%)</label>
            <Input
              type="number"
              value={project.gstPercentage || 18}
              onChange={(e) => handleFieldChange('gstPercentage', parseFloat(e.target.value) || 18)}
              min="0"
              max="100"
              step="0.1"
              data-testid={`input-pump-gst-percentage-${projectIndex}`}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <span className="text-sm text-muted-foreground">Base Price (Total Cost):</span>
          <div className="font-medium text-lg">₹{project.basePrice?.toLocaleString() || 0}</div>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">GST {project.gstPercentage || 18}% (₹{calculatedGSTPerKW?.toLocaleString()}/kW):</span>
          <div className="font-medium text-blue-600">₹{project.gstAmount?.toLocaleString() || 0}</div>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Total Amount (Value + GST):</span>
          <div className="font-medium text-lg text-green-600">₹{project.projectValue?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* Subsidy Information (if applicable) */}
      {project.subsidyAmount > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Government Subsidy (Residential Only):</span>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">This will be deducted in BOM section</div>
            </div>
            <div className="font-bold text-xl text-green-700 dark:text-green-300">₹{project.subsidyAmount?.toLocaleString() || 0}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuotationCreation() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [quotationSource, setQuotationSource] = useState<"manual" | "site_visit">("manual");
  const [selectedSiteVisit, setSelectedSiteVisit] = useState<string | null>(null);
  const [siteVisitMapping, setSiteVisitMapping] = useState<any>(null);
  const [siteVisitSearchQuery, setSiteVisitSearchQuery] = useState("");
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
      // Initialize critical business fields with defaults
      accountDetails: {
        bankName: "State Bank of India",
        accountNumber: "31746205818",
        ifscCode: "SBIN0001766",
        accountHolderName: "Prakash Green Energy",
        branch: "Madurai Main Branch"
      },
      physicalDamageExclusions: {
        enabled: true,
        disclaimerText: "***Physical Damages will not be Covered***"
      },
      detailedWarrantyTerms: {
        solarPanels: {
          manufacturingDefect: "15 Years Manufacturing defect Warranty",
          serviceWarranty: "15 Years Service Warranty",
          performanceWarranty: [
            "90% Performance Warranty till the end of 15 years",
            "80% Performance Warranty till the end of 25 years"
          ]
        },
        inverter: {
          replacementWarranty: "Replacement Warranty for 10 Years",
          serviceWarranty: "Service Warranty for 5 Years"
        },
        installation: {
          warrantyPeriod: "2 Years Installation Warranty",
          serviceWarranty: "Complete service support during warranty period"
        }
      },
      documentRequirements: {
        subsidyDocuments: [
          "Aadhar Card",
          "EB Bill (Last 3 Months)",
          "House Tax Receipt",
          "Land Patta",
          "Building Plan Approval",
          "Fire NOC (for Commercial)",
          "Pollution NOC (for Commercial)", 
          "Bank Passbook",
          "Cancelled Cheque"
        ],
        note: "All Required Documents should be in the same name as mentioned in the EB Service Number."
      },
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

  // Helper function to get property type for subsidy calculations
  const getPropertyType = (): string => {
    const formValues = form.getValues();
    
    if (quotationSource === "site_visit") {
      return formValues.customerData?.propertyType || 'residential';
    } else {
      // For manual quotations, find the selected customer from the customers list
      const selectedCustomer = (customers as any)?.data?.find(
        (c: any) => c.id === formValues.customerId
      );
      return selectedCustomer?.propertyType || 'residential';
    }
  };

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
    
    if (currentStep === 1) {
      console.log("🔍 CUSTOMER VALIDATION CHECK");
      console.log("Quotation Source:", quotationSource);
      console.log("Customer Data:", values.customerData);
      console.log("Customer ID:", values.customerId);
    }
    
    switch (currentStep) {
      case 0: // Source selection
        return quotationSource === "manual" || (quotationSource === "site_visit" && selectedSiteVisit);
      case 1: // Customer details
        if (quotationSource === "manual") {
          // For manual creation, we ALWAYS need customerData to be properly filled
          // Whether selected from database or entered manually
          const customerData = values.customerData;
          
          if (!customerData) {
            console.log("❌ No customer data - button DISABLED");
            return false;
          }
          
          const isNameValid = customerData.name && customerData.name.trim().length >= 2;
          const isMobileValid = customerData.mobile && customerData.mobile.trim().length >= 10;
          const isAddressValid = customerData.address && customerData.address.trim().length >= 3;
          const isPropertyTypeValid = customerData.propertyType && customerData.propertyType.trim() !== "";
          
          console.log("Validation:", { isNameValid, isMobileValid, isAddressValid, isPropertyTypeValid });
          const result = isNameValid && isMobileValid && isAddressValid && isPropertyTypeValid;
          console.log(result ? "✅ All valid - button ENABLED" : "❌ Some invalid - button DISABLED");
          
          return result;
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

  // Watch form fields to trigger re-render when they change
  const watchedProjects = form.watch("projects");
  const watchedAdvancePercentage = form.watch("advancePaymentPercentage");
  const watchedCustomerData = form.watch("customerData");
  const watchedCustomerId = form.watch("customerId");
  useEffect(() => {
    const calculateTotals = () => {
      const values = form.getValues();
      const projects = values.projects || [];
      
      // totalSystemCost is now the sum of base prices (before GST)
      const totalSystemCost = projects.reduce((sum: number, project: any) => sum + (project.basePrice || 0), 0);
      const totalGSTAmount = projects.reduce((sum: number, project: any) => sum + (project.gstAmount || 0), 0);
      const totalWithGST = projects.reduce((sum: number, project: any) => sum + (project.projectValue || 0), 0);
      const totalSubsidyAmount = projects.reduce((sum: number, project: any) => sum + (project.subsidyAmount || 0), 0);
      const totalCustomerPayment = totalWithGST - totalSubsidyAmount;
      const advancePercentage = values.advancePaymentPercentage || 90;
      const advanceAmount = Math.round(totalCustomerPayment * (advancePercentage / 100));
      const balanceAmount = totalCustomerPayment - advanceAmount;

      form.setValue("totalSystemCost", totalSystemCost);
      form.setValue("totalGSTAmount", totalGSTAmount);
      form.setValue("totalWithGST", totalWithGST);
      form.setValue("totalSubsidyAmount", totalSubsidyAmount);
      form.setValue("totalCustomerPayment", totalCustomerPayment);
      form.setValue("advanceAmount", advanceAmount);
      form.setValue("balanceAmount", balanceAmount);
    };

    // Recalculate totals for both manual and site_visit sources
    calculateTotals();
  }, [watchedProjects, watchedAdvancePercentage, form]);

  const onSubmit = (data: QuotationFormData) => {
    // Validate business rules before submission
    const totalSystemCost = data.projects.reduce((sum, p) => sum + (p.basePrice || 0), 0);
    const totalGSTAmount = data.projects.reduce((sum, p) => sum + (p.gstAmount || 0), 0);
    const totalWithGST = data.projects.reduce((sum, p) => sum + p.projectValue, 0);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20" data-testid="quotation-creation-page">
      {/* Header Section */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/quotations")}
            data-testid="button-back"
            className="mb-4 -ml-2 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotations
          </Button>
          
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 shrink-0">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2" data-testid="text-page-title">
                Create New Quotation
              </h1>
              <p className="text-base text-muted-foreground">
                Generate professional quotations for solar energy systems with our streamlined process
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 overflow-x-hidden">
        {/* Progress indicator - Mobile: Simplified, Desktop: Full */}
        <div className="mb-6 md:mb-8">
          {/* Mobile Progress - Compact horizontal dots */}
          <div className="flex md:hidden items-center justify-between gap-2 mb-3">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const IconComponent = step.icon;
              
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div 
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      isCompleted 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : isActive 
                          ? "border-primary text-primary" 
                          : "border-muted-foreground text-muted-foreground"
                    }`}
                    data-testid={`step-indicator-${step.id}`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <IconComponent className="h-4 w-4" />
                    )}
                  </div>
                  {isActive && (
                    <div className="mt-2 text-center">
                      <p className="text-xs font-medium text-primary truncate max-w-[80px]">
                        {step.title}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Progress - Full stepper */}
          <div className="hidden lg:flex items-center gap-2">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const IconComponent = step.icon;
              
              return (
                <div key={step.id} className="flex items-center flex-1 min-w-0">
                  <div 
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 ${
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
                  
                  <div className="ml-2 min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </p>
                  </div>
                  
                  {index < WIZARD_STEPS.length - 1 && (
                    <div className={`mx-2 h-px bg-border w-8 shrink-0`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Tablet Progress - Compact vertical */}
          <div className="hidden md:grid lg:hidden grid-cols-5 gap-1.5">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const IconComponent = step.icon;
              
              return (
                <div key={step.id} className="flex flex-col items-center text-center min-w-0">
                  <div 
                    className={`flex items-center justify-center w-9 h-9 rounded-full border-2 mb-1.5 shrink-0 ${
                      isCompleted 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : isActive 
                          ? "border-primary text-primary" 
                          : "border-muted-foreground text-muted-foreground"
                    }`}
                    data-testid={`step-indicator-${step.id}`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <IconComponent className="h-4 w-4" />
                    )}
                  </div>
                  <p className={`text-[10px] leading-tight font-medium truncate w-full px-1 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {step.title}
                  </p>
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
                      // Clear customer data when switching to manual
                      form.setValue("customerData", undefined);
                      form.setValue("customerId", "");
                      setSelectedSiteVisit(null);
                      setSiteVisitMapping(null);
                    }}
                    data-testid="card-manual-creation"
                  >
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                          <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg">Manual Creation</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            Create quotation from scratch with custom inputs
                          </CardDescription>
                        </div>
                        <div className="shrink-0">
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
                      // Clear customer data when switching to site visit
                      form.setValue("customerData", undefined);
                      form.setValue("customerId", "");
                    }}
                    data-testid="card-site-visit-integration"
                  >
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 text-green-600 shrink-0">
                          <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg">From Site Visit</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            Auto-populate from existing site visit data
                          </CardDescription>
                        </div>
                        <div className="shrink-0">
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
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Select Site Visit</h4>
                        {(siteVisits as any)?.data?.length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {((siteVisits as any)?.data || []).filter((visit: any) => {
                              const searchLower = siteVisitSearchQuery.toLowerCase();
                              return visit.customer.name.toLowerCase().includes(searchLower) ||
                                     visit.customer.mobile.includes(searchLower);
                            }).length} of {(siteVisits as any)?.data?.length} visits
                          </span>
                        )}
                      </div>
                      
                      {isLoadingSiteVisits ? (
                        <div className="flex items-center justify-center p-8">
                          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                      ) : (siteVisits as any)?.data?.length > 0 ? (
                        <>
                          {/* Search Bar */}
                          <div className="mb-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search by customer name or mobile..."
                                value={siteVisitSearchQuery}
                                onChange={(e) => setSiteVisitSearchQuery(e.target.value)}
                                className="pl-9"
                                data-testid="input-site-visit-search"
                              />
                            </div>
                          </div>

                          {/* Site Visit List */}
                          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
                            {((siteVisits as any)?.data || [])
                              .filter((visit: any) => {
                                const searchLower = siteVisitSearchQuery.toLowerCase();
                                return visit.customer.name.toLowerCase().includes(searchLower) ||
                                       visit.customer.mobile.includes(searchLower);
                              })
                              .map((visit: SiteVisitMapping) => (
                                <Card 
                                  key={visit.id}
                                  className={`cursor-pointer border transition-colors ${
                                    selectedSiteVisit === visit.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => setSelectedSiteVisit(visit.id)}
                                  data-testid={`card-site-visit-${visit.id}`}
                                >
                                  <CardContent className="p-3 sm:p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center flex-wrap gap-2 mb-2">
                                          <h5 className="font-medium text-sm sm:text-base">{visit.customer.name}</h5>
                                          <Badge 
                                            variant={(visit as any).status === 'completed' ? 'default' : 'secondary'}
                                            className="text-xs"
                                          >
                                            {(visit as any).status === 'completed' ? 'Completed' : 'On Process'}
                                          </Badge>
                                          <Badge 
                                            variant={(visit as any).visitOutcome === 'converted' ? 'default' : 'outline'}
                                            className="text-xs"
                                          >
                                            {(visit as any).visitOutcome === 'converted' ? 'Converted' : 'On Process'}
                                          </Badge>
                                        </div>
                                        <p className="text-xs sm:text-sm text-muted-foreground">{visit.customer.mobile}</p>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{visit.customer.address}</p>
                                        {(visit as any).visitDate && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Visit: {new Date((visit as any).visitDate).toLocaleDateString('en-IN', { 
                                              day: '2-digit', 
                                              month: 'short', 
                                              year: 'numeric' 
                                            })}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-primary">
                                          {visit.completenessAnalysis.completenessScore}%
                                        </span>
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

                          {/* No Results Message */}
                          {((siteVisits as any)?.data || [])
                            .filter((visit: any) => {
                              const searchLower = siteVisitSearchQuery.toLowerCase();
                              return visit.customer.name.toLowerCase().includes(searchLower) ||
                                     visit.customer.mobile.includes(searchLower);
                            }).length === 0 && siteVisitSearchQuery && (
                            <Alert className="mt-3">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                No site visits found matching "{siteVisitSearchQuery}"
                              </AlertDescription>
                            </Alert>
                          )}
                        </>
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
                  <ManualCustomerDetailsForm form={form} />
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
                  Review and edit pricing calculations and payment terms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Editable Pricing Table */}
                <div className="space-y-4">
                  <h4 className="font-medium text-base">Quotation Pricing Details</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">Description</th>
                          <th className="text-center p-3 text-sm font-medium w-24">kW</th>
                          <th className="text-right p-3 text-sm font-medium w-32">Rate/kW (₹)</th>
                          <th className="text-right p-3 text-sm font-medium w-36">Base Value (₹)</th>
                          <th className="text-right p-3 text-sm font-medium w-32">GST/kW (₹)</th>
                          <th className="text-right p-3 text-sm font-medium w-24">GST %</th>
                          <th className="text-right p-3 text-sm font-medium w-36">GST Amount (₹)</th>
                          <th className="text-right p-3 text-sm font-medium w-40">Total Value (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.watch("projects").map((project: any, index: number) => {
                          const systemKW = project.systemKW || 0;
                          const basePrice = project.basePrice || 0;
                          const gstAmount = project.gstAmount || 0;
                          const gstPercentage = project.gstPercentage || 18;
                          const projectValue = project.projectValue || 0;
                          
                          // Use same rounding logic as Project Configuration step
                          const roundedSystemKW = systemKW > 0 
                            ? (systemKW <= 3.5 ? Math.floor(systemKW) : Math.ceil(systemKW))
                            : 0;
                          
                          // Calculate Rate/kW and GST/kW using ROUNDED systemKW
                          const calculatedRatePerKW = basePrice && roundedSystemKW > 0
                            ? Math.round(basePrice / roundedSystemKW)
                            : 0;
                          
                          const calculatedGSTPerKW = gstAmount && roundedSystemKW > 0
                            ? Math.round(gstAmount / roundedSystemKW)
                            : 0;
                          
                          return (
                            <tr key={index} className="border-t">
                              <td className="p-3 text-sm">
                                Supply and Installation of {systemKW}kw {project.projectType === 'on_grid' ? 'On-Grid' : project.projectType === 'off_grid' ? 'Off-Grid' : project.projectType === 'hybrid' ? 'Hybrid' : project.projectType} Solar System
                              </td>
                              <td className="p-3 text-center">
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  value={systemKW} 
                                  onChange={(e) => {
                                    const newKW = parseFloat(e.target.value) || 0;
                                    const newRoundedKW = newKW > 0 
                                      ? (newKW <= 3.5 ? Math.floor(newKW) : Math.ceil(newKW))
                                      : 0;
                                    const newBasePrice = Math.round(newRoundedKW * calculatedRatePerKW);
                                    const newGSTAmount = Math.round(newBasePrice * (gstPercentage / 100));
                                    const newProjectValue = newBasePrice + newGSTAmount;
                                    
                                    // Recalculate subsidy based on new kW
                                    const propertyType = getPropertyType();
                                    const newSubsidy = calculateSubsidy(newKW, propertyType, project.projectType);
                                    const newCustomerPayment = newProjectValue - newSubsidy;
                                    
                                    form.setValue(`projects.${index}.systemKW`, newKW);
                                    form.setValue(`projects.${index}.basePrice`, newBasePrice);
                                    form.setValue(`projects.${index}.gstAmount`, newGSTAmount);
                                    form.setValue(`projects.${index}.projectValue`, newProjectValue);
                                    form.setValue(`projects.${index}.subsidyAmount`, newSubsidy);
                                    form.setValue(`projects.${index}.customerPayment`, newCustomerPayment);
                                  }}
                                  className="w-20 text-center"
                                  data-testid={`input-systemkw-${index}`}
                                />
                              </td>
                              <td className="p-3 text-right">
                                <Input 
                                  type="number" 
                                  value={calculatedRatePerKW} 
                                  onChange={(e) => {
                                    const newPricePerKW = parseFloat(e.target.value) || 0;
                                    const newBasePrice = Math.round(roundedSystemKW * newPricePerKW);
                                    const newGSTAmount = Math.round(newBasePrice * (gstPercentage / 100));
                                    const newProjectValue = newBasePrice + newGSTAmount;
                                    
                                    // Recalculate subsidy (subsidy doesn't change with price, only with kW)
                                    const propertyType = getPropertyType();
                                    const newSubsidy = calculateSubsidy(systemKW, propertyType, project.projectType);
                                    const newCustomerPayment = newProjectValue - newSubsidy;
                                    
                                    form.setValue(`projects.${index}.pricePerKW`, newPricePerKW);
                                    form.setValue(`projects.${index}.basePrice`, newBasePrice);
                                    form.setValue(`projects.${index}.gstAmount`, newGSTAmount);
                                    form.setValue(`projects.${index}.projectValue`, newProjectValue);
                                    form.setValue(`projects.${index}.subsidyAmount`, newSubsidy);
                                    form.setValue(`projects.${index}.customerPayment`, newCustomerPayment);
                                  }}
                                  className="w-28 text-right"
                                  data-testid={`input-priceperkw-${index}`}
                                />
                              </td>
                              <td className="p-3 text-right font-medium">
                                ₹{basePrice.toLocaleString()}
                              </td>
                              <td className="p-3 text-right">
                                <span className="text-sm">{calculatedGSTPerKW.toLocaleString()}</span>
                              </td>
                              <td className="p-3 text-right">
                                <Input 
                                  type="number" 
                                  value={gstPercentage} 
                                  onChange={(e) => {
                                    const newGSTPercentage = parseFloat(e.target.value) || 0;
                                    const newGSTAmount = Math.round(basePrice * (newGSTPercentage / 100));
                                    const newProjectValue = basePrice + newGSTAmount;
                                    
                                    // Recalculate subsidy (subsidy doesn't change with GST)
                                    const propertyType = getPropertyType();
                                    const newSubsidy = calculateSubsidy(systemKW, propertyType, project.projectType);
                                    const newCustomerPayment = newProjectValue - newSubsidy;
                                    
                                    form.setValue(`projects.${index}.gstPercentage`, newGSTPercentage);
                                    form.setValue(`projects.${index}.gstAmount`, newGSTAmount);
                                    form.setValue(`projects.${index}.projectValue`, newProjectValue);
                                    form.setValue(`projects.${index}.subsidyAmount`, newSubsidy);
                                    form.setValue(`projects.${index}.customerPayment`, newCustomerPayment);
                                  }}
                                  className="w-20 text-right"
                                  data-testid={`input-gstpercentage-${index}`}
                                />
                              </td>
                              <td className="p-3 text-right font-medium">
                                ₹{gstAmount.toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-medium">
                                ₹{projectValue.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-t-2 bg-muted/30">
                          <td colSpan={3} className="p-3 text-sm font-medium">Totals:</td>
                          <td className="p-3 text-right font-medium">₹{form.watch("totalSystemCost")?.toLocaleString()}</td>
                          <td colSpan={2} className="p-3 text-sm font-medium text-right">Total GST:</td>
                          <td className="p-3 text-right font-medium">₹{form.watch("totalGSTAmount")?.toLocaleString()}</td>
                          <td className="p-3 text-right font-medium">₹{form.watch("totalWithGST")?.toLocaleString()}</td>
                        </tr>
                        <tr className="border-t bg-primary/10">
                          <td colSpan={7} className="p-3 text-sm font-bold">Grand Total (Including GST):</td>
                          <td className="p-3 text-right font-bold text-lg text-primary">₹{form.watch("totalWithGST")?.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="text-sm text-muted-foreground italic">
                    Amount in words: <span className="font-medium">Rupees {(() => {
                      const amount = form.watch("totalWithGST") || 0;
                      const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
                      const lakhs = Math.floor(amount / 100000);
                      const thousands = Math.floor((amount % 100000) / 1000);
                      const hundreds = Math.floor((amount % 1000) / 100);
                      let result = "";
                      if (lakhs > 0) result += `${words[lakhs]} Lac${lakhs > 1 ? 's' : ''} `;
                      if (thousands > 0) result += `${words[thousands]} Thousand `;
                      if (hundreds > 0) result += `${words[hundreds]} Hundred `;
                      return result + "Only";
                    })()}</span>
                  </div>
                </div>

                {/* Warranty Details */}
                <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="font-medium text-base flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Warranty Details
                  </h4>
                  <div className="text-sm space-y-2">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">***Physical Damages will not be Covered***</p>
                    <div className="space-y-1">
                      <p className="font-semibold">1. Solar (PV) Panel Modules (30 Years)</p>
                      <ul className="list-disc list-inside ml-4 space-y-0.5 text-muted-foreground">
                        <li>15 Years Manufacturing defect Warranty</li>
                        <li>15 Years Service Warranty</li>
                        <li>90% Performance Warranty till the end of 15 years</li>
                        <li>80% Performance Warranty till the end of 15 years</li>
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold">2. Solar On grid Inverter (15 Years)</p>
                      <ul className="list-disc list-inside ml-4 space-y-0.5 text-muted-foreground">
                        <li>Replacement Warranty for 10 Years</li>
                        <li>Service Warranty for 5 Years</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Terms */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-base">Payment Details</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <FormField
                          control={form.control}
                          name="advancePaymentPercentage"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Advance Percentage</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <Input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    {...field}
                                    onChange={(e) => {
                                      const percentage = parseFloat(e.target.value) || 0;
                                      field.onChange(percentage);
                                      const totalCustomerPayment = form.watch("totalCustomerPayment") || 0;
                                      const advanceAmount = Math.round(totalCustomerPayment * (percentage / 100));
                                      const balanceAmount = totalCustomerPayment - advanceAmount;
                                      form.setValue("advanceAmount", advanceAmount);
                                      form.setValue("balanceAmount", balanceAmount);
                                    }}
                                    className="w-24"
                                    data-testid="input-advance-percentage"
                                  />
                                  <span className="text-sm">%</span>
                                  <span className="text-sm text-muted-foreground flex-1 text-right">₹{form.watch("advanceAmount")?.toLocaleString() || 0}</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {form.watch("advancePaymentPercentage")}% Advance along with Purchase Order
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-2">Balance Percentage</p>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              value={100 - (form.watch("advancePaymentPercentage") || 0)}
                              disabled
                              className="w-24"
                              data-testid="input-balance-percentage"
                            />
                            <span className="text-sm">%</span>
                            <span className="text-sm text-muted-foreground flex-1 text-right">₹{form.watch("balanceAmount")?.toLocaleString() || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {100 - (form.watch("advancePaymentPercentage") || 0)}% Immediately after completion of work
                      </div>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-base">Payment Account Details</h4>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="accountDetails.bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Bank</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (value === "ICICI") {
                                  form.setValue("accountDetails.branch", "Subramaniapuram,Madurai");
                                  form.setValue("accountDetails.accountNumber", "60130521400");
                                  form.setValue("accountDetails.ifscCode", "ICIC0006013");
                                } else if (value === "State Bank of India") {
                                  form.setValue("accountDetails.branch", "Madurai Main Branch");
                                  form.setValue("accountDetails.accountNumber", "31746205818");
                                  form.setValue("accountDetails.ifscCode", "SBIN0001766");
                                }
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-bank">
                                  <SelectValue placeholder="Select bank" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ICICI">ICICI</SelectItem>
                                <SelectItem value="State Bank of India">SBI</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody>
                            <tr className="border-b">
                              <td className="p-2 font-medium bg-muted">Name</td>
                              <td className="p-2">Prakash Green Energy</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 font-medium bg-muted">Bank</td>
                              <td className="p-2">{form.watch("accountDetails.bankName") || "ICICI"}</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 font-medium bg-muted">Branch</td>
                              <td className="p-2">{form.watch("accountDetails.branch") || "Subramaniapuram,Madurai"}</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 font-medium bg-muted">Acct No</td>
                              <td className="p-2">{form.watch("accountDetails.accountNumber") || "60130521400"}</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium bg-muted">IFS Code</td>
                              <td className="p-2">{form.watch("accountDetails.ifscCode") || "ICIC0006013"}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Period */}
                <div className="space-y-3">
                  <h4 className="font-medium text-base">Delivery Period</h4>
                  <FormField
                    control={form.control}
                    name="deliveryTimeframe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Timeframe</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-delivery-timeframe" className="max-w-xs">
                              <SelectValue placeholder="Select delivery timeframe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1_2_weeks">1-2 weeks from confirmation</SelectItem>
                            <SelectItem value="2_3_weeks">2-3 weeks from confirmation</SelectItem>
                            <SelectItem value="3_4_weeks">3-4 weeks from confirmation</SelectItem>
                            <SelectItem value="1_month">1 month from confirmation</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    • {form.watch("deliveryTimeframe")?.replace(/_/g, '-') || '2-3 weeks'} from the date of confirmation of order
                  </p>
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
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="font-medium text-sm sm:text-base">Quotation Summary</h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground">Source:</span>
                        <Badge variant="outline" className="text-xs">
                          {quotationSource === "site_visit" ? "Site Visit" : "Manual"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground">Projects:</span>
                        <span className="font-medium">{form.watch("projects").length} system(s)</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground">Total Value:</span>
                        <span className="font-medium">₹{form.watch("totalCustomerPayment")?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground">Delivery:</span>
                        <span className="font-medium">{form.watch("deliveryTimeframe")?.replace('_', '-') || 'TBD'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="font-medium text-sm sm:text-base">Quality Check</h4>
                    {quotationSource === "site_visit" && siteVisitMapping && (
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-muted-foreground">Data Completeness:</span>
                          <Badge variant={
                            (siteVisitMapping as any).completenessAnalysis?.qualityGrade === 'A' ? 'default' :
                            (siteVisitMapping as any).completenessAnalysis?.qualityGrade === 'B' ? 'secondary' : 'destructive'
                          } className="text-xs">
                            Grade {(siteVisitMapping as any).completenessAnalysis?.qualityGrade || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center gap-2">
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

                {/* Scope of Work */}
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-medium text-base">Scope of Work</h4>
                  {form.watch("projects").map((project: any, index: number) => {
                    const structureTypeMap: Record<string, string> = {
                      'gp_structure': 'GI Pole',
                      'mono_rail': 'Mono Rail',
                      'gi_round_pipe': 'GI Round Pipe',
                      'ms_square_pipe': 'MS Square Pipe'
                    };
                    
                    const structureType = structureTypeMap[project.structureType] || 'GI Pole';
                    const floorLevel = project.floorLevel || 'ground';
                    const lowerHeight = project.lowerEndHeight || '7';
                    const higherHeight = project.higherEndHeight || '8';
                    
                    return (
                      <div key={index} className="space-y-3">
                        {index > 0 && <Separator className="my-3" />}
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-semibold">1) Structure</span>
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li>
                                For {project.projectType === 'on_grid' ? 'On-Grid' : project.projectType === 'off_grid' ? 'Off-Grid' : project.projectType === 'hybrid' ? 'Hybrid' : project.projectType}, 
                                South facing slant mounting of lower end height is {lowerHeight} feet & {higherHeight} feet at higher end. 
                                ({floorLevel === 'ground' ? 'Ground Floor' : floorLevel === '1st_floor' ? '1st Floor' : floorLevel === '2nd_floor' ? '2nd Floor' : floorLevel === '3rd_floor' ? '3rd Floor' : 'Ground Floor'})
                              </li>
                            </ul>
                          </div>
                          
                          <div>
                            <span className="font-semibold">2) Net (Bi-directional) Meter</span>
                            <ul className="list-disc list-inside ml-4 mt-1">
                              <li>We will take the responsibility of applying to EB at Customer's Expense.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Customer's Scope of Work */}
                <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <h4 className="font-medium text-base">Customer's Scope of Work</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-semibold">1) Civil work</span>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Earth pit digging</li>
                        {form.watch("projects").some((p: any) => p.structureType === 'gp_structure' || p.structureType === 'ms_square_pipe') && (
                          <li>1 feet chamber and concrete (for Structure)</li>
                        )}
                      </ul>
                    </div>
                    
                    <div>
                      <span className="font-semibold">2) Net (Bi-directional) Meter</span>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Application and Installation charges for net meter to be paid by Customer.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Documents Required */}
                <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h4 className="font-medium text-base">Documents Required for PM Surya Ghar</h4>
                  <div className="space-y-2 text-sm">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>EB Number</li>
                      <li>EB Register Mobile Number</li>
                      <li>Email ID</li>
                      <li>Aadhar Card</li>
                      <li>PAN Card</li>
                      <li>Passport Size Photo -1</li>
                      <li>Property Tax Copy</li>
                      <li>Bank Passbook</li>
                      <li>Cancelled Cheque</li>
                    </ol>
                    <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded">
                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                        *All Required Documents should be in the same name as mention EB Service Number
                      </p>
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
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4 pb-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              data-testid="button-previous"
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep === WIZARD_STEPS.length - 1 ? (
              <Button
                type="submit"
                disabled={!canProceed() || createQuotationMutation.isPending}
                data-testid="button-submit"
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {createQuotationMutation.isPending ? "Creating..." : "Create Quotation"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed()}
                data-testid="button-next"
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
