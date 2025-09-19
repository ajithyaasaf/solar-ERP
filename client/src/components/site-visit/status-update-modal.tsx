/**
 * Status Update Modal Component
 * Allows users to update site visit status with reason and notes
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  User,
  ArrowRight
} from "lucide-react";

interface SiteVisit {
  id: string;
  customer: {
    name: string;
    mobile: string;
    address: string;
  };
  visitPurpose: string;
  department: string;
  status: string;
  siteInTime: string;
}

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: SiteVisit | null;
  userId: string;
}

// Status options with their transitions and metadata
const statusOptions = [
  {
    value: 'on_process',
    label: 'On Process',
    description: 'Visit is in progress, will complete later',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    value: 'completed',
    label: 'Completed',
    description: 'Visit has been successfully completed',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    value: 'rejected',
    label: 'Rejected',
    description: 'Visit was cancelled or rejected',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200'
  }
];

// Predefined reasons for each status
const statusReasons = {
  on_process: [
    'Partial work completed, will return later',
    'Customer requested to reschedule',
    'Waiting for additional materials/resources',
    'Technical issues need further investigation',
    'Customer not available, rescheduled'
  ],
  completed: [
    'All work completed successfully',
    'Customer satisfied with service',
    'Installation/service completed as planned',
    'All requirements fulfilled'
  ],
  rejected: [
    'Customer cancelled the service',
    'Location not suitable for work',
    'Customer requirements changed',
    'Technical constraints prevent completion',
    'Safety concerns identified'
  ]
};

export function StatusUpdateModal({ isOpen, onClose, visit, userId }: StatusUpdateModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/site-visits/${visit?.id}/status`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: `Site visit status has been updated to ${selectedStatus.replace('_', ' ')}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/site-visits'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedStatus('');
    setSelectedReason('');
    setCustomReason('');
    setAdditionalNotes('');
    onClose();
  };

  const handleUpdateStatus = () => {
    if (!selectedStatus) {
      toast({
        title: "Status Required",
        description: "Please select a status to update.",
        variant: "destructive",
      });
      return;
    }

    const finalReason = selectedReason === 'custom' ? customReason : selectedReason;
    
    if (!finalReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the status change.",
        variant: "destructive",
      });
      return;
    }

    const statusUpdateData = {
      status: selectedStatus,
      reason: finalReason,
      notes: additionalNotes.trim() || undefined,
      updatedBy: userId
    };

    updateStatusMutation.mutate(statusUpdateData);
  };

  const getAvailableStatuses = (currentStatus: string) => {
    // Define valid transitions based on the schema
    const transitions: Record<string, string[]> = {
      'draft': ['in_progress', 'rejected'],
      'in_progress': ['on_process', 'completed', 'rejected'],
      'on_process': ['completed', 'rejected', 'in_progress']
    };
    
    const allowedTransitions = transitions[currentStatus] || [];
    return statusOptions.filter(option => allowedTransitions.includes(option.value));
  };

  const availableStatuses = visit ? getAvailableStatuses(visit.status) : [];
  const currentReasons = selectedStatus ? statusReasons[selectedStatus as keyof typeof statusReasons] || [] : [];

  if (!visit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Update Site Visit Status
          </DialogTitle>
          <DialogDescription>
            Change the status of this site visit and provide a reason for the update.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visit Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                {visit.customer.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {visit.department.charAt(0).toUpperCase() + visit.department.slice(1)}
                </Badge>
                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                  Current: {visit.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Purpose:</span> {visit.visitPurpose}</div>
                <div><span className="font-medium">Mobile:</span> {visit.customer.mobile}</div>
                <div><span className="font-medium">Address:</span> {visit.customer.address}</div>
              </div>
            </CardContent>
          </Card>

          {/* Status Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Select New Status</Label>
            {availableStatuses.length === 0 ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <AlertCircle className="h-5 w-5 mr-2" />
                No status updates available for current state.
              </div>
            ) : (
              <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus}>
                <div className="grid gap-3">
                  {availableStatuses.map((status) => {
                    const Icon = status.icon;
                    return (
                      <div key={status.value} className="flex items-center space-x-3">
                        <RadioGroupItem 
                          value={status.value} 
                          id={status.value}
                          data-testid={`radio-status-${status.value}`}
                        />
                        <Label 
                          htmlFor={status.value} 
                          className="flex-1 cursor-pointer"
                        >
                          <Card className={`p-3 ${selectedStatus === status.value ? 'ring-2 ring-primary' : ''}`}>
                            <div className="flex items-start gap-3">
                              <Icon className="h-5 w-5 mt-0.5" />
                              <div className="flex-1">
                                <div className="font-medium">{status.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {status.description}
                                </div>
                              </div>
                              <Badge variant="outline" className={status.color}>
                                {status.label}
                              </Badge>
                            </div>
                          </Card>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            )}
          </div>

          {/* Reason Selection */}
          {selectedStatus && currentReasons.length > 0 && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Reason for Status Change</Label>
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                <div className="space-y-2">
                  {currentReasons.map((reason, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={reason} 
                        id={`reason-${index}`}
                        data-testid={`radio-reason-${index}`}
                      />
                      <Label 
                        htmlFor={`reason-${index}`} 
                        className="text-sm cursor-pointer"
                      >
                        {reason}
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="custom" 
                      id="custom-reason"
                      data-testid="radio-reason-custom"
                    />
                    <Label htmlFor="custom-reason" className="text-sm cursor-pointer">
                      Custom reason
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              {selectedReason === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-reason-text">Custom Reason</Label>
                  <Textarea
                    id="custom-reason-text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter custom reason for status change..."
                    rows={2}
                    data-testid="textarea-custom-reason"
                  />
                </div>
              )}
            </div>
          )}

          {/* Additional Notes */}
          {selectedStatus && (
            <div className="space-y-2">
              <Label htmlFor="additional-notes">Additional Notes (Optional)</Label>
              <Textarea
                id="additional-notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Add any additional notes or details..."
                rows={3}
                data-testid="textarea-additional-notes"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateStatus}
            disabled={!selectedStatus || updateStatusMutation.isPending}
            data-testid="button-update-status"
          >
            {updateStatusMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Update Status
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}