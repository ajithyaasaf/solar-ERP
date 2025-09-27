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
      if (req.query.status) filters.status = req.query.status;
      if (req.query.search) filters.search = req.query.search;

      const quotations = await storage.listQuotations();
      
      res.json({
        data: quotations,
        pagination: {
          page,
          limit,
          total: quotations.length // This would need proper count implementation
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
        createdBy: user.uid,
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

      const updatedQuotation = await storage.updateQuotation(req.params.id, {
        ...req.body,
        updatedBy: user.uid,
        updatedAt: new Date()
      });

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

  // Create quotation from site visit
  app.post("/api/quotations/from-site-visit/:siteVisitId", verifyAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.authenticatedUser?.uid || "");
      if (!user || !(await storage.checkEffectiveUserPermission(user.uid, "quotations.create"))) {
        return res.status(403).json({ message: "Access denied" });
      }

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
      
      // Create quotation with mapped data
      const quotationData = {
        ...mappingResult.quotationData,
        createdBy: user.uid,
        quotationNumber: QuotationTemplateService.generateQuotationNumber(),
        source: 'site_visit' as const,
        status: mappingResult.quotationData.status || 'draft' as const,
        customerId: mappingResult.quotationData.customerId || siteVisit.customer?.id || '',
        siteVisitMapping: mappingResult.mappingMetadata
      };

      const quotation = await storage.createQuotation(quotationData);
      
      res.status(201).json({
        quotation,
        mappingAnalysis: completenessAnalysis,
        warnings: mappingResult.businessRuleWarnings
      });
    } catch (error) {
      console.error("Error creating quotation from site visit:", error);
      res.status(500).json({ message: "Failed to create quotation from site visit" });
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