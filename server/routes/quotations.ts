/**
 * Quotation API Routes
 * Handles quotation creation, management, and PDF generation
 */

import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertQuotationSchema } from "@shared/schema";
import { QuotationPDFService } from "../services/quotation-pdf-service";
import { QuotationTemplateService } from "../services/quotation-template-service";

export function registerQuotationRoutes(app: Express, verifyAuth: any) {
  // Get all quotations with filtering and pagination
  app.get("/api/quotations", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.view"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      // Get filters
      const filters: any = {};
      if (req.query.status && req.query.status !== "all") filters.status = req.query.status;
      if (req.query.source && req.query.source !== "all") filters.source = req.query.source;
      if (req.query.search) filters.search = req.query.search;
      
      // Get sort parameters
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

      // Get all quotations and apply filters/sorting on the backend
      let quotations = await storage.listQuotations();
      
      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        quotations = quotations.filter(q => 
          q.quotationNumber?.toLowerCase().includes(searchTerm) ||
          q.customerNotes?.toLowerCase().includes(searchTerm) ||
          q.internalNotes?.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply status filter
      if (filters.status) {
        quotations = quotations.filter(q => q.status === filters.status);
      }
      
      // Apply source filter
      if (filters.source) {
        quotations = quotations.filter(q => q.source === filters.source);
      }
      
      // Apply sorting
      quotations.sort((a, b) => {
        let aVal: any = a[sortBy as keyof typeof a];
        let bVal: any = b[sortBy as keyof typeof b];
        
        // Handle date sorting
        if (sortBy === "createdAt" || sortBy === "updatedAt") {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        // Handle numeric sorting
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
        }
        
        // Handle string sorting
        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        return sortOrder === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
      
      // Calculate total before pagination
      const total = quotations.length;
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedQuotations = quotations.slice(startIndex, endIndex);
      
      res.json({
        data: paginatedQuotations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: endIndex < total,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ message: "Failed to fetch quotations" });
    }
  });

  // Get specific quotation by ID
  app.get("/api/quotations/:id", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.view"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      res.json(quotation);
    } catch (error) {
      console.error("Error fetching quotation:", error);
      res.status(500).json({ message: "Failed to fetch quotation" });
    }
  });

  // Create new quotation
  app.post("/api/quotations", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.create"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate request body
      const quotationData = insertQuotationSchema.parse({
        ...req.body,
        preparedBy: user.displayName || user.email || user.uid,
        quotationNumber: QuotationTemplateService.generateQuotationNumber()
      });

      const quotation = await storage.createQuotation(quotationData);
      
      res.status(201).json(quotation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      console.error("Error creating quotation:", error);
      res.status(500).json({ message: "Failed to create quotation" });
    }
  });

  // Update quotation
  app.patch("/api/quotations/:id", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.edit"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      const updatedQuotation = await storage.updateQuotation(req.params.id, req.body, user.uid);

      res.json(updatedQuotation);
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(500).json({ message: "Failed to update quotation" });
    }
  });

  // Generate quotation PDF
  app.post("/api/quotations/:id/generate-pdf", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.view"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      // Get customer details
      const customer = await storage.getCustomer(quotation.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Generate PDF for each project (for now, handle first project)
      if (!quotation.projects || quotation.projects.length === 0) {
        return res.status(400).json({ message: "No projects found in quotation" });
      }

      const project = quotation.projects[0]; // Handle first project for now

      // Generate HTML content for client-side PDF generation
      const htmlResult = await QuotationPDFService.generateHTMLPreview(
        quotation,
        project,
        customer
      );

      // Return HTML content and template data for client-side PDF generation
      res.json({
        html: htmlResult.html,
        template: htmlResult.template,
        quotationNumber: quotation.quotationNumber || quotation.id
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Generate quotation preview (HTML format)
  app.get("/api/quotations/:id/preview", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.view"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      const customer = await storage.getCustomer(quotation.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (!quotation.projects || quotation.projects.length === 0) {
        return res.status(400).json({ message: "No projects found in quotation" });
      }

      const project = quotation.projects[0];

      const htmlResult = await QuotationPDFService.generateHTMLPreview(
        quotation,
        project,
        customer
      );

      // Return HTML for preview
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlResult.html);
    } catch (error) {
      console.error("Error generating preview:", error);
      res.status(500).json({ message: "Failed to generate preview" });
    }
  });

  // Preview BOM for project configuration (before creating quotation)
  app.post("/api/quotations/preview-bom", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.view"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { project, propertyType } = req.body;
      
      if (!project) {
        return res.status(400).json({ message: "Project configuration is required" });
      }

      // Generate BOM using the template service
      const billOfMaterials = QuotationTemplateService.generateBillOfMaterials(project, propertyType);

      res.json({ billOfMaterials });
    } catch (error) {
      console.error("Error generating BOM preview:", error);
      res.status(500).json({ message: "Failed to generate BOM preview" });
    }
  });

  // Create quotation from site visit
  app.post("/api/quotations/from-site-visit/:siteVisitId", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.create"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if user provided form data (modified projects)
      const formData = req.body;
      const hasFormData = formData && formData.projects && formData.projects.length > 0;
      
      if (hasFormData) {
        // User has provided modified form data - use it directly instead of re-mapping from site visit
        // This allows users to change project types and configurations during quotation creation
        
        // Validate and create quotation with form data
        try {
          console.log("FORM_DATA_RECEIVED:", JSON.stringify({
            hasProjects: !!formData.projects,
            projectsLength: formData.projects?.length,
            hasCustomerId: !!formData.customerId,
            hasSource: !!formData.source,
            hasStatus: !!formData.status,
            hasTotalSystemCost: formData.totalSystemCost !== undefined,
            hasTotalCustomerPayment: formData.totalCustomerPayment !== undefined,
            hasAdvanceAmount: formData.advanceAmount !== undefined,
            hasBalanceAmount: formData.balanceAmount !== undefined
          }, null, 2));
          
          const quotationToCreate = {
            ...formData,
            quotationNumber: QuotationTemplateService.generateQuotationNumber(),
            source: formData.source || 'site_visit' as const,
            status: formData.status || 'draft' as const,
            createdAt: undefined // Remove createdAt - storage adds it
          };
          
          const { createdAt, ...cleanQuotationData } = quotationToCreate;
          const quotation = await storage.createQuotation(cleanQuotationData);
          
          res.status(201).json({
            quotation,
            message: "Quotation created successfully from site visit with modified projects"
          });
          return;
        } catch (error) {
          console.error("Error creating quotation with form data:", error);
          console.error("Error details:", (error as any).message || String(error));
          if ((error as any).errors) {
            console.error("Validation errors:", JSON.stringify((error as any).errors, null, 2));
          }
          res.status(500).json({ message: "Failed to create quotation from form data", error: String(error) });
          return;
        }
      }

      // If no form data provided, use the original site visit mapping flow
      const { DataCompletenessAnalyzer, SiteVisitDataMapper } = await import("../services/quotation-mapping-service");
      
      // Get site visit data
      const { siteVisitService } = await import("../services/site-visit-service");
      const siteVisit = await siteVisitService.getSiteVisitById(req.params.siteVisitId);
      
      if (!siteVisit) {
        return res.status(404).json({ message: "Site visit not found" });
      }

      // Analyze data completeness
      const completenessAnalysis = DataCompletenessAnalyzer.analyze(siteVisit);
      
      if (!completenessAnalysis.canCreateQuotation) {
        return res.status(400).json({ 
          message: "Site visit data incomplete for quotation creation",
          analysis: completenessAnalysis
        });
      }

      // Map site visit data to quotation
      const mappingResult = await SiteVisitDataMapper.mapToQuotation(siteVisit, user.uid);
      
      // Create quotation with mapped data - ensure all required fields are present
      // Note: createdAt is added automatically by storage.createQuotation, so don't include it here
      const quotationData = {
        ...mappingResult.quotationData,
        customerId: mappingResult.quotationData.customerId || 'temp_customer_' + Date.now(),
        quotationNumber: QuotationTemplateService.generateQuotationNumber(),
        source: 'site_visit' as const,
        status: mappingResult.quotationData.status || 'draft' as const,
        projects: mappingResult.quotationData.projects || [],
        totalSystemCost: mappingResult.quotationData.totalSystemCost || 0,
        totalCustomerPayment: mappingResult.quotationData.totalCustomerPayment || 0,
        advanceAmount: mappingResult.quotationData.advanceAmount || 0,
        balanceAmount: mappingResult.quotationData.balanceAmount || 0,
        siteVisitMapping: mappingResult.mappingMetadata
      };
      
      // Remove fields that shouldn't be in insertQuotationSchema
      const { createdAt, ...cleanQuotationData } = quotationData;

      try {
        const quotation = await storage.createQuotation(cleanQuotationData);
        
        res.status(201).json({
          quotation,
          mappingAnalysis: completenessAnalysis,
          warnings: mappingResult.businessRuleWarnings
        });
      } catch (storageError) {
        console.error("Storage error creating quotation:", storageError);
        throw storageError;
      }
    } catch (error) {
      console.error("Error creating quotation from site visit:", error);
      res.status(500).json({ message: "Failed to create quotation from site visit", error: String(error) });
    }
  });

  // Get site visits that can be mapped to quotations
  app.get("/api/quotations/site-visits/mappable", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.create"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { siteVisitService } = await import("../services/site-visit-service");
      const { DataCompletenessAnalyzer } = await import("../services/quotation-mapping-service");
      
      // Get all completed site visits
      const siteVisits = await siteVisitService.getSiteVisitsWithFilters({
        status: 'completed'
      });

      // Analyze each for quotation readiness
      const mappableSiteVisits = siteVisits.map(siteVisit => {
        const analysis = DataCompletenessAnalyzer.analyze(siteVisit);
        return {
          ...siteVisit,
          completenessAnalysis: analysis
        };
      });

      res.json({
        data: mappableSiteVisits,
        count: mappableSiteVisits.length
      });
    } catch (error) {
      console.error("Error fetching mappable site visits:", error);
      res.status(500).json({ message: "Failed to fetch mappable site visits" });
    }
  });

  // Get site visit mapping data for quotation creation
  app.get("/api/quotations/site-visits/:siteVisitId/mapping-data", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.create"))) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { siteVisitService } = await import("../services/site-visit-service");
      const { DataCompletenessAnalyzer, SiteVisitDataMapper } = await import("../services/quotation-mapping-service");
      
      const siteVisit = await siteVisitService.getSiteVisitById(req.params.siteVisitId);
      
      if (!siteVisit) {
        return res.status(404).json({ message: "Site visit not found" });
      }

      // Analyze completeness
      const completenessAnalysis = DataCompletenessAnalyzer.analyze(siteVisit);
      
      // Get mapping preview
      const mappingResult = await SiteVisitDataMapper.mapToQuotation(siteVisit, user.uid);
      
      res.json({
        siteVisit,
        completenessAnalysis,
        mappingPreview: mappingResult.quotationData,
        warnings: mappingResult.businessRuleWarnings,
        transformations: mappingResult.dataTransformations
      });
    } catch (error) {
      console.error("Error fetching site visit mapping data:", error);
      res.status(500).json({ message: "Failed to fetch site visit mapping data" });
    }
  });
}