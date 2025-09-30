import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AttendanceCard } from "@/components/dashboard/attendance-card";
import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card";
import { RecentCustomersTable } from "@/components/dashboard/recent-customers-table";
import { LowStockProductsTable } from "@/components/dashboard/low-stock-products-table";
import { RecentQuotations } from "@/components/dashboard/recent-quotations";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CheckInModal } from "@/components/dashboard/check-in-modal";
import { LeaveBalanceWidget } from "@/components/leave/leave-balance-widget";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // For now, we'll use the working API endpoints and calculate attendance from users
  // TODO: Implement attendance API endpoint when needed

  // Fetch users data for attendance calculations
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch customers data
  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Fetch products data
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch quotations data
  const { data: quotationsData, isLoading: loadingQuotations } = useQuery({
    queryKey: ["/api/quotations"],
  });

  // Fetch invoices data
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ["/api/invoices"],
  });

  // Calculate real-time dashboard statistics from Firestore data
  const totalUsers = Array.isArray(usersData) ? usersData.length : 0;
  
  // For demo purposes, calculate some basic stats (will be replaced with real attendance data)
  const presentCount = Math.floor(totalUsers * 0.8); // Assume 80% present
  const leaveCount = Math.floor(totalUsers * 0.1); // Assume 10% on leave  
  const absentCount = totalUsers - presentCount - leaveCount;

  // Calculate revenue from invoices
  const totalRevenue = Array.isArray(invoicesData) ? invoicesData.reduce((sum: number, invoice: any) => 
    sum + (invoice.totalAmount || 0), 0) : 0;
  
  // Calculate new customers this month
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const newCustomersThisMonth = Array.isArray(customersData) ? customersData.filter((customer: any) => 
    new Date(customer.createdAt) >= thisMonth).length : 0;

  // Create summary data from real Firestore data
  const summaryData = {
    overallPerformance: {
      growthPercent: newCustomersThisMonth > 0 ? ((newCustomersThisMonth / (Array.isArray(customersData) ? customersData.length : 1)) * 100) : 0,
      revenue: {
        value: totalRevenue,
        change: {
          value: newCustomersThisMonth,
          period: "this month"
        }
      },
      newCustomers: {
        value: newCustomersThisMonth,
        change: {
          value: newCustomersThisMonth,
          period: "this month"
        }
      }
    },
    attendance: {
      date: new Date(),
      items: [
        { status: "present" as const, count: presentCount, total: totalUsers },
        { status: "leave" as const, count: leaveCount, total: totalUsers },
        { status: "absent" as const, count: absentCount, total: totalUsers }
      ]
    },
    pendingApprovals: [] // Will be populated with real leave data when API is available
  };

  // Format recent customers from Firestore data
  const recentCustomers = Array.isArray(customersData) ? customersData.slice(0, 3).map((customer: any) => ({
    id: customer.id,
    name: customer.name,
    email: customer.email || '',
    location: customer.address || 'N/A',
    addedOn: new Date(customer.createdAt)
  })) : [];

  // Format low stock products from Firestore data
  const lowStockProducts = Array.isArray(productsData) ? productsData
    .filter((product: any) => (product.quantity || 0) <= 10)
    .slice(0, 3)
    .map((product: any) => ({
      id: product.id,
      name: product.name,
      type: product.type || product.make || '',
      icon: (product.type?.toLowerCase().includes('battery') ? 'battery' : 
            product.type?.toLowerCase().includes('inverter') ? 'plug' : 'dashboard') as 'battery' | 'plug' | 'dashboard',
      currentStock: product.quantity || 0,
      price: product.price,
      status: ((product.quantity || 0) <= 5 ? 'critical' : 'low') as 'critical' | 'low'
    })) : [];

  // Format recent quotations from Firestore data
  const recentQuotations = Array.isArray(quotationsData) ? quotationsData.slice(0, 3).map((quotation: any) => {
    const customer = Array.isArray(customersData) ? customersData.find((c: any) => c.id === quotation.customerId) : null;
    return {
      id: quotation.id.toString(),
      number: quotation.quotationNumber,
      amount: quotation.totalAmount,
      customer: customer?.name || 'Unknown',
      location: customer?.address || 'N/A'
    };
  }) : [];

  // Format recent invoices from Firestore data
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

  // Fetch activity logs
  const { data: activityLogsData, isLoading: loadingActivityLogs } = useQuery({
    queryKey: ["/api/activity-logs"],
  });

  // Format activity logs from API data
  const recentActivity = Array.isArray(activityLogsData) ? activityLogsData.slice(0, 4).map((activity: any) => {
    // Determine icon and background color based on activity type
    let icon = "ri-history-line";
    let iconBgColor = "bg-gray-500";
    
    if (activity.type === 'customer_created') {
      icon = "ri-user-add-line";
      iconBgColor = "bg-primary";
    } else if (activity.type === 'quotation_created') {
      icon = "ri-file-list-3-line";
      iconBgColor = "bg-secondary";
    } else if (activity.type === 'attendance') {
      icon = "ri-time-line";
      iconBgColor = "bg-purple-500";
    } else if (activity.type === 'invoice_paid') {
      icon = "ri-bill-line";
      iconBgColor = "bg-green-500";
    } else if (activity.type === 'product_created') {
      icon = "ri-store-2-line";
      iconBgColor = "bg-yellow-500";
    }
    
    // Format the time as a relative time string (e.g., "2 hours ago")
    const activityTime = activity.createdAt 
      ? formatRelativeTime(new Date(activity.createdAt)) 
      : "Recently";
    
    return {
      id: activity.id,
      icon,
      iconBgColor,
      title: activity.title,
      description: activity.description,
      time: activityTime
    };
  }) : [];
  
  // Helper function to format relative time
  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return "Just now";
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  // Quick actions
  const quickActions = [
    {
      id: "qa1",
      label: "Add Customer",
      icon: "ri-user-add-line",
      iconBgColor: "bg-primary bg-opacity-20",
      iconColor: "text-primary",
      href: "/customers/new"
    },
    {
      id: "qa2",
      label: "Add Product",
      icon: "ri-store-2-line",
      iconBgColor: "bg-secondary bg-opacity-20",
      iconColor: "text-secondary",
      href: "/products/new"
    },
    {
      id: "qa3",
      label: "New Quotation",
      icon: "ri-file-list-3-line",
      iconBgColor: "bg-green-500 bg-opacity-20",
      iconColor: "text-green-500",
      href: "/quotations/new"
    },
    {
      id: "qa4",
      label: "New Invoice",
      icon: "ri-bill-line",
      iconBgColor: "bg-purple-500 bg-opacity-20",
      iconColor: "text-purple-500",
      href: "/invoices/new"
    },
    {
      id: "qa5",
      label: "Apply Leave",
      icon: "ri-calendar-check-line",
      iconBgColor: "bg-yellow-500 bg-opacity-20",
      iconColor: "text-yellow-500",
      href: "/leave/new"
    },
    {
      id: "qa6",
      label: "Reports",
      icon: "ri-file-chart-line",
      iconBgColor: "bg-red-500 bg-opacity-20",
      iconColor: "text-red-500",
      href: "/reports"
    }
  ];

  // Loading state
  if (loadingUsers || loadingCustomers || loadingProducts || loadingQuotations || loadingInvoices || loadingActivityLogs) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
        <span className="ml-2 text-base sm:text-lg">Loading dashboard data...</span>
      </div>
    );
  }

  return (
    <>
      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-6">
        {/* Overall Stats Card */}
        <StatsCard
          title="Overall Performance"
          growthPercent={summaryData.overallPerformance.growthPercent}
          stats={[
            {
              label: "Revenue",
              value: formatCurrency(summaryData.overallPerformance.revenue.value),
              change: summaryData.overallPerformance.revenue.change
            },
            {
              label: "New Customers",
              value: summaryData.overallPerformance.newCustomers.value.toString(),
              change: summaryData.overallPerformance.newCustomers.change
            }
          ]}
        />

        {/* Today's Attendance */}
        <AttendanceCard
          date={summaryData.attendance.date}
          items={summaryData.attendance.items}
          onCheckInOut={() => setShowCheckInModal(true)}
        />

        {/* Leave Balance Widget */}
        <LeaveBalanceWidget
          onApplyLeave={() => setLocation("/leave")}
          onViewHistory={() => setLocation("/leave")}
        />

        {/* Pending Approvals */}
        <PendingApprovalsCard
          approvals={summaryData.pendingApprovals}
          onViewAll={() => window.location.href = "/approvals"}
        />
      </div>

      {/* Recent Customers & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-6">
        {/* Recent Customers */}
        <RecentCustomersTable customers={recentCustomers} />

        {/* Low Stock Products */}
        <LowStockProductsTable products={lowStockProducts} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-6">
        {/* Recent Quotations Card */}
        <RecentQuotations quotations={recentQuotations} />

        {/* Recent Invoices Card */}
        <RecentInvoices invoices={recentInvoices} />

        {/* Recent Activity Card */}
        <div className="sm:col-span-2 md:col-span-1">
          <ActivityTimeline activities={recentActivity} />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* Check-in Modal */}
      <CheckInModal open={showCheckInModal} onOpenChange={setShowCheckInModal} />
    </>
  );
}
