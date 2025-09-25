/**
 * Completion Assistant Component
 * Helps users complete missing fields in quotation data
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  AlertTriangle, 
  Lightbulb, 
  Calculator,
  ArrowRight,
  Info
} from "lucide-react";

interface CompletionAssistantProps {
  quotation: any;
  onFieldComplete: (field: string) => void;
}

export function CompletionAssistant({ 
  quotation, 
  onFieldComplete 
}: CompletionAssistantProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const missingFields = quotation.missingFields || [];
  const completeness = (quotation.dataCompleteness || 0) * 100;

  const getFieldImportance = (field: string): 'critical' | 'important' | 'optional' => {
    const criticalFields = [
      'panelCount', 'panelWatts', 'inverterWatts', 'projectValue',
      'solarPanelMake', 'inverterMake', 'systemCapacity'
    ];
    
    const importantFields = [
      'structureHeight', 'structureType', 'civilWorkScope', 
      'netMeterScope', 'lightningArrest', 'earth'
    ];
    
    if (criticalFields.includes(field)) return 'critical';
    if (importantFields.includes(field)) return 'important';
    return 'optional';
  };

  const getFieldDisplayName = (field: string): string => {
    const displayNames: Record<string, string> = {
      panelCount: 'Panel Count',
      panelWatts: 'Panel Wattage',
      inverterWatts: 'Inverter Capacity',
      projectValue: 'Project Value',
      solarPanelMake: 'Solar Panel Brand',
      inverterMake: 'Inverter Brand',
      systemCapacity: 'System Capacity',
      structureHeight: 'Structure Height',
      structureType: 'Structure Type',
      civilWorkScope: 'Civil Work Scope',
      netMeterScope: 'Net Meter Scope',
      lightningArrest: 'Lightning Arrestor',
      earth: 'Earthing Type'
    };
    
    return displayNames[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getSuggestion = (field: string): string => {
    const suggestions: Record<string, string> = {
      panelCount: 'Calculate based on system capacity. For 5kW with 540W panels, you need ~10 panels.',
      panelWatts: 'Standard options: 530W, 540W, 550W. 540W is most common for residential.',
      inverterWatts: 'Should match or be slightly less than total panel capacity.',
      projectValue: 'Use ₹68,000 per kW for on-grid systems as a starting point.',
      solarPanelMake: 'Popular brands: Tata Power, Waaree, Adani Solar, Vikram Solar.',
      inverterMake: 'Reliable brands: Growatt, Deye, Polycab, UTL, Microtech.',
      systemCapacity: 'Calculate from total panel wattage (Panel Count × Panel Watts ÷ 1000).',
      structureHeight: 'Typical range: 8-12 feet for residential installations.',
      structureType: 'GP Structure is standard, Mono Rail for space constraints.',
      civilWorkScope: 'Company Scope includes foundation work, Customer Scope requires customer prep.',
      netMeterScope: 'Company Scope includes EB documentation, Customer Scope requires customer handling.',
      lightningArrest: 'Always recommended for safety, especially for elevated installations.',
      earth: 'AC+DC earthing is preferred for comprehensive protection.'
    };
    
    return suggestions[field] || 'Please provide accurate information for this field.';
  };

  const groupFieldsByImportance = () => {
    const grouped = {
      critical: missingFields.filter((field: string) => getFieldImportance(field) === 'critical'),
      important: missingFields.filter((field: string) => getFieldImportance(field) === 'important'),
      optional: missingFields.filter((field: string) => getFieldImportance(field) === 'optional')
    };
    
    return grouped;
  };

  const groupedFields = groupFieldsByImportance();

  const renderFieldGroup = (fields: string[], importance: 'critical' | 'important' | 'optional') => {
    if (fields.length === 0) return null;

    const colors = {
      critical: 'border-red-200 bg-red-50',
      important: 'border-orange-200 bg-orange-50', 
      optional: 'border-blue-200 bg-blue-50'
    };

    const icons = {
      critical: <AlertTriangle className="w-4 h-4 text-red-600" />,
      important: <Info className="w-4 h-4 text-orange-600" />,
      optional: <Lightbulb className="w-4 h-4 text-blue-600" />
    };

    const titles = {
      critical: 'Critical Fields Required',
      important: 'Important Fields Missing',
      optional: 'Optional Fields for Better Accuracy'
    };

    return (
      <div className={`border rounded-lg p-4 ${colors[importance]}`}>
        <div className="flex items-center gap-2 mb-3">
          {icons[importance]}
          <h4 className="font-medium">{titles[importance]}</h4>
          <Badge variant="secondary">{fields.length}</Badge>
        </div>
        
        <div className="space-y-2">
          {fields.map((field) => (
            <div key={field} className="bg-white rounded-md p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{getFieldDisplayName(field)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onFieldComplete(field)}
                  className="text-xs"
                >
                  Mark Complete
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {getSuggestion(field)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (missingFields.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          All required fields are complete! Your quotation is ready for generation.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-orange-600" />
          Completion Assistant
        </CardTitle>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Progress value={completeness} className="flex-1" />
            <span className="text-sm font-medium">{Math.round(completeness)}% Complete</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Complete the missing fields below to generate an accurate quotation.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderFieldGroup(groupedFields.critical, 'critical')}
        {renderFieldGroup(groupedFields.important, 'important')}
        {renderFieldGroup(groupedFields.optional, 'optional')}
        
        {groupedFields.critical.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Complete all critical fields to enable quotation generation and PDF export.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}