/**
 * Quotation Form Sections Component
 * Renders editable sections for quotation data with completion tracking
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  Battery, 
  Calculator, 
  Wrench, 
  FileText, 
  DollarSign,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface QuotationFormSectionsProps {
  quotation: any;
  onUpdate: (updates: any) => void;
  completionStatus?: {
    sectionsCompleted: string[];
    totalSections: number;
  };
  showCompletionHints?: boolean;
}

export function QuotationFormSections({ 
  quotation, 
  onUpdate, 
  completionStatus,
  showCompletionHints = false 
}: QuotationFormSectionsProps) {
  const [activeSection, setActiveSection] = useState<string>('system');

  const updateConfig = (field: string, value: any) => {
    onUpdate({
      systemConfiguration: {
        ...quotation.systemConfiguration,
        [field]: value
      }
    });
  };

  const updatePricing = (field: string, value: any) => {
    onUpdate({
      pricing: {
        ...quotation.pricing,
        [field]: value
      }
    });
  };

  const isSectionCompleted = (section: string) => {
    return completionStatus?.sectionsCompleted?.includes(section);
  };

  const renderSystemConfiguration = () => (
    <Card className={isSectionCompleted('system') ? 'border-green-200' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          System Configuration
          {isSectionCompleted('system') && <CheckCircle className="w-4 h-4 text-green-600" />}
          {showCompletionHints && !isSectionCompleted('system') && <AlertTriangle className="w-4 h-4 text-orange-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="projectType">Project Type</Label>
            <Select 
              value={quotation.projectType} 
              onValueChange={(value) => onUpdate({ projectType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_grid">On-Grid Solar</SelectItem>
                <SelectItem value="off_grid">Off-Grid Solar</SelectItem>
                <SelectItem value="hybrid">Hybrid Solar</SelectItem>
                <SelectItem value="water_heater">Water Heater</SelectItem>
                <SelectItem value="water_pump">Water Pump</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="systemCapacity">System Capacity</Label>
            <Input
              id="systemCapacity"
              value={quotation.systemCapacity || ''}
              onChange={(e) => onUpdate({ systemCapacity: e.target.value })}
              placeholder="e.g., 5kW"
            />
          </div>
        </div>

        {quotation.projectType === 'on_grid' && renderOnGridConfiguration()}
        {quotation.projectType === 'off_grid' && renderOffGridConfiguration()}
        {quotation.projectType === 'hybrid' && renderHybridConfiguration()}
        {quotation.projectType === 'water_heater' && renderWaterHeaterConfiguration()}
        {quotation.projectType === 'water_pump' && renderWaterPumpConfiguration()}
      </CardContent>
    </Card>
  );

  const renderOnGridConfiguration = () => (
    <div className="space-y-4 border-t pt-4">
      <h4 className="font-medium">On-Grid System Details</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Panel Count</Label>
          <Input
            type="number"
            value={quotation.systemConfiguration?.panelCount || ''}
            onChange={(e) => updateConfig('panelCount', parseInt(e.target.value))}
            placeholder="Number of panels"
          />
        </div>
        <div>
          <Label>Panel Watts</Label>
          <Select 
            value={quotation.systemConfiguration?.panelWatts || ''} 
            onValueChange={(value) => updateConfig('panelWatts', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select watts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="530">530W</SelectItem>
              <SelectItem value="535">535W</SelectItem>
              <SelectItem value="550">550W</SelectItem>
              <SelectItem value="590">590W</SelectItem>
              <SelectItem value="610">610W</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Inverter Capacity</Label>
          <Select 
            value={quotation.systemConfiguration?.inverterWatts || ''} 
            onValueChange={(value) => updateConfig('inverterWatts', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select capacity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3kw">3kW</SelectItem>
              <SelectItem value="4kw">4kW</SelectItem>
              <SelectItem value="5kw">5kW</SelectItem>
              <SelectItem value="10kw">10kW</SelectItem>
              <SelectItem value="15kw">15kW</SelectItem>
              <SelectItem value="30kw">30kW</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderOffGridConfiguration = () => (
    <div className="space-y-4 border-t pt-4">
      <h4 className="font-medium">Off-Grid System Details</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Battery Type</Label>
          <Select 
            value={quotation.systemConfiguration?.batteryType || ''} 
            onValueChange={(value) => updateConfig('batteryType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select battery type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lead_acid">Lead Acid</SelectItem>
              <SelectItem value="lithium">Lithium</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Battery AH</Label>
          <Select 
            value={quotation.systemConfiguration?.batteryAH || ''} 
            onValueChange={(value) => updateConfig('batteryAH', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select AH" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 AH</SelectItem>
              <SelectItem value="120">120 AH</SelectItem>
              <SelectItem value="150">150 AH</SelectItem>
              <SelectItem value="200">200 AH</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderHybridConfiguration = () => (
    <div className="space-y-4 border-t pt-4">
      <h4 className="font-medium">Hybrid System Details</h4>
      <p className="text-sm text-muted-foreground">
        Combines grid-tied and battery backup functionality
      </p>
      {renderOnGridConfiguration()}
      {renderOffGridConfiguration()}
    </div>
  );

  const renderWaterHeaterConfiguration = () => (
    <div className="space-y-4 border-t pt-4">
      <h4 className="font-medium">Water Heater Details</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Capacity (Litres)</Label>
          <Input
            type="number"
            value={quotation.systemConfiguration?.litre || ''}
            onChange={(e) => updateConfig('litre', parseInt(e.target.value))}
            placeholder="Heater capacity in litres"
          />
        </div>
        <div>
          <Label>Heater Type</Label>
          <Select 
            value={quotation.systemConfiguration?.heaterType || ''} 
            onValueChange={(value) => updateConfig('heaterType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pressurised">Pressurised</SelectItem>
              <SelectItem value="non_pressurised">Non-Pressurised</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderWaterPumpConfiguration = () => (
    <div className="space-y-4 border-t pt-4">
      <h4 className="font-medium">Water Pump Details</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Pump HP</Label>
          <Input
            type="number"
            value={quotation.systemConfiguration?.hp || ''}
            onChange={(e) => updateConfig('hp', parseFloat(e.target.value))}
            placeholder="Pump horsepower"
          />
        </div>
        <div>
          <Label>Drive Type</Label>
          <Select 
            value={quotation.systemConfiguration?.driveType || ''} 
            onValueChange={(value) => updateConfig('driveType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select drive type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vfd">VFD Drive</SelectItem>
              <SelectItem value="direct">Direct Drive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderPricingSection = () => (
    <Card className={isSectionCompleted('pricing') ? 'border-green-200' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Pricing Information
          {isSectionCompleted('pricing') && <CheckCircle className="w-4 h-4 text-green-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Total System Cost</Label>
            <Input
              type="number"
              value={quotation.pricing?.totalSystemCost || ''}
              onChange={(e) => updatePricing('totalSystemCost', parseFloat(e.target.value))}
              placeholder="Enter total cost"
              readOnly
            />
          </div>
          <div>
            <Label>Subsidy Amount</Label>
            <Input
              type="number"
              value={quotation.pricing?.subsidyAmount || ''}
              onChange={(e) => updatePricing('subsidyAmount', parseFloat(e.target.value))}
              placeholder="Government subsidy"
              readOnly
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Customer Payment</Label>
            <Input
              type="number"
              value={quotation.pricing?.customerPayment || ''}
              onChange={(e) => updatePricing('customerPayment', parseFloat(e.target.value))}
              placeholder="Final customer payment"
              readOnly
            />
          </div>
          <div>
            <Label>Advance Amount (90%)</Label>
            <Input
              type="number"
              value={quotation.pricing?.advanceAmount || ''}
              readOnly
              placeholder="Advance payment"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderInstallationScope = () => (
    <Card className={isSectionCompleted('installation') ? 'border-green-200' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Installation Scope
          {isSectionCompleted('installation') && <CheckCircle className="w-4 h-4 text-green-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Civil Work Scope</Label>
            <Select 
              value={quotation.systemConfiguration?.civilWorkScope || ''} 
              onValueChange={(value) => updateConfig('civilWorkScope', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company_scope">Company Scope</SelectItem>
                <SelectItem value="customer_scope">Customer Scope</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Net Meter Scope</Label>
            <Select 
              value={quotation.systemConfiguration?.netMeterScope || ''} 
              onValueChange={(value) => updateConfig('netMeterScope', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company_scope">Company Scope</SelectItem>
                <SelectItem value="customer_scope">Customer Scope</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Additional Notes</Label>
          <Textarea
            value={quotation.systemConfiguration?.notes || ''}
            onChange={(e) => updateConfig('notes', e.target.value)}
            placeholder="Additional installation notes and requirements"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderSystemConfiguration()}
      {renderPricingSection()}
      {renderInstallationScope()}
    </div>
  );
}