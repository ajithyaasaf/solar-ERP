import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/auth-context";
import { formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, Calendar, Loader2, User, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function HRApprovalList() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [remarks, setRemarks] = useState("");

  const { data: pendingLeaves, isLoading } = useQuery<any[]>({
    queryKey: ["/api/leave-applications/pending-hr"],
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ leaveId, remarks }: { leaveId: string; remarks?: string }) => {
      return apiRequest(`/api/leave-applications/${leaveId}/approve-hr`, "PUT", { remarks });
    },
    onSuccess: () => {
      toast({
        title: "Leave Approved",
        description: "Leave application has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-applications/pending-hr"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balance/current"] });
      setShowApprovalDialog(false);
      setSelectedLeave(null);
      setRemarks("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve leave",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ leaveId, reason }: { leaveId: string; reason: string }) => {
      return apiRequest(`/api/leave-applications/${leaveId}/reject`, "PUT", { reason });
    },
    onSuccess: () => {
      toast({
        title: "Leave Rejected",
        description: "Leave application has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-applications/pending-hr"] });
      setShowApprovalDialog(false);
      setSelectedLeave(null);
      setRemarks("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject leave",
        variant: "destructive",
      });
    },
  });

  const handleApprovalClick = (leave: any, action: "approve" | "reject") => {
    setSelectedLeave(leave);
    setApprovalAction(action);
    setShowApprovalDialog(true);
  };

  const handleSubmitApproval = () => {
    if (!selectedLeave) return;

    if (approvalAction === "approve") {
      approveMutation.mutate({ leaveId: selectedLeave.id, remarks });
    } else {
      if (!remarks.trim()) {
        toast({
          title: "Remarks Required",
          description: "Please provide a reason for rejection",
          variant: "destructive",
        });
        return;
      }
      rejectMutation.mutate({ leaveId: selectedLeave.id, reason: remarks });
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      casual_leave: "Casual Leave",
      permission: "Permission",
      unpaid_leave: "Unpaid Leave",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading pending approvals...</span>
      </div>
    );
  }

  if (!pendingLeaves || pendingLeaves.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No pending HR approvals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4" data-testid="container-hr-approvals">
        {pendingLeaves.map((leave: any) => (
          <Card key={leave.id} data-testid={`card-leave-${leave.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {leave.userName}
                  </CardTitle>
                  <CardDescription>
                    {leave.userDepartment} - {leave.userDesignation}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Shield className="h-3 w-3 mr-1" />
                  HR Review Required
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Leave Type:</span>
                  <p className="font-medium">{getLeaveTypeLabel(leave.leaveType)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {leave.leaveType === "permission" ? "Date:" : "Duration:"}
                  </span>
                  <p className="font-medium">
                    {leave.leaveType === "permission" ? (
                      formatDate(leave.permissionDate)
                    ) : (
                      `${leave.totalDays} day(s)`
                    )}
                  </p>
                </div>
                {leave.leaveType !== "permission" && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Start Date:</span>
                      <p className="font-medium">{formatDate(leave.startDate)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">End Date:</span>
                      <p className="font-medium">{formatDate(leave.endDate)}</p>
                    </div>
                  </>
                )}
                {leave.leaveType === "permission" && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Time:</span>
                    <p className="font-medium">
                      {leave.permissionStartTime} - {leave.permissionEndTime} ({leave.permissionHours}h)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Reason:</span>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">{leave.reason}</p>
              </div>

              {leave.managerRemarks && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">Manager Approval</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Approved by {leave.reportingManagerName || "Manager"} on {formatDate(leave.managerApprovedAt)}
                    </div>
                    {leave.managerRemarks && (
                      <div className="text-sm mt-2">
                        <span className="font-medium">Remarks:</span> {leave.managerRemarks}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {leave.balanceAtApplication && (
                <div className="flex gap-4 text-sm p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <div>
                    <span className="text-muted-foreground">CL Available:</span>
                    <span className="ml-2 font-medium">
                      {leave.balanceAtApplication.casualLeaveAvailable}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Permission Available:</span>
                    <span className="ml-2 font-medium">
                      {leave.balanceAtApplication.permissionHoursAvailable}h
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleApprovalClick(leave, "approve")}
                  className="flex-1"
                  data-testid={`button-approve-${leave.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Final Approve
                </Button>
                <Button
                  onClick={() => handleApprovalClick(leave, "reject")}
                  variant="destructive"
                  className="flex-1"
                  data-testid={`button-reject-${leave.id}`}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent data-testid="dialog-approval">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Final Approve Leave" : "Reject Leave Application"}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? "This is the final approval. Leave balance will be updated upon confirmation."
                : "Please provide a reason for rejecting this leave application."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="remarks">
              {approvalAction === "approve" ? "Remarks (Optional)" : "Rejection Reason (Required)"}
            </Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                approvalAction === "approve"
                  ? "Add any final comments..."
                  : "Provide reason for rejection..."
              }
              className="mt-2"
              data-testid="textarea-remarks"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApprovalDialog(false);
                setRemarks("");
              }}
              data-testid="button-cancel-approval"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitApproval}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              variant={approvalAction === "approve" ? "default" : "destructive"}
              data-testid="button-confirm-approval"
            >
              {(approveMutation.isPending || rejectMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {approvalAction === "approve" ? "Final Approve" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
