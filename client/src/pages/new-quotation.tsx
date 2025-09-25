import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { UnifiedQuotationBuilder } from "@/components/quotations/unified-quotation-builder";

export default function NewQuotation() {
  const [, setLocation] = useLocation();

  const handleSave = (quotations: any[]) => {
    // Handle saving quotations
    console.log("Saving quotations:", quotations);
    // Navigate back to quotations list
    setLocation("/quotations");
  };

  const handleGenerate = (quotation: any) => {
    // Handle generating quotation PDF/document
    console.log("Generating quotation:", quotation);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/quotations")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quotations
        </Button>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">New Quotation</h1>
          <p className="text-muted-foreground">
            Create a new quotation for your customer
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation Builder</CardTitle>
          <CardDescription>
            Fill in the details to create a comprehensive quotation for your customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnifiedQuotationBuilder
            mode="standalone_creation"
            onSave={handleSave}
            onGenerate={handleGenerate}
          />
        </CardContent>
      </Card>
    </div>
  );
}