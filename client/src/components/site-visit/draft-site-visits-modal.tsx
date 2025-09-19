/**
 * Draft Site Visits Modal Component
 * Allows users to view, resume, and delete saved draft site visits
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Calendar, 
  User, 
  MapPin, 
  Edit3, 
  Trash2, 
  AlertCircle,
  Clock,
  Building
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface DraftSiteVisit {
  id: string;
  visitPurpose: string;
  customer: {
    name: string;
    mobile: string;
    address: string;
    propertyType: string;
  };
  department: string;
  status: 'draft';
  isDraft: boolean;
  formCompletionStatus: {
    visitPurpose: boolean;
    customerDetails: boolean;
    location: boolean;
    photos: boolean;
    departmentForm: boolean;
  };
  completionPercentage: number;
  lastModified: string;
  createdAt: string;
  notes?: string;
  technicalData?: any;
  marketingData?: any;
  adminData?: any;
}

interface DraftSiteVisitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeDraft: (draft: DraftSiteVisit) => void;
  userDepartment: string;
}

export function DraftSiteVisitsModal({ 
  isOpen, 
  onClose, 
  onResumeDraft, 
  userDepartment 
}: DraftSiteVisitsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // Fetch user's drafts
  const { data: draftsData, isLoading, error } = useQuery({
    queryKey: ['/api/site-visits/drafts'],
    enabled: isOpen
  });

  const drafts = (draftsData as any)?.data || [];

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return await apiRequest(`/api/site-visits/drafts/${draftId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Draft Deleted",
        description: "The draft has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/site-visits/drafts'] });
      setDeletingDraftId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete draft. Please try again.",
        variant: "destructive",
      });
      setDeletingDraftId(null);
    },
  });

  const handleResumeDraft = (draft: DraftSiteVisit) => {
    onResumeDraft(draft);
    onClose();
  };

  const handleDeleteDraft = (draftId: string) => {
    setDeletingDraftId(draftId);
    deleteDraftMutation.mutate(draftId);
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'h:mm a'),
      relative: formatDistanceToNow(date, { addSuffix: true })
    };
  };

  const getCompletionFields = (formCompletion: any) => {
    const fields = [];
    if (formCompletion?.visitPurpose) fields.push('Purpose');
    if (formCompletion?.customerDetails) fields.push('Customer');
    if (formCompletion?.location) fields.push('Location');
    if (formCompletion?.photos) fields.push('Photos');
    if (formCompletion?.departmentForm) fields.push('Department Details');
    return fields;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Draft Site Visits
          </DialogTitle>
          <DialogDescription>
            Continue working on incomplete site visit forms or delete unwanted drafts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading drafts...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-8 text-red-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              Failed to load drafts. Please try again.
            </div>
          )}

          {!isLoading && !error && drafts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No drafts found</p>
              <p className="text-sm">You don't have any saved draft site visits.</p>
            </div>
          )}

          {!isLoading && !error && drafts.length > 0 && (
            <div className="grid gap-4">
              {drafts.map((draft: DraftSiteVisit) => {
                const lastModified = formatTime(draft.lastModified);
                const completedFields = getCompletionFields(draft.formCompletionStatus);
                const isDeleting = deletingDraftId === draft.id;

                return (
                  <Card key={draft.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-muted-foreground" />
                            {draft.customer.name || 'Untitled Draft'}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-orange-100 text-orange-800">
                              {draft.department.charAt(0).toUpperCase() + draft.department.slice(1)}
                            </Badge>
                            <Badge variant="outline" className="bg-gray-100 text-gray-800">
                              Draft ({draft.completionPercentage}% complete)
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResumeDraft(draft)}
                            data-testid={`button-resume-draft-${draft.id}`}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Resume
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDraft(draft.id)}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-draft-${draft.id}`}
                          >
                            {isDeleting ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* Customer Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {draft.customer.mobile && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Mobile:</span>
                            <span>{draft.customer.mobile}</span>
                          </div>
                        )}
                        {draft.customer.propertyType && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span>{draft.customer.propertyType}</span>
                          </div>
                        )}
                      </div>

                      {draft.customer.address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="flex-1">{draft.customer.address}</span>
                        </div>
                      )}

                      <Separator />

                      {/* Draft Details */}
                      <div className="space-y-2">
                        {draft.visitPurpose && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Purpose:</span>
                            <span>{draft.visitPurpose}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Last modified:</span>
                          <span>{lastModified.time} on {lastModified.date}</span>
                          <span className="text-muted-foreground">({lastModified.relative})</span>
                        </div>

                        {completedFields.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-sm font-medium mr-2">Completed:</span>
                            {completedFields.map((field, index) => (
                              <Badge key={field} variant="secondary" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {draft.notes && (
                          <div className="text-sm">
                            <span className="font-medium">Notes:</span>
                            <p className="text-muted-foreground mt-1">{draft.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}