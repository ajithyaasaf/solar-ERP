/**
 * Unified Quotation Builder Component
 * Handles both site visit completion and standalone quotation creation
 * Based on CORRECTED_QUOTATION_IMPLEMENTATION_PLAN.md Phase 2.2
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Calculator,
  FileText,
  Send,
  Save,
  Eye,
  TrendingUp,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import { QuotationFormSections } from "./quotation-form-sections";
import { CompletionAssistant } from "./completion-assistant";

interface QuotationDraft {
  id?: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  propertyType: string;
  
  // Site visit integration
  siteVisitId?: string;
  sourceVisitDate?: string;
  sourceVisitPurpose?: string;
  
  // Project details
  projectType: string;
  systemCapacity: string;
  projectTitle: string;
  
  // Technical specifications
  technicalRequirements?: any;
  installationScope?: any;
  systemConfiguration: any;
  
  // Financial details
  pricing?: any;
  billOfMaterials?: any[];
  warranties?: any[];
  
  // Completion tracking
  dataCompleteness: number;
  missingFields?: string[];
  needsReview: boolean;
  
  // Status
  status: string;
  createdBy: string;
  createdAt: Date | string;
}

interface CompletionStatus {
  [index: number]: {
    sectionsCompleted: string[];
    totalSections: number;
  };
}

interface UnifiedQuotationBuilderProps {
  siteVisitId?: string;
  initialQuotations?: QuotationDraft[];
  mode?: 'site_visit_completion' | 'standalone_creation';
  onSave?: (quotations: QuotationDraft[]) => void;
  onGenerate?: (quotation: QuotationDraft) => void;
}

export function UnifiedQuotationBuilder({ 
  siteVisitId, 
  initialQuotations = [], 
  mode = 'site_visit_completion',
  onSave,
  onGenerate
}: UnifiedQuotationBuilderProps) {
  const [quotations, setQuotations] = useState<QuotationDraft[]>(initialQuotations);
  const [activeTab, setActiveTab] = useState(0);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>({});
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch site visit data if in completion mode
  const { data: siteVisitData } = useQuery({
    queryKey: [`/api/site-visits/${siteVisitId}`],
    enabled: Boolean(siteVisitId && mode === 'site_visit_completion'),
  });

  // Generate quotations from site visit if needed
  const generateFromSiteVisitMutation = useMutation({
    mutationFn: (siteVisitId: string) => 
      apiRequest(`/api/quotation-drafts/from-site-visit/${siteVisitId}`, 'POST'),
    onSuccess: async (response) => {
      const data = await response.json();
      if (data.quotationDraft) {
        setQuotations([data.quotationDraft]);
      }
      toast({
        title: "Success",
        description: "Quotation draft generated from site visit data",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate quotation from site visit",
        variant: "destructive",
      });
    },
  });

  // Load quotations from site visit on mount
  useEffect(() => {
    if (siteVisitId && mode === 'site_visit_completion' && quotations.length === 0) {
      generateFromSiteVisitMutation.mutate(siteVisitId);
    }
  }, [siteVisitId, mode]);

  const activeQuotation = quotations[activeTab];

  const updateQuotation = (index: number, updates: Partial<QuotationDraft>) => {
    setQuotations(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const markFieldComplete = (quotationIndex: number, field: string) => {
    setCompletionStatus(prev => ({
      ...prev,
      [quotationIndex]: {
        ...prev[quotationIndex],
        sectionsCompleted: [...(prev[quotationIndex]?.sectionsCompleted || []), field]
      }
    }));
  };

  const isQuotationComplete = (quotation: QuotationDraft): boolean => {
    return quotation.dataCompleteness > 0.8 && !quotation.needsReview;
  };

  const saveDraft = async () => {
    setIsLoading(true);
    try {
      // Save all quotations as drafts
      for (const quotation of quotations) {
        if (quotation.id) {
          await apiRequest(`/api/quotations/${quotation.id}`, 'PATCH', {
            ...quotation,
            status: 'draft'
          });
        } else {
          await apiRequest('/api/quotations', 'POST', {
            ...quotation,
            status: 'draft'
          });
        }
      }
      
      onSave?.(quotations);
      toast({
        title: "Success",
        description: "Quotation draft saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save quotation draft",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const previewQuotation = () => {
    // Open preview modal or navigate to preview page
    toast({
      title: "Preview",
      description: "Quotation preview functionality will be implemented",
    });
  };

  const generatePDF = async () => {
    if (!activeQuotation.id) {
      toast({
        title: "Error",
        description: "Please save the quotation first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest(`/api/quotations/${activeQuotation.id}/generate-pdf`, 'POST');
      const data = await response.json();
      
      // Download PDF
      window.open(data.pdfUrl, '_blank');
      
      toast({
        title: "Success",
        description: "PDF generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendToCustomer = async () => {
    if (!activeQuotation.id) {
      toast({
        title: "Error",
        description: "Please save the quotation first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest(`/api/quotations/${activeQuotation.id}/send-to-customer`, 'POST');
      
      toast({
        title: "Success",
        description: "Quotation sent to customer successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send quotation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (quotations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Generating quotation from site visit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="unified-quotation-builder">
      {/* Site Visit Context Header */}
      {mode === 'site_visit_completion' && siteVisitData && (
        <Card>
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
                <p className="font-medium">
                  {(siteVisitData as any)?.createdAt ? format(new Date((siteVisitData as any).createdAt), 'PPP') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Completeness</p>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={activeQuotation?.dataCompleteness * 100 || 0} 
                    className="flex-1" 
                  />
                  <span className="text-sm font-medium">
                    {Math.round((activeQuotation?.dataCompleteness || 0) * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Missing Critical Fields</p>
                <p className="font-medium text-orange-600">
                  {activeQuotation?.missingFields?.length || 0} fields
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Tabs */}
      <Tabs value={activeTab.toString()} onValueChange={(v) => setActiveTab(parseInt(v))}>
        <TabsList className="grid w-full grid-cols-auto">
          {quotations.map((quotation, index) => (
            <TabsTrigger 
              key={index} 
              value={index.toString()} 
              className="relative"
              data-testid={`tab-project-${index}`}
            >
              {quotation.projectTitle || `${quotation.projectType} System`}
              {quotation.needsReview && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full" />
              )}
              <Badge 
                variant={isQuotationComplete(quotation) ? "default" : "secondary"}
                className="ml-2"
              >
                {Math.round(quotation.dataCompleteness * 100)}%
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {quotations.map((quotation, index) => (
          <TabsContent key={index} value={index.toString()}>
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer Name</p>
                      <p className="font-medium">{quotation.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mobile</p>
                      <p className="font-medium">{quotation.customerMobile}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{quotation.customerAddress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Configuration */}
              <QuotationFormSections
                quotation={quotation}
                onUpdate={(updates: Partial<QuotationDraft>) => updateQuotation(index, updates)}
                completionStatus={completionStatus[index]}
                showCompletionHints={quotation.needsReview}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Completion Assistant */}
      {activeQuotation?.needsReview && (
        <CompletionAssistant
          quotation={activeQuotation}
          onFieldComplete={(field: string) => markFieldComplete(activeTab, field)}
        />
      )}
      
      {/* Actions */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={saveDraft}
            disabled={isLoading}
            data-testid="button-save-draft"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            variant="outline" 
            onClick={previewQuotation}
            data-testid="button-preview"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={generatePDF}
            disabled={!isQuotationComplete(activeQuotation) || isLoading}
            data-testid="button-generate-pdf"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
          <Button 
            onClick={sendToCustomer}
            disabled={!isQuotationComplete(activeQuotation) || isLoading}
            data-testid="button-send-customer"
          >
            <Send className="w-4 h-4 mr-2" />
            Send to Customer
          </Button>
        </div>
      </div>
    </div>
  );
}