import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EnterpriseQuotation, insertQuotationSchema, QuotationProjectType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TemplateEngine } from "./templates/template-engine";
import { 
  Plus, 
  Trash2, 
  Save, 
  Calculator, 
  FileText, 
  User, 
  Package, 
  Shield,
  CreditCard,
  Building,
  Clock,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";

interface Customer {
  id?: string;
  name: string;
  mobile: string;
  address: string;
  email?: string;
}

interface SiteVisitData {
  customer?: {
    id?: string;
    name: string;
    mobile: string;
    address: string;
    propertyType: string;
    ebServiceNumber?: string;
  };
  id: string;
  visitPurpose: string;
  department: string;
  status: string;
  technicalData?: any;
  marketingData?: any;
  adminData?: any;
}

interface UnifiedQuotationBuilderProps {
  // Pre-populated data from site visit OR null for standalone
  initialData?: Partial<EnterpriseQuotation>[];
  mode: 'site_visit' | 'standalone' | 'edit';
  customerId?: string;
  siteVisitId?: string;
  quotationId?: string; // For edit mode
  onSave?: (quotations: EnterpriseQuotation[]) => void;
  onCancel?: () => void;
}

// Form schema for project details
const projectFormSchema = z.object({
  projectType: z.enum(['on_grid', 'off_grid', 'hybrid', 'water_heater', 'water_pump', 'solar_panel', 'camera', 'lights_accessories', 'others'] as const),
  systemCapacity: z.string().min(1, "System capacity is required"),
  projectTitle: z.string().min(1, "Project title is required"),
  customRequirements: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

// Helper function to generate quotations from site visit technical data
function generateQuotationsFromSiteVisit(siteVisitData: SiteVisitData): Partial<EnterpriseQuotation>[] {
  const quotations: Partial<EnterpriseQuotation>[] = [];
  
  // Extract marketing data which contains the technical specifications
  const marketingData = siteVisitData.marketingData;
  if (!marketingData?.updateRequirements) {
    return [];
  }

  // Generate quotations for all configured project types
  const configMappings = [
    { projectType: 'on_grid' as QuotationProjectType, config: marketingData.onGridConfig },
    { projectType: 'off_grid' as QuotationProjectType, config: marketingData.offGridConfig },
    { projectType: 'hybrid' as QuotationProjectType, config: marketingData.hybridConfig },
    { projectType: 'water_heater' as QuotationProjectType, config: marketingData.waterHeaterConfig },
    { projectType: 'water_pump' as QuotationProjectType, config: marketingData.waterPumpConfig }
  ];
  
  for (const { projectType, config } of configMappings) {
    if (config) {
      const quotation = createQuotationFromConfig(projectType, config, siteVisitData);
      quotations.push(quotation);
    }
  }
  
  return quotations;
}

// Get configuration data for specific project type
function getConfigForProjectType(marketingData: any, projectType: QuotationProjectType) {
  switch (projectType) {
    case 'on_grid':
      return marketingData.onGridConfig;
    case 'off_grid':
      return marketingData.offGridConfig;
    case 'hybrid':
      return marketingData.hybridConfig;
    case 'water_heater':
      return marketingData.waterHeaterConfig;
    case 'water_pump':
      return marketingData.waterPumpConfig;
    default:
      return null;
  }
}

// Create detailed quotation from technical configuration
function createQuotationFromConfig(
  projectType: QuotationProjectType, 
  config: any, 
  siteVisitData: SiteVisitData
): Partial<EnterpriseQuotation> {
  // Generate system capacity based on configuration
  const systemCapacity = generateSystemCapacity(projectType, config);
  
  // Generate project title
  const projectTitle = generateProjectTitle(projectType, systemCapacity, config);
  
  // Generate Bill of Materials from technical specifications
  const billOfMaterials = generateBOMFromConfig(projectType, config);
  
  // Generate warranty information
  const warranties = generateWarranties(projectType, config);
  
  // Generate scope of work
  const { companyScope, customerScope } = generateScopeOfWork(projectType, config);
  
  return {
    projectType,
    systemCapacity,
    projectTitle,
    billOfMaterials,
    warranties,
    companyScope,
    customerScope,
    paymentTerms: {
      advancePercentage: 90,
      balancePercentage: 10,
      advanceTrigger: 'along_with_purchase_order',
      balanceTrigger: 'after_completion_of_work'
    },
    templateData: {
      templateType: getTemplateType(projectType),
      companyLetterhead: true,
      customerReference: `Based on site visit assessment`,
      subjectLine: `Quotation for ${projectTitle}`,
      introductionText: 'We are pleased to submit our technical and commercial offer for your solar power requirement based on our site assessment',
      managingDirectorName: 'Mr. M. Selva Prakash',
      contactPerson: 'Sales Team'
    },
    deliveryPeriod: '2-3 Weeks from order confirmation',
    status: 'draft',
    notes: `Generated from site visit. Technical specifications: ${JSON.stringify(config, null, 2)}`
  };
}

// Generate system capacity from technical configuration
function generateSystemCapacity(projectType: QuotationProjectType, config: any): string {
  switch (projectType) {
    case 'on_grid':
    case 'off_grid':
    case 'hybrid':
      // Priority 1: Use panel capacity (most accurate for solar systems)
      if (config.panelWatts && config.panelCount) {
        const panelWatts = parseFloat(config.panelWatts.toString().replace(/[^0-9.]/g, ''));
        const totalWatts = panelWatts * config.panelCount;
        return `${(totalWatts / 1000).toFixed(1)}kW`;
      }
      
      // Priority 2: Use inverter capacity
      if (config.inverterKW && config.inverterQty) {
        return `${(config.inverterKW * config.inverterQty)}kW`;
      }
      
      // Priority 3: Parse inverter watts string
      if (config.inverterWatts) {
        const inverterString = config.inverterWatts.toString().toLowerCase();
        let capacity = 0;
        
        if (inverterString.includes('kw')) {
          capacity = parseFloat(inverterString.replace(/[^0-9.]/g, ''));
        } else if (inverterString.includes('w')) {
          capacity = parseFloat(inverterString.replace(/[^0-9.]/g, '')) / 1000;
        } else {
          // Assume kW if no unit specified
          capacity = parseFloat(inverterString.replace(/[^0-9.]/g, ''));
        }
        
        const qty = config.inverterQty || 1;
        return `${(capacity * qty)}kW`;
      }
      
      return '3kW'; // Default
      
    case 'water_heater':
      return config.litre ? `${config.litre}L` : '200L';
      
    case 'water_pump':
      return config.hp ? `${config.hp}HP` : '3HP';
      
    default:
      return '1kW';
  }
}

// Generate descriptive project title
function generateProjectTitle(projectType: QuotationProjectType, systemCapacity: string, config: any): string {
  const baseTitle = {
    'on_grid': 'On-Grid Solar Power Generation System',
    'off_grid': 'Off-Grid Solar Power Generation System',
    'hybrid': 'Hybrid Solar Power Generation System',
    'water_heater': 'Solar Water Heater System',
    'water_pump': 'Solar Water Pump System',
    'solar_panel': 'Solar Panel Installation',
    'camera': 'Security Camera Installation',
    'lights_accessories': 'Lights & Accessories Installation',
    'others': 'Solar Equipment Installation'
  }[projectType] || 'Solar System';
  
  return `${systemCapacity} ${baseTitle}`;
}

// Generate Bill of Materials from technical specifications
function generateBOMFromConfig(projectType: QuotationProjectType, config: any): Array<any> {
  const bom: Array<any> = [];
  
  switch (projectType) {
    case 'on_grid':
    case 'off_grid':
    case 'hybrid':
      // Solar panels
      if (config.solarPanelMake && config.panelWatts && config.panelCount) {
        bom.push({
          category: 'solar_panels',
          item: `${config.panelWatts}W Solar Panel`,
          specification: `${config.solarPanelMake?.join(', ')} - ${config.panelWatts}W Monocrystalline`,
          brand: config.solarPanelMake?.join(', '),
          quantity: config.panelCount,
          unit: 'Nos'
        });
      }
      
      // Inverters
      if (config.inverterMake && config.inverterWatts) {
        bom.push({
          category: 'inverter',
          item: `${config.inverterWatts} Inverter`,
          specification: `${config.inverterMake?.join(', ')} - ${config.inverterWatts} ${config.inverterPhase} Inverter`,
          brand: config.inverterMake?.join(', '),
          quantity: config.inverterQty || 1,
          unit: 'Nos'
        });
      }
      
      // Batteries (for off-grid and hybrid)
      if ((projectType === 'off_grid' || projectType === 'hybrid') && config.batteryBrand && config.batteryAH) {
        bom.push({
          category: 'batteries',
          item: `${config.batteryAH}AH Battery`,
          specification: `${config.batteryBrand} - ${config.batteryAH}AH ${config.batteryType || 'Tubular'} Battery`,
          brand: config.batteryBrand,
          quantity: config.batteryCount || 1,
          unit: 'Nos'
        });
      }
      
      // Mounting structure
      if (config.structureType) {
        bom.push({
          category: 'mounting_structure',
          item: 'Mounting Structure',
          specification: `${config.structureType} - Height: ${config.structureHeight}ft`,
          quantity: 1,
          unit: 'Set'
        });
      }
      
      // Earthing
      if (config.earth) {
        bom.push({
          category: 'electrical',
          item: 'Earthing Kit',
          specification: `${config.earth.toUpperCase()} Earthing with Lightning Arrester: ${config.lightningArrest ? 'Yes' : 'No'}`,
          quantity: 1,
          unit: 'Set'
        });
      }
      
      break;
      
    case 'water_heater':
      if (config.brand && config.litre) {
        bom.push({
          category: 'solar_panels',
          item: `${config.litre}L Solar Water Heater`,
          specification: `${config.brand} - ${config.litre}L Capacity Solar Water Heater`,
          brand: config.brand,
          quantity: 1,
          unit: 'Nos'
        });
      }
      break;
      
    case 'water_pump':
      if (config.hp && config.drive) {
        bom.push({
          category: 'electrical',
          item: `${config.hp}HP Solar Water Pump`,
          specification: `${config.hp}HP ${config.drive} Drive Solar Water Pump`,
          quantity: 1,
          unit: 'Nos'
        });
      }
      
      if (config.panelBrand && config.panelCount) {
        bom.push({
          category: 'solar_panels',
          item: 'Solar Panels for Pump',
          specification: `${config.panelBrand?.join(', ')} Solar Panels`,
          brand: config.panelBrand?.join(', '),
          quantity: config.panelCount,
          unit: 'Nos'
        });
      }
      break;
  }
  
  // Add installation charges
  bom.push({
    category: 'installation',
    item: 'Installation & Commissioning',
    specification: 'Complete system installation, testing and commissioning',
    quantity: 1,
    unit: 'Job'
  });
  
  return bom;
}

// Generate warranty information
function generateWarranties(projectType: QuotationProjectType, config: any): Array<any> {
  const warranties = [];
  
  switch (projectType) {
    case 'on_grid':
    case 'off_grid':
    case 'hybrid':
      warranties.push(
        {
          component: 'solar_panels',
          manufacturingWarranty: '25 Years',
          serviceWarranty: '5 Years',
          performanceWarranty: '90% till 10 years, 80% till 25 years',
          exclusions: ['Physical Damages', 'Natural Calamities']
        },
        {
          component: 'inverter',
          manufacturingWarranty: '5 Years',
          serviceWarranty: '5 Years',
          exclusions: ['Physical Damages', 'Power Surges']
        }
      );
      
      if (projectType === 'off_grid' || projectType === 'hybrid') {
        warranties.push({
          component: 'batteries',
          manufacturingWarranty: '3 Years',
          serviceWarranty: '2 Years',
          exclusions: ['Physical Damages', 'Overcharging']
        });
      }
      break;
      
    case 'water_heater':
      warranties.push({
        component: 'water_heater',
        manufacturingWarranty: '5 Years',
        serviceWarranty: '3 Years',
        exclusions: ['Physical Damages', 'Scale Formation']
      });
      break;
      
    case 'water_pump':
      warranties.push({
        component: 'water_pump',
        manufacturingWarranty: '2 Years',
        serviceWarranty: '1 Year',
        exclusions: ['Physical Damages', 'Dry Running']
      });
      break;
  }
  
  return warranties;
}

// Generate scope of work
function generateScopeOfWork(projectType: QuotationProjectType, config: any) {
  const companyScope = [];
  const customerScope = [];
  
  // Company responsibilities
  companyScope.push(
    {
      category: 'installation',
      description: 'Complete system design and installation',
      included: true
    },
    {
      category: 'electrical',
      description: 'Electrical connections and safety measures',
      included: true
    },
    {
      category: 'documentation',
      description: 'System documentation and user manual',
      included: true
    }
  );
  
  // Add project-specific scope
  if (config.civilWorkScope) {
    companyScope.push({
      category: 'civil_work',
      description: config.civilWorkScope,
      included: true
    });
  }
  
  if (config.netMeterScope) {
    companyScope.push({
      category: 'electrical',
      description: `Net Meter: ${config.netMeterScope}`,
      included: true
    });
  }
  
  // Customer responsibilities
  customerScope.push(
    {
      category: 'site_preparation',
      description: 'Provide clear access to installation site',
      customerResponsibility: true
    },
    {
      category: 'permissions',
      description: 'Obtain necessary local permissions if required',
      customerResponsibility: true
    },
    {
      category: 'civil_work',
      description: 'Basic civil work for foundation (if not included)',
      customerResponsibility: true
    }
  );
  
  return { companyScope, customerScope };
}

// Get appropriate template type
function getTemplateType(projectType: QuotationProjectType): 'on_grid_template' | 'off_grid_template' | 'hybrid_template' | 'water_heater_template' | 'water_pump_template' {
  switch (projectType) {
    case 'on_grid':
      return 'on_grid_template';
    case 'off_grid':
      return 'off_grid_template';
    case 'hybrid':
      return 'hybrid_template';
    case 'water_heater':
      return 'water_heater_template';
    case 'water_pump':
      return 'water_pump_template';
    default:
      return 'on_grid_template';
  }
}

export default function UnifiedQuotationBuilder({
  initialData = [],
  mode,
  customerId,
  siteVisitId,
  quotationId,
  onSave,
  onCancel
}: UnifiedQuotationBuilderProps) {
  const [quotations, setQuotations] = useState<Partial<EnterpriseQuotation>[]>(initialData);
  const [activeQuotationIndex, setActiveQuotationIndex] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form for the current active quotation
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectType: 'on_grid',
      systemCapacity: '',
      projectTitle: '',
      customRequirements: ''
    }
  });

  // Load site visit data to get customer info
  const { data: siteVisitData } = useQuery<SiteVisitData>({
    queryKey: [`/api/site-visits/${siteVisitId}`],
    enabled: !!siteVisitId && mode === 'site_visit',
  });

  // Extract customerId from site visit data or use provided customerId
  const effectiveCustomerId = customerId || siteVisitData?.customer?.id;

  // Load customer data if customerId is available
  const { data: customerData } = useQuery<Customer>({
    queryKey: [`/api/customers/${effectiveCustomerId}`],
    enabled: !!effectiveCustomerId && (mode === 'site_visit' || mode === 'edit'),
  });

  // Load existing quotation for edit mode
  const { data: existingQuotation } = useQuery<EnterpriseQuotation>({
    queryKey: [`/api/quotations/${quotationId}`],
    enabled: !!quotationId && mode === 'edit',
  });

  // Update selected customer when data is loaded
  useEffect(() => {
    if (customerData && (mode === 'site_visit' || mode === 'edit')) {
      setSelectedCustomer(customerData);
    }
  }, [customerData, mode]);

  // Initialize quotations from site visit data
  useEffect(() => {
    if (siteVisitData && mode === 'site_visit' && quotations.length === 0) {
      const generatedQuotations = generateQuotationsFromSiteVisit(siteVisitData);
      if (generatedQuotations.length > 0) {
        setQuotations(generatedQuotations);
        // Set form for first quotation
        const firstQuotation = generatedQuotations[0];
        form.reset({
          projectType: firstQuotation.projectType || 'on_grid',
          systemCapacity: firstQuotation.systemCapacity || '',
          projectTitle: firstQuotation.projectTitle || '',
          customRequirements: firstQuotation.notes || ''
        });
      }
    }
  }, [siteVisitData, mode, quotations.length, form]);

  // Initialize form with existing quotation data
  useEffect(() => {
    if (existingQuotation && mode === 'edit') {
      setQuotations([existingQuotation]);
      form.reset({
        projectType: existingQuotation.projectType || 'on_grid',
        systemCapacity: existingQuotation.systemCapacity || '',
        projectTitle: existingQuotation.projectTitle || '',
        customRequirements: existingQuotation.notes || ''
      });
    }
  }, [existingQuotation, mode, form]);

  // Initialize form when active quotation changes
  useEffect(() => {
    const activeQuotation = quotations[activeQuotationIndex];
    if (activeQuotation) {
      form.reset({
        projectType: activeQuotation.projectType || 'on_grid',
        systemCapacity: activeQuotation.systemCapacity || '',
        projectTitle: activeQuotation.projectTitle || '',
        customRequirements: activeQuotation.notes || ''
      });
    }
  }, [activeQuotationIndex, quotations, form]);

  // Mutation for calculating pricing
  const calculatePricingMutation = useMutation({
    mutationFn: async (data: { projectType: QuotationProjectType; systemCapacity: string }) => {
      const response = await apiRequest('/api/quotations/calculate-pricing', 'POST', data);
      return await response.json();
    },
    onSuccess: (pricingData) => {
      updateActiveQuotation({ financials: pricingData });
      toast({
        title: "Pricing Calculated",
        description: "Financial calculations have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Pricing calculation error:', error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate pricing. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for saving quotations
  const saveQuotationsMutation = useMutation({
    mutationFn: async (quotationsData: Partial<EnterpriseQuotation>[]) => {
      if (mode === 'edit' && quotationId) {
        // Update existing quotation
        const response = await apiRequest(`/api/quotations/${quotationId}`, 'PATCH', quotationsData[0]);
        return [await response.json()];
      } else {
        // Create new quotations
        const responses = await Promise.all(
          quotationsData.map(async quotation => {
            const payload: any = {
              ...quotation,
              siteVisitId,
              createdBy: 'current-user' // This should be the actual user ID
            };
            
            // Only include customerId if we have a valid existing customer ID
            if (selectedCustomer?.id) {
              payload.customerId = selectedCustomer.id;
            } else {
              // For new customers, include customer details for server-side creation
              payload.customerData = {
                name: selectedCustomer?.name || '',
                mobile: selectedCustomer?.mobile || '',
                address: selectedCustomer?.address || '',
                email: selectedCustomer?.email || ''
              };
            }
            
            const response = await apiRequest('/api/quotations', 'POST', payload);
            return await response.json();
          })
        );
        return responses;
      }
    },
    onSuccess: (savedQuotations) => {
      toast({
        title: "Quotations Saved",
        description: `${savedQuotations.length} quotation(s) saved successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'] });
      // Also invalidate paginated quotations list
      queryClient.invalidateQueries({ queryKey: ['/api/quotations'], type: 'all' });
      onSave?.(savedQuotations as EnterpriseQuotation[]);
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({
        title: "Save Error",
        description: "Failed to save quotations. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update the active quotation with new data
  const updateActiveQuotation = (updates: Partial<EnterpriseQuotation>) => {
    setQuotations(prev => {
      const newQuotations = [...prev];
      newQuotations[activeQuotationIndex] = {
        ...newQuotations[activeQuotationIndex],
        ...updates
      };
      return newQuotations;
    });
  };

  // Add a new project/quotation
  const addNewProject = () => {
    const newQuotation: Partial<EnterpriseQuotation> = {
      projectType: 'on_grid',
      systemCapacity: '',
      projectTitle: '',
      status: 'draft',
      billOfMaterials: [],
      warranties: [],
      companyScope: [],
      customerScope: [],
      paymentTerms: {
        advancePercentage: 90,
        balancePercentage: 10,
        advanceTrigger: 'along_with_purchase_order',
        balanceTrigger: 'after_completion_of_work'
      },
      templateData: {
        templateType: 'on_grid_template' as const,
        companyLetterhead: true,
        customerReference: selectedCustomer ? `Discussion with ${selectedCustomer.name}` : '',
        subjectLine: '',
        introductionText: '',
        managingDirectorName: 'Mr. M. Selva Prakash',
        contactPerson: 'Sales Team'
      },
      deliveryPeriod: '2-3 Weeks from order confirmation'
    };

    setQuotations(prev => [...prev, newQuotation]);
    setActiveQuotationIndex(quotations.length);
  };

  // Remove a project/quotation
  const removeProject = (index: number) => {
    if (quotations.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one project is required.",
        variant: "destructive",
      });
      return;
    }

    setQuotations(prev => {
      const newQuotations = prev.filter((_, i) => i !== index);
      if (activeQuotationIndex >= newQuotations.length) {
        setActiveQuotationIndex(newQuotations.length - 1);
      }
      return newQuotations;
    });
  };

  // Handle form submission for project details
  const onProjectFormSubmit = (data: ProjectFormData) => {
    updateActiveQuotation({
      projectType: data.projectType,
      systemCapacity: data.systemCapacity,
      projectTitle: data.projectTitle,
      notes: data.customRequirements,
      templateData: {
        templateType: `${data.projectType}_template` as any,
        companyLetterhead: quotations[activeQuotationIndex]?.templateData?.companyLetterhead ?? true,
        customerReference: quotations[activeQuotationIndex]?.templateData?.customerReference ?? '',
        subjectLine: `Requirement of ${data.systemCapacity} ${data.projectType.replace('_', ' ')} System - Reg`,
        introductionText: quotations[activeQuotationIndex]?.templateData?.introductionText ?? '',
        managingDirectorName: quotations[activeQuotationIndex]?.templateData?.managingDirectorName ?? 'Mr. M. Selva Prakash',
        contactPerson: quotations[activeQuotationIndex]?.templateData?.contactPerson ?? 'Sales Team'
      }
    });

    // Auto-calculate pricing when project details are updated
    calculatePricingMutation.mutate({
      projectType: data.projectType,
      systemCapacity: data.systemCapacity
    });
  };

  // Calculate pricing for the active quotation
  const calculatePricing = () => {
    const activeQuotation = quotations[activeQuotationIndex];
    if (!activeQuotation?.projectType || !activeQuotation?.systemCapacity) {
      toast({
        title: "Missing Information",
        description: "Please fill in project type and system capacity first.",
        variant: "destructive",
      });
      return;
    }

    calculatePricingMutation.mutate({
      projectType: activeQuotation.projectType,
      systemCapacity: activeQuotation.systemCapacity
    });
  };

  // Save all quotations
  const saveQuotations = () => {
    if (!selectedCustomer && mode !== 'edit') {
      toast({
        title: "Customer Required",
        description: "Please select a customer before saving.",
        variant: "destructive",
      });
      return;
    }

    const validQuotations = quotations.filter(q => 
      q.projectType && q.systemCapacity && q.projectTitle
    );

    if (validQuotations.length === 0) {
      toast({
        title: "No Valid Quotations",
        description: "Please complete at least one quotation before saving.",
        variant: "destructive",
      });
      return;
    }

    saveQuotationsMutation.mutate(validQuotations);
  };

  const activeQuotation = quotations[activeQuotationIndex];

  return (
    <div className="unified-quotation-builder space-y-6 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {mode === 'edit' ? 'Edit Quotation' : 'Create Quotation'}
          </h1>
          <p className="text-gray-600">
            {mode === 'site_visit' ? 'Generate quotations from site visit data' : 'Create standalone quotation'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="outline" data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={saveQuotations} 
            disabled={saveQuotationsMutation.isPending || (mode === 'standalone' && !selectedCustomer)}
            data-testid="button-save"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveQuotationsMutation.isPending ? 'Saving...' : 'Save Quotations'}
          </Button>
        </div>
      </div>

      {/* Customer Selection */}
      {mode === 'standalone' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <CustomerAutocomplete
                value={selectedCustomer ? {
                  name: selectedCustomer.name,
                  mobile: selectedCustomer.mobile,
                  address: selectedCustomer.address,
                  email: selectedCustomer.email
                } : {
                  name: '',
                  mobile: '',
                  address: '',
                  email: ''
                }}
                onChange={(customerData) => {
                  // For new customers (manual entry), don't set a customer ID
                  // The server will handle customer creation based on mobile number
                  setSelectedCustomer({
                    id: undefined, // No ID indicates new customer to be created on server
                    name: customerData.name,
                    mobile: customerData.mobile,
                    address: customerData.address,
                    email: customerData.email || ''
                  });
                }}
                onDuplicateDetected={(existingCustomer) => {
                  if (existingCustomer) {
                    // Use existing customer ID when duplicate is detected
                    setSelectedCustomer({
                      id: existingCustomer.id,
                      name: existingCustomer.name,
                      mobile: existingCustomer.mobile,
                      address: existingCustomer.address,
                      email: existingCustomer.email || ''
                    });
                  }
                }}
                placeholder="Search and select customer..."
                data-testid="customer-autocomplete"
              />
              {selectedCustomer && (
                <div className="text-sm text-green-600">
                  ✓ Customer selected: {selectedCustomer.name}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Projects ({quotations.length})
              {mode === 'site_visit' && (
                <Badge variant="secondary" className="ml-2">
                  Auto-generated from site visit
                </Badge>
              )}
            </CardTitle>
            <Button onClick={addNewProject} size="sm" data-testid="button-add-project">
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeQuotationIndex.toString()} onValueChange={(value) => setActiveQuotationIndex(parseInt(value))}>
            <TabsList className="grid w-full grid-cols-auto">
              {quotations.map((quotation, index) => (
                <TabsTrigger 
                  key={index} 
                  value={index.toString()}
                  className="relative"
                  data-testid={`tab-project-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <span>
                      {quotation.projectTitle || `Project ${index + 1}`}
                    </span>
                    {quotations.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProject(index);
                        }}
                        className="text-red-500 hover:text-red-700"
                        data-testid={`button-remove-project-${index}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {quotation.financials && (
                    <Badge variant="secondary" className="ml-2">
                      {formatCurrency(quotation.financials.finalCustomerPayment)}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {quotations.map((quotation, index) => (
              <TabsContent key={index} value={index.toString()} className="space-y-6">
                {/* Technical Specifications from Site Visit */}
                {mode === 'site_visit' && siteVisitData?.marketingData && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-blue-900 flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Technical Specifications (From Site Visit)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TechnicalSpecificationsPanel 
                        projectType={quotation?.projectType || 'on_grid'}
                        marketingData={siteVisitData.marketingData}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Project Details Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Project Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onProjectFormSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="projectType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Project Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-project-type">
                                      <SelectValue placeholder="Select project type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="on_grid">On-Grid Solar</SelectItem>
                                    <SelectItem value="off_grid">Off-Grid Solar</SelectItem>
                                    <SelectItem value="hybrid">Hybrid Solar</SelectItem>
                                    <SelectItem value="water_heater">Solar Water Heater</SelectItem>
                                    <SelectItem value="water_pump">Solar Water Pump</SelectItem>
                                    <SelectItem value="solar_panel">Solar Panel</SelectItem>
                                    <SelectItem value="camera">Security Camera</SelectItem>
                                    <SelectItem value="lights_accessories">Lights & Accessories</SelectItem>
                                    <SelectItem value="others">Others</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="systemCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>System Capacity</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., 3kW, 500L, 3HP" 
                                    {...field}
                                    data-testid="input-system-capacity"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Enter capacity with unit (kW, L, HP)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="projectTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project Title</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., 3kW On-Grid Solar Power Generation System" 
                                  {...field}
                                  data-testid="input-project-title"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="customRequirements"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Requirements</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Any special requirements or notes..."
                                  className="min-h-[100px]"
                                  {...field}
                                  data-testid="textarea-requirements"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2">
                          <Button type="submit" data-testid="button-update-project">
                            Update Project Details
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={calculatePricing}
                            disabled={calculatePricingMutation.isPending}
                            data-testid="button-calculate-pricing"
                          >
                            <Calculator className="h-4 w-4 mr-2" />
                            {calculatePricingMutation.isPending ? 'Calculating...' : 'Calculate Pricing'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                {activeQuotation?.financials && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Financial Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Total Cost</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(activeQuotation.financials.finalCustomerPayment)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-gray-600">Subsidy</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(activeQuotation.financials.subsidyAmount)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <p className="text-sm text-gray-600">Advance</p>
                          <p className="text-lg font-bold text-orange-600">
                            {formatCurrency(activeQuotation.financials.advanceAmount)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm text-gray-600">Balance</p>
                          <p className="text-lg font-bold text-purple-600">
                            {formatCurrency(activeQuotation.financials.balanceAmount)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Template Preview */}
                {activeQuotation && selectedCustomer && selectedCustomer.id && activeQuotation.financials && (
                  <TemplateEngine
                    quotation={activeQuotation as EnterpriseQuotation}
                    customer={{
                      id: selectedCustomer.id,
                      name: selectedCustomer.name,
                      mobile: selectedCustomer.mobile,
                      address: selectedCustomer.address,
                      email: selectedCustomer.email
                    }}
                    onPdfGenerated={(url) => {
                      toast({
                        title: "PDF Generated",
                        description: "Document has been generated successfully.",
                      });
                    }}
                    onEmailSent={() => {
                      toast({
                        title: "Email Sent",
                        description: "Quotation has been sent to customer.",
                      });
                    }}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

