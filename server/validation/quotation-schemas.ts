import { z } from "zod";
import { QuotationProjectType } from "@shared/schema";

// Schema for quotation generation request from site visit
export const generateQuotationRequestSchema = z.object({
  selectedProjects: z.array(z.object({
    projectType: z.enum(['on_grid', 'off_grid', 'hybrid', 'water_heater', 'water_pump', 'solar_panel', 'camera', 'lights_accessories', 'others'] as const),
    systemCapacity: z.string().min(1, "System capacity is required"),
    customTitle: z.string().optional(),
    additionalRequirements: z.string().optional()
  })).min(1, "At least one project must be selected"),
  includeSubsidy: z.boolean().optional().default(true)
});

export type GenerateQuotationRequest = z.infer<typeof generateQuotationRequestSchema>;