import { useState } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LeaveApplicationForm } from "@/components/leave/leave-application-form";
import { LeaveBalanceWidget } from "@/components/leave/leave-balance-widget";
import { LeaveHistoryTable } from "@/components/leave/leave-history-table";
import { ManagerApprovalList } from "@/components/leave/manager-approval-list";
import { HRApprovalList } from "@/components/leave/hr-approval-list";
import { LeaveCalendarView } from "@/components/leave/leave-calendar-view";
import { Calendar, Clock, CheckSquare, UserCheck, Shield, PlusCircle } from "lucide-react";

export default function Leave() {
  const { user } = useAuthContext();
  const [showApplyLeaveDialog, setShowApplyLeaveDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("my-leaves");

  const isHR = user?.department === "hr";

  return (
    <div className="space-y-6" data-testid="page-leave">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your leave applications and approvals
          </p>
        </div>
        <Button
          onClick={() => setShowApplyLeaveDialog(true)}
          data-testid="button-apply-leave"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Apply Leave
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-leave">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="my-leaves" data-testid="tab-my-leaves">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">My Leaves</span>
                <span className="sm:hidden">Leaves</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" data-testid="tab-calendar">
                <Clock className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Calendar</span>
                <span className="sm:hidden">Cal</span>
              </TabsTrigger>
              <TabsTrigger value="manager-approvals" data-testid="tab-manager-approvals">
                <UserCheck className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Manager</span>
                <span className="sm:hidden">Mgr</span>
              </TabsTrigger>
              {(isHR || user?.role === "admin" || user?.role === "master_admin") && (
                <TabsTrigger value="hr-approvals" data-testid="tab-hr-approvals">
                  <Shield className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">HR</span>
                  <span className="sm:hidden">HR</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my-leaves" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Leave Applications</CardTitle>
                  <CardDescription>
                    View and manage your leave history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveHistoryTable />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Leave Calendar</CardTitle>
                  <CardDescription>
                    Visual overview of your approved leaves
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveCalendarView />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manager-approvals" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manager Approvals</CardTitle>
                  <CardDescription>
                    Review and approve leave applications from your team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ManagerApprovalList />
                </CardContent>
              </Card>
            </TabsContent>

            {(isHR || user?.role === "admin" || user?.role === "master_admin") && (
              <TabsContent value="hr-approvals" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>HR Approvals</CardTitle>
                    <CardDescription>
                      Final review and approval of leave applications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HRApprovalList />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="space-y-6">
          <LeaveBalanceWidget
            onApplyLeave={() => setShowApplyLeaveDialog(true)}
            onViewHistory={() => setActiveTab("my-leaves")}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-start gap-2">
                <CheckSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Monthly Allocation</p>
                  <p className="text-xs text-muted-foreground">1 casual leave + 2 hours permission</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Approval Flow</p>
                  <p className="text-xs text-muted-foreground">Employee → Manager → HR</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Fixed Holidays</p>
                  <p className="text-xs text-muted-foreground">May 1, Aug 15, Oct 2, Jan 26</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showApplyLeaveDialog} onOpenChange={setShowApplyLeaveDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>
              Fill in the details to submit your leave application for approval.
            </DialogDescription>
          </DialogHeader>
          <LeaveApplicationForm onSuccess={() => setShowApplyLeaveDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
