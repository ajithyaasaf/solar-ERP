/**
 * Site Visit → Quotation Integration Component
 * Provides seamless transition from site visit completion to quotation generation
 * Based on CORRECTED_QUOTATION_IMPLEMENTATION_PLAN.md
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  CheckCircle, 
  AlertTriangle, 
  Calculator, 
  FileText, 
  ArrowRight,
  Lightbulb,
  TrendingUp,
  Zap,
  Target
} from "lucide-react";
import { UnifiedQuotationBuilder } from "../quotations/unified-quotation-builder";

interface SiteVisitQuotationIntegrationProps {
  siteVisit: any;
  onQuotationGenerated?: (quotations: any[]) => void;
}

interface QuotationReadiness {
  canGenerateQuotation: boolean;
  completenessScore: number;
  projectTypes: Array<{
    type: string;
    completeness: number;
    missingFields: string[];
    criticalMissing: string[];
  }>;
  recommendations: string[];
}

export function SiteVisitQuotationIntegration({ 
  siteVisit, 
  onQuotationGenerated 
}: SiteVisitQuotationIntegrationProps) {
  const [showQuotationBuilder, setShowQuotationBuilder] = useState(false);
  const [generatedQuotations, setGeneratedQuotations] = useState<any[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Analyze site visit data for quotation readiness
  const { data: readinessAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: [`/api/site-visits/${siteVisit.id}/quotation-readiness`],
    queryFn: async () => {
      // Mock analysis - in real implementation, this would call a backend service
      return analyzeQuotationReadiness(siteVisit);
    },
    enabled: Boolean(siteVisit.id),
  });

  // Generate quotation from site visit
  const generateQuotationMutation = useMutation({
    mutationFn: (siteVisitId: string) => 
      apiRequest(`/api/quotation-drafts/from-site-visit/${siteVisitId}`, 'POST'),
    onSuccess: async (response) => {
      const data = await response.json();
      if (data.quotationDraft) {
        setGeneratedQuotations([data.quotationDraft]);
        setShowQuotationBuilder(true);
        onQuotationGenerated?.([data.quotationDraft]);
        
        toast({
          title: "Success",
          description: "Quotation draft generated successfully from site visit data",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate quotation from site visit",
        variant: "destructive",
      });
    },
  });

  const handleGenerateQuotation = () => {
    generateQuotationMutation.mutate(siteVisit.id);
  };

  if (analysisLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span>Analyzing site visit data for quotation readiness...</span>
        </CardContent>
      </Card>
    );
  }

  const analysis = readinessAnalysis as QuotationReadiness;

  return (
    <div className="space-y-4">
      {/* Quotation Readiness Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Quotation Readiness Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Completeness */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Data Completeness</span>
              <span className="text-sm font-bold">{Math.round(analysis.completenessScore * 100)}%</span>
            </div>
            <Progress value={analysis.completenessScore * 100} className="h-2" />
          </div>

          {/* Project Types Analysis */}
          <div>
            <h4 className="font-medium mb-3">Project Types Detected</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.projectTypes.map((project, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    project.completeness > 0.7
                      ? 'bg-green-50 border-green-200'
                      : project.completeness > 0.4
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">
                      {project.type.replace('_', ' ')} System
                    </span>
                    <Badge
                      variant={
                        project.completeness > 0.7
                          ? 'default'
                          : project.completeness > 0.4
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {Math.round(project.completeness * 100)}%
                    </Badge>
                  </div>
                  
                  {project.criticalMissing.length > 0 && (
                    <div className="text-xs text-orange-700 mt-2">
                      <span className="font-medium">Missing:</span> {project.criticalMissing.slice(0, 2).join(', ')}
                      {project.criticalMissing.length > 2 && ` +${project.criticalMissing.length - 2} more`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Readiness Status */}
          <Alert className={analysis.canGenerateQuotation ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
            {analysis.canGenerateQuotation ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            )}
            <AlertDescription className={analysis.canGenerateQuotation ? 'text-green-800' : 'text-orange-800'}>
              {analysis.canGenerateQuotation
                ? 'Site visit data is sufficient to generate quotations!'
                : 'Additional information needed to generate complete quotations.'}
            </AlertDescription>
          </Alert>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Recommendations
              </h4>
              <ul className="text-sm space-y-1">
                {analysis.recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleGenerateQuotation}
          disabled={generateQuotationMutation.isPending}
          className="flex-1"
          data-testid="button-generate-quotation"
        >
          {generateQuotationMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Generate Quotation Draft
            </>
          )}
        </Button>

        {analysis.canGenerateQuotation && (
          <Dialog open={showQuotationBuilder} onOpenChange={setShowQuotationBuilder}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                Advanced Builder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Complete Quotation Builder</DialogTitle>
                <DialogDescription>
                  Review and complete the quotation generated from site visit data
                </DialogDescription>
              </DialogHeader>
              
              {generatedQuotations.length > 0 && (
                <UnifiedQuotationBuilder
                  siteVisitId={siteVisit.id}
                  initialQuotations={generatedQuotations}
                  mode="site_visit_completion"
                  onSave={(quotations) => {
                    setGeneratedQuotations(quotations);
                    toast({
                      title: "Success",
                      description: "Quotations saved successfully",
                    });
                  }}
                  onGenerate={(quotation) => {
                    toast({
                      title: "Success",
                      description: "PDF generated successfully",
                    });
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Quick Actions for Each Project Type */}
      {analysis.projectTypes.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Individual Project Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.projectTypes.map((project, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium capitalize">
                      {project.type.replace('_', ' ')} System
                    </span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {project.completeness > 0.7 ? 'Ready for quotation' : 'Needs completion'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={project.completeness > 0.7 ? "default" : "outline"}
                    disabled={project.criticalMissing.length > 3}
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    {project.completeness > 0.7 ? 'Generate' : 'Complete'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Analyze site visit data for quotation readiness (mock implementation)
 */
function analyzeQuotationReadiness(siteVisit: any): QuotationReadiness {
  const projectTypes = [];
  let overallCompleteness = 0;
  const recommendations = [];

  // Analyze marketing data for project types
  if (siteVisit.marketingData) {
    const marketingData = siteVisit.marketingData;

    // On-grid analysis
    if (marketingData.onGridConfig) {
      const config = marketingData.onGridConfig;
      const requiredFields = ['solarPanelMake', 'panelWatts', 'inverterMake', 'inverterWatts', 'panelCount'];
      const filledFields = requiredFields.filter(field => config[field] && config[field] !== '');
      const completeness = filledFields.length / requiredFields.length;
      const missingFields = requiredFields.filter(field => !config[field] || config[field] === '');
      
      projectTypes.push({
        type: 'on_grid',
        completeness,
        missingFields,
        criticalMissing: missingFields.slice(0, 3)
      });

      if (completeness < 0.6) {
        recommendations.push('Complete solar panel and inverter specifications for on-grid system');
      }
    }

    // Similar analysis for other project types
    if (marketingData.offGridConfig) {
      projectTypes.push({
        type: 'off_grid',
        completeness: 0.5,
        missingFields: ['batteryType', 'batteryAH'],
        criticalMissing: ['batteryType']
      });
    }

    if (marketingData.waterHeaterConfig) {
      projectTypes.push({
        type: 'water_heater',
        completeness: 0.8,
        missingFields: ['installationType'],
        criticalMissing: []
      });
    }
  }

  // Calculate overall completeness
  if (projectTypes.length > 0) {
    overallCompleteness = projectTypes.reduce((sum, project) => sum + project.completeness, 0) / projectTypes.length;
  }

  // Generate recommendations
  if (overallCompleteness < 0.5) {
    recommendations.push('Complete basic system specifications before generating quotation');
  }
  if (!siteVisit.marketingData?.projectType) {
    recommendations.push('Select primary project type for the customer');
  }
  if (projectTypes.some(p => p.criticalMissing.length > 0)) {
    recommendations.push('Fill critical missing fields highlighted in red');
  }

  return {
    canGenerateQuotation: overallCompleteness > 0.3 && projectTypes.length > 0,
    completenessScore: overallCompleteness,
    projectTypes,
    recommendations
  };
}