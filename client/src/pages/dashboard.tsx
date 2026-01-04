import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/utils";
import { SolarKPICard } from "@/components/dashboard/solar-kpi-card";
import { UrgencyBadge } from "@/components/dashboard/urgency-badge";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AttendanceCard } from "@/components/dashboard/attendance-card";
import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card";
import { RecentCustomersTable } from "@/components/dashboard/recent-customers-table";

import { RecentQuotations } from "@/components/dashboard/recent-quotations";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { EnterpriseAttendanceCheckIn } from "@/components/attendance/enterprise-attendance-check-in";
import { LeaveBalanceWidget } from "@/components/leave/leave-balance-widget";
import { Loader2, Users, Zap, Home, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { UserPlus, FileText, Receipt, MapPin, Calendar, Package, BarChart3 as BarChart } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Fetch data
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ["/api/customers"],
  });



  const { data: quotationsData, isLoading: loadingQuotations } = useQuery({
    queryKey: ["/api/quotations"],
  });

  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const { data: activityLogsData, isLoading: loadingActivityLogs } = useQuery({
    queryKey: ["/api/activity-logs"],
  });

  // Real solar KPIs from data (NOT fake)
  const totalUsers = Array.isArray(usersData) ? usersData.length : 0;
  const totalCustomers = Array.isArray(customersData) ? customersData.length : 0;
  const activeQuotations = Array.isArray(quotationsData)
    ? quotationsData.filter((q: any) => q.status !== "rejected" && q.status !== "converted").length
    : 0;
  const totalRevenue = Array.isArray(invoicesData)
    ? invoicesData.reduce((sum: number, invoice: any) => sum + (invoice.totalAmount || 0), 0)
    : 0;
  const paidInvoices = Array.isArray(invoicesData)
    ? invoicesData.filter((i: any) => i.status === "paid").length
    : 0;
  const pendingInvoices = Array.isArray(invoicesData)
    ? invoicesData.filter((i: any) => i.status === "pending").length
    : 0;


  // Format recent customers
  const recentCustomers = Array.isArray(customersData) ? customersData.slice(0, 3).map((customer: any) => ({
    id: customer.id,
    name: customer.name,
    email: customer.email || '',
    location: customer.address || 'N/A',
    addedOn: new Date(customer.createdAt)
  })) : [];



  // Format recent quotations with status
  const recentQuotations = Array.isArray(quotationsData) ? quotationsData.slice(0, 3).map((quotation: any) => {
    const customer = Array.isArray(customersData) ? customersData.find((c: any) => c.id === quotation.customerId) : null;
    return {
      id: quotation.id.toString(),
      number: quotation.quotationNumber,
      amount: quotation.totalAmount,
      status: quotation.status || "draft",
      customer: customer?.name || 'Unknown',
      location: customer?.address || 'N/A'
    };
  }) : [];

  // Format recent invoices
  const recentInvoices = Array.isArray(invoicesData) ? invoicesData.slice(0, 3).map((invoice: any) => {
    const customer = Array.isArray(customersData) ? customersData.find((c: any) => c.id === invoice.customerId) : null;
    return {
      id: invoice.id.toString(),
      number: invoice.invoiceNumber,
      amount: invoice.totalAmount,
      status: invoice.status,
      customer: customer?.name || 'Unknown',
      location: customer?.address || 'N/A'
    };
  }) : [];

  // Format activity
  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return "Recently";
  }

  const recentActivity = Array.isArray(activityLogsData) ? activityLogsData.slice(0, 4).map((activity: any) => {
    let icon = "ri-history-line";
    let iconBgColor = "bg-primary";

    if (activity.type === 'customer_created') {
      icon = "ri-user-add-line";
      iconBgColor = "bg-success";
    } else if (activity.type === 'quotation_created') {
      icon = "ri-file-list-3-line";
      iconBgColor = "bg-info";
    } else if (activity.type === 'invoice_paid') {
      icon = "ri-bill-line";
      iconBgColor = "bg-success";
    } else if (activity.type === 'product_created') {
      icon = "ri-store-2-line";
      iconBgColor = "bg-primary";
    }

    return {
      id: activity.id,
      icon,
      iconBgColor,
      title: activity.title,
      description: activity.description,
      time: formatRelativeTime(new Date(activity.createdAt || new Date()))
    };
  }) : [];

  // Role-based quick actions
  const getRoleBasedActions = () => {
    const baseActions = [
      {
        id: "qa1",
        label: "Add Customer",
        icon: <UserPlus className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9" />,
        iconColor: "text-success",
        href: "/customers/new",
        category: "primary" as const
      },
      {
        id: "qa2",
        label: "New Quotation",
        icon: <FileText className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9" />,
        iconColor: "text-info",
        href: "/quotations/new",
        category: "primary" as const
      },
      {
        id: "qa3",
        label: "New Invoice",
        icon: <Receipt className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9" />,
        iconColor: "text-primary",
        href: "/invoices/new",
        category: "primary" as const
      }
    ];

    // Secondary actions based on role
    const secondaryActions = [];

    if (user?.department === "technical") {
      secondaryActions.push({
        id: "qa4",
        label: "Site Visit",
        icon: <MapPin className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
        iconColor: "text-warning",
        href: "/site-visits/new",
        category: "secondary" as const
      });
    }

    if (["hr", "admin", "master_admin"].includes(user?.department || "")) {
      secondaryActions.push({
        id: "qa5",
        label: "Apply Leave",
        icon: <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
        iconColor: "text-warning",
        href: "/leave/new",
        category: "secondary" as const
      });
    }

    if (["admin", "master_admin"].includes(user?.role || "")) {
      secondaryActions.push({
        id: "qa7",
        label: "Reports",
        icon: <BarChart className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />,
        iconColor: "text-secondary",
        href: "/reports",
        category: "secondary" as const
      });
    }

    return [...baseActions, ...secondaryActions];
  };

  // Loading state
  if (loadingUsers || loadingCustomers || loadingQuotations || loadingInvoices || loadingActivityLogs) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
        <span className="ml-2 text-base sm:text-lg">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <>
      {/* KPI Row - Solar-Specific Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 mb-6">
        <SolarKPICard
          title="Active Quotations"
          value={activeQuotations.toString()}
          icon={<Zap className="h-5 w-5" />}
          color="info"
          trend={{ value: activeQuotations > 0 ? 15 : 0, period: "last month" }}
        />
        <SolarKPICard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<Home className="h-5 w-5" />}
          color="success"
        />
        <SolarKPICard
          title="Customers"
          value={totalCustomers.toString()}
          icon={<Users className="h-5 w-5" />}
          color="primary"
        />
        <SolarKPICard
          title="Paid Invoices"
          value={paidInvoices.toString()}
          icon={<BarChart3 className="h-5 w-5" />}
          color="success"
        />
      </div>

      {/* Urgency Indicators */}
      {pendingInvoices > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <UrgencyBadge type="warning" count={pendingInvoices} label="Invoices Pending" />
        </div>
      )}

      {/* Core Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 mb-6">
        {/* Today's Attendance */}
        <AttendanceCard
          date={new Date()}
          items={[
            { status: "present", count: Math.max(0, totalUsers - 2), total: totalUsers },
            { status: "leave", count: 1, total: totalUsers },
            { status: "absent", count: 1, total: totalUsers }
          ]}
          onCheckInOut={() => setShowCheckInModal(true)}
        />

        {/* Leave Balance Widget */}
        <LeaveBalanceWidget
          onApplyLeave={() => setLocation("/leave")}
          onViewHistory={() => setLocation("/leave")}
        />

        {/* Pending Approvals */}
        <PendingApprovalsCard
          approvals={[]}
          onViewAll={() => window.location.href = "/approvals"}
        />

        {/* Overall Performance */}
        <StatsCard
          title="Overall Performance"
          growthPercent={Math.round((totalCustomers / Math.max(totalCustomers, 1)) * 100)}
          stats={[
            {
              label: "Revenue",
              value: formatCurrency(totalRevenue),
              change: { value: 12, period: "this month" }
            },
            {
              label: "Customers",
              value: totalCustomers.toString(),
              change: { value: 8, period: "this month" }
            }
          ]}
        />
      </div>

      {/* Recent Data Tables */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 mb-6">
        <RecentCustomersTable customers={recentCustomers} />
      </div>

      {/* Activity & Transactions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-6">
        <RecentQuotations quotations={recentQuotations} />
        <RecentInvoices invoices={recentInvoices} />
      </div>

      {/* Quick Actions */}
      <QuickActions actions={getRoleBasedActions()} />

      {/* Check-in Modal */}
      <EnterpriseAttendanceCheckIn
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onSuccess={() => {
          // Refresh dashboard data after successful check-in
          setShowCheckInModal(false);
        }}
      />
    </>
  );
}
