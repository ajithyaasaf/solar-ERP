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
  Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertQuotationSchema, type InsertQuotation, type QuotationProject } from "@shared/schema";

// Create form-compatible schema that validates against backend requirements
const quotationFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  source: z.enum(["manual", "site_visit"]),
  projects: z.array(z.any()).min(1, "At least one project is required"), // Will be properly typed later
  totalSystemCost: z.number().min(0),
  totalSubsidyAmount: z.number().min(0).default(0),
  totalCustomerPayment: z.number().min(0),
  advancePaymentPercentage: z.number().min(0).max(100).default(90),
  advanceAmount: z.number().min(0),
  balanceAmount: z.number().min(0),
  paymentTerms: z.enum(["advance_90_balance_10", "full_advance", "custom"]).default("advance_90_balance_10"),
  deliveryTimeframe: z.enum(["1_2_weeks", "2_3_weeks", "3_4_weeks", "1_month"]).default("2_3_weeks"),
  termsTemplate: z.enum(["standard", "residential", "commercial", "agri"]).default("standard"),
  status: z.enum(["draft", "sent", "approved", "rejected"]).default("draft"),
  followUps: z.array(z.any()).default([]),
  communicationPreference: z.enum(["email", "whatsapp", "sms", "print"]).default("whatsapp"),
  documentVersion: z.number().default(1),
  preparedBy: z.string().default(""),
  internalNotes: z.string().optional(),
  customerNotes: z.string().optional(),
  attachments: z.array(z.string()).default([]),
  siteVisitMapping: z.any().optional()
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
    offGridPerKW: 68000,
    hybridPerKW: 68000
  },
  subsidy: {
    onGridPerKW: 26000,
    hybridPerKW: 26000,
    offGridPerKW: 0,
    waterHeater: 0,
    waterPump: 0
  },
  payment: {
    advancePercentage: 90,
    balancePercentage: 10
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

  // Fetch site visit mapping data when selected
  const { data: mappingData, isLoading: isLoadingMapping } = useQuery({
    queryKey: ["/api/quotations/site-visits", selectedSiteVisit, "mapping-data"],
    enabled: !!selectedSiteVisit && quotationSource === "site_visit"
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
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
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
      
      form.reset({
        ...form.getValues(),
        source: "site_visit", // Ensure source is properly set
        customerId: data.customerId || "",
        projects: mappedProjects,
        totalSystemCost: data.totalSystemCost || 0,
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
        siteVisitMapping: (mappingData as any).mappingMetadata
      });
      
      setSiteVisitMapping(mappingData);
      
      toast({
        title: "Site Visit Data Mapped",
        description: `Mapped with ${(mappingData as any).completenessAnalysis?.completenessScore || 0}% completeness.`
      });
    }
  }, [mappingData, form]);

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
        return values.customerId !== undefined && values.customerId !== "";
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
      const totalSubsidyAmount = projects.reduce((sum: number, project: any) => sum + (project.subsidyAmount || 0), 0);
      const totalCustomerPayment = totalSystemCost - totalSubsidyAmount;
      const advanceAmount = Math.round(totalCustomerPayment * 0.9);
      const balanceAmount = totalCustomerPayment - advanceAmount;

      form.setValue("totalSystemCost", totalSystemCost);
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
    const totalSubsidyAmount = data.projects.reduce((sum, p) => sum + p.subsidyAmount, 0);
    const calculatedCustomerPayment = totalSystemCost - totalSubsidyAmount;
    
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
                    "Review and update customer details from site visit" :
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
                  <div className="space-y-4">
                    {siteVisitMapping && (
                      <Alert>
                        <Check className="h-4 w-4" />
                        <AlertDescription>
                          Customer details have been automatically populated from the selected site visit.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Customer information is automatically mapped from site visit data.
                    </div>
                  </div>
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
                {quotationSource === "site_visit" && siteVisitMapping ? (
                  <div className="space-y-4">
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertDescription>
                        Project configurations have been automatically mapped from site visit marketing data.
                      </AlertDescription>
                    </Alert>
                    
                    {/* Display mapped projects */}
                    <div className="grid gap-4">
                      {form.watch("projects").map((project: any, index: number) => (
                        <Card key={index} className="border">
                          <CardHeader className="pb-4">
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
                          </CardHeader>
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
                              {project.subsidyAmount && (
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
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <Plus className="h-4 w-4" />
                      <AlertDescription>
                        Manual project configuration is coming soon. Please use site visit integration for now.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
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
                        <span className="text-muted-foreground">Total System Cost:</span>
                        <span className="font-medium">₹{form.watch("totalSystemCost")?.toLocaleString() || 0}</span>
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
                      <Separator />
                      <div className="text-sm text-muted-foreground">
                        Balance payment after installation completion
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Terms */}
                <div className="space-y-4">
                  <h4 className="font-medium">Terms & Conditions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryTimeframe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Timeframe</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-delivery-timeframe">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1_2_weeks">1-2 Weeks</SelectItem>
                              <SelectItem value="2_3_weeks">2-3 Weeks</SelectItem>
                              <SelectItem value="3_4_weeks">3-4 Weeks</SelectItem>
                              <SelectItem value="1_month">1 Month</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="termsTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Terms Template</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-terms-template">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="standard">Standard Terms</SelectItem>
                              <SelectItem value="residential">Residential Terms</SelectItem>
                              <SelectItem value="commercial">Commercial Terms</SelectItem>
                              <SelectItem value="agri">Agricultural Terms</SelectItem>
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
                          <FormLabel>Communication</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-communication">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="phone">Phone Call</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes for customer..."
                            {...field}
                            data-testid="input-customer-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Internal notes (not visible to customer)..."
                            {...field}
                            data-testid="input-internal-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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