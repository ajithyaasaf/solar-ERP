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
  id: string;
  name: string;
  mobile: string;
  address: string;
  email?: string;
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
  const { data: siteVisitData } = useQuery({
    queryKey: ['/api/site-visits', siteVisitId],
    enabled: !!siteVisitId && mode === 'site_visit',
  });

  // Extract customerId from site visit data or use provided customerId
  const effectiveCustomerId = customerId || siteVisitData?.customer?.id;

  // Load customer data if customerId is available
  const { data: customerData } = useQuery({
    queryKey: ['/api/customers', effectiveCustomerId],
    enabled: !!effectiveCustomerId && (mode === 'site_visit' || mode === 'edit'),
  });

  // Load existing quotation for edit mode
  const { data: existingQuotation } = useQuery({
    queryKey: ['/api/quotations', quotationId],
    enabled: !!quotationId && mode === 'edit',
  });

  // Update selected customer when data is loaded
  useEffect(() => {
    if (customerData && (mode === 'site_visit' || mode === 'edit')) {
      setSelectedCustomer(customerData as Customer);
    }
  }, [customerData, mode]);

  // Initialize form with existing quotation data
  useEffect(() => {
    if (existingQuotation && mode === 'edit') {
      setQuotations([existingQuotation]);
      form.reset({
        projectType: (existingQuotation as any).projectType || 'on_grid',
        systemCapacity: (existingQuotation as any).systemCapacity || '',
        projectTitle: (existingQuotation as any).projectTitle || '',
        customRequirements: (existingQuotation as any).notes || ''
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
      return await apiRequest('/api/quotations/calculate-pricing', {
        method: 'POST',
        body: JSON.stringify(data)
      });
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
        return [await apiRequest(`/api/quotations/${quotationId}`, {
          method: 'PATCH',
          body: JSON.stringify(quotationsData[0])
        })];
      } else {
        // Create new quotations
        const responses = await Promise.all(
          quotationsData.map(async quotation => {
            return await apiRequest('/api/quotations', {
              method: 'POST',
              body: JSON.stringify({
                ...quotation,
                customerId: selectedCustomer?.id,
                siteVisitId,
                createdBy: 'current-user' // This should be the actual user ID
              })
            });
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
                  id: selectedCustomer.id,
                  name: selectedCustomer.name,
                  mobile: selectedCustomer.mobile,
                  address: selectedCustomer.address,
                  email: selectedCustomer.email || ''
                } : null}
                onChange={(customerData) => {
                  if (customerData) {
                    setSelectedCustomer({
                      id: customerData.id,
                      name: customerData.name,
                      mobile: customerData.mobile,
                      address: customerData.address,
                      email: customerData.email
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
                {activeQuotation && selectedCustomer && activeQuotation.financials && (
                  <TemplateEngine
                    quotation={activeQuotation as EnterpriseQuotation}
                    customer={selectedCustomer}
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

