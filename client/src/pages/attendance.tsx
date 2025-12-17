import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { TimeDisplay } from "@/components/time/time-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CalendarIcon, Search, Loader2, UserCheck, Clock,
  MapPin, Timer, Users, TrendingUp, Activity, Zap, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { OvertimeExplanationCard } from "@/components/attendance/overtime-explanation-card";
import { EnterpriseAttendanceCheckIn } from "@/components/attendance/enterprise-attendance-check-in";
import { SmartUnifiedCheckout } from "@/components/attendance/smart-unified-checkout";
import { ManualOTStart } from "@/components/attendance/manual-ot-start";
import { ManualOTEnd } from "@/components/attendance/manual-ot-end";
import { Link } from "wouter";

export default function Attendance() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [date, setDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("today");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Check-in/out modal states
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showUnifiedCheckoutModal, setShowUnifiedCheckoutModal] = useState(false);

  // Manual OT modal states
  const [showOTStartModal, setShowOTStartModal] = useState(false);
  const [showOTEndModal, setShowOTEndModal] = useState(false);

  // Fetch current user's attendance records
  const { data: attendanceRecords = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/attendance", { userId: user?.uid }],
    queryFn: async () => {
      if (!user?.uid) return [];

      // For regular employees, fetch only their own attendance data
      // For admins/master_admins, they can still see all data if needed
      const attendanceResponse = await apiRequest(`/api/attendance?userId=${user.uid}`, 'GET');

      if (!attendanceResponse.ok) {
        throw new Error('Failed to fetch attendance records');
      }

      const attendanceData = await attendanceResponse.json();

      // Enrich attendance records with user info (current user's info)
      return attendanceData.map((record: any) => ({
        ...record,
        userName: user.displayName || user.email?.split('@')[0] || "You",
        userDepartment: user.department,
        userEmail: user.email
      }));
    },
    enabled: !!user?.uid,
    refetchInterval: 60000, // Moderate updates every 60 seconds
  });

  // Fetch current user's attendance for today - Fixed timezone issue
  const { data: todayAttendance } = useQuery({
    queryKey: ["/api/attendance/today", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      // Use server-side date calculation to prevent timezone mismatches
      const response = await apiRequest(`/api/attendance/today?userId=${user.uid}`, 'GET');
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data[0] : data;
      }
      return null;
    },
    enabled: !!user?.uid,
  });

  // Fetch office locations
  const { data: officeLocations = [] } = useQuery({
    queryKey: ["/api/office-locations"],
    queryFn: async () => {
      const response = await apiRequest('/api/office-locations', 'GET');
      if (response.ok) {
        return await response.json();
      }
      return [];
    },
  });

  // Ultra-fast department timing with intelligent caching
  const { data: departmentTiming, refetch: refetchTiming } = useQuery({
    queryKey: ["/api/departments/timing", user?.department],
    queryFn: async () => {
      if (!user?.department) return null;
      console.log('ATTENDANCE: Fast-fetching department timing for', user.department);
      const response = await apiRequest(`/api/departments/${user.department}/timing`, 'GET');
      if (response.ok) {
        const timing = await response.json();
        console.log('ATTENDANCE: Retrieved timing (cached):', timing);
        return timing;
      }
      return null;
    },
    enabled: !!user?.department,
    staleTime: 60000, // Smart caching - 60 seconds
    gcTime: 120000, // Garbage collect after 2 minutes
    refetchInterval: 60000, // Moderate frequency - every 60 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Fetch manual OT status
  const { data: otStatus } = useQuery({
    queryKey: ["/api/attendance/ot-status", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      const response = await apiRequest(`/api/attendance/ot-status?userId=${user.uid}`, 'GET');
      if (response.ok) {
        return await response.json();
      }
      return null;
    },
    enabled: !!user?.uid,
    refetchInterval: 30000, // Check OT status every 30 seconds
  });

  // Enhanced refresh functions with comprehensive invalidation
  const refreshAttendance = () => {
    console.log('ATTENDANCE: Refreshing all attendance data');
    // Invalidate all attendance-related queries including OT status
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey[0];
        if (typeof queryKey === 'string') {
          return queryKey.includes('/api/attendance') || queryKey.includes('/api/departments/timing');
        }
        return false;
      }
    });

    // Force immediate refetch of critical data
    refetchTiming();
    refetch();
  };

  // Enhanced timing refresh - keeps old data visible while fetching
  const refreshTiming = () => {
    console.log('ATTENDANCE: Refreshing department timing');
    // Invalidate timing cache (keeps old data visible until new data arrives)
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey[0];
        if (typeof queryKey === 'string') {
          return queryKey.includes('/api/departments/timing');
        }
        return false;
      }
    });

    // Force immediate refetch
    refetchTiming();
  };

  // Listen for storage events (cross-tab updates) and window focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('ATTENDANCE: Window focused, refreshing timing');
      refreshTiming();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'department_timing_updated') {
        console.log('ATTENDANCE: Department timing updated in another tab');
        refreshTiming();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refetchTiming]);

  // Add visibility change listener for better real-time updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('ATTENDANCE: Page became visible, refreshing timing');
        refreshTiming();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Filter and sort attendance records based on search query
  const filteredAttendance = attendanceRecords
    .filter((record: any) =>
      record.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.userDepartment?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a: any, b: any) => {
      // Sort by date in descending order (newest first)
      const dateA = new Date(a.checkInTime || a.date).getTime();
      const dateB = new Date(b.checkInTime || b.date).getTime();
      return dateB - dateA;
    });

  // Pagination calculations
  const totalRecords = filteredAttendance.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAttendance = filteredAttendance.slice(startIndex, endIndex);

  // Reset to page 1 when search query or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));

  // Get attendance statistics
  const getAttendanceStats = (records: any[]) => {
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const overtime = records.filter(r => r.overtimeHours && r.overtimeHours > 0).length;

    return { total, present, absent, late, overtime };
  };

  const stats = getAttendanceStats(attendanceRecords);

  // Enhanced attendance state logic with clear UX states
  const getAttendanceState = () => {
    // Check if department timing exists AND has valid timing values
    if (!departmentTiming || !departmentTiming.checkInTime || !departmentTiming.checkOutTime) {
      return { state: 'no_timing', canCheckIn: false, canCheckOut: false, validTiming: false };
    }

    // Additional validation: Check if timing values are properly formatted (must contain AM/PM)
    const checkInTime = departmentTiming.checkInTime;
    const checkOutTime = departmentTiming.checkOutTime;

    // Validate that timing values are proper 12-hour format (contain AM or PM)
    const isValidTimeFormat = (time: string) => {
      return time && typeof time === 'string' && (time.includes('AM') || time.includes('PM') || time.includes('am') || time.includes('pm'));
    };

    if (!isValidTimeFormat(checkInTime) || !isValidTimeFormat(checkOutTime)) {
      return { state: 'no_timing', canCheckIn: false, canCheckOut: false, validTiming: false };
    }

    if (!todayAttendance) return { state: 'not_started', canCheckIn: true, canCheckOut: false, validTiming: true };
    if (todayAttendance.checkInTime && !todayAttendance.checkOutTime) return { state: 'checked_in', canCheckIn: false, canCheckOut: true, validTiming: true };
    if (todayAttendance.checkInTime && todayAttendance.checkOutTime) return { state: 'completed', canCheckIn: false, canCheckOut: false, validTiming: true };
    return { state: 'unknown', canCheckIn: false, canCheckOut: false, validTiming: true };
  };

  const attendanceState = getAttendanceState();
  const canCheckIn = attendanceState.canCheckIn;
  const canCheckOut = attendanceState.canCheckOut;

  // Pagination Component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;

      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <Button
            key={i}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            onClick={() => goToPage(i)}
            className="min-w-[2.5rem]"
          >
            {i}
          </Button>
        );
      }
      return pages;
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} records
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToFirstPage}
            disabled={currentPage === 1}
            className="hidden sm:flex"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="hidden sm:flex items-center gap-1">
            {renderPageNumbers()}
          </div>
          <div className="sm:hidden text-sm font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToLastPage}
            disabled={currentPage === totalPages}
            className="hidden sm:flex"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <span>/</span>
        <span className="font-medium text-foreground">Attendance</span>
      </div>

      {/* Header Section with Clear Status */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Attendance</h1>
          <div className="mt-2">
            <p className="text-muted-foreground text-sm">Track your daily attendance and work hours</p>
          </div>
        </div>
      </div>

      {/* Today's Status Card - Primary Action Area */}
      {user && (
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Today's Attendance
              </CardTitle>
              {departmentTiming && departmentTiming.checkInTime && departmentTiming.checkOutTime && (
                <div className="text-xs text-muted-foreground">
                  Office: <TimeDisplay time={departmentTiming.checkInTime} format12Hour={true} /> - <TimeDisplay time={departmentTiming.checkOutTime} format12Hour={true} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Status Display */}
            {todayAttendance ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-muted rounded-full flex-shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Check In</p>
                    <p className="font-semibold truncate"><TimeDisplay time={todayAttendance.checkInTime} format12Hour={true} /></p>
                    <p className="text-xs text-muted-foreground truncate">{todayAttendance.attendanceType || 'Office'}</p>
                  </div>
                </div>

                {todayAttendance.checkOutTime ? (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-muted rounded-full flex-shrink-0">
                      <Timer className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Check Out</p>
                      <p className="font-semibold truncate"><TimeDisplay time={todayAttendance.checkOutTime} format12Hour={true} /></p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(() => {
                          const checkIn = new Date(todayAttendance.checkInTime);
                          const checkOut = new Date(todayAttendance.checkOutTime);
                          const hours = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60));
                          const minutes = Math.floor(((checkOut.getTime() - checkIn.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
                          return `${hours}h ${minutes}m worked`;
                        })()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-dashed">
                    <div className="p-2 bg-gray-100 rounded-full flex-shrink-0">
                      <Timer className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Check Out</p>
                      <p className="font-semibold text-gray-400">Pending</p>
                      <p className="text-xs text-muted-foreground">Still working</p>
                    </div>
                  </div>
                )}

                {todayAttendance.overtimeHours && todayAttendance.overtimeHours > 0 ? (
                  <div className="flex items-center gap-3 p-3 border rounded-lg sm:col-span-2 lg:col-span-1">
                    <div className="p-2 bg-muted rounded-full flex-shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Overtime</p>
                      <p className="font-semibold">{todayAttendance.overtimeHours.toFixed(1)}h</p>
                      <p className="text-xs text-muted-foreground">Extra hours</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 border border-dashed rounded-lg sm:col-span-2 lg:col-span-1">
                    <div className="p-2 bg-muted rounded-full flex-shrink-0">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Overtime</p>
                      <p className="font-semibold text-muted-foreground">None</p>
                      <p className="text-xs text-muted-foreground">Regular hours</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No attendance recorded today</h3>
                <p className="text-sm text-muted-foreground mb-4">Start your workday by checking in</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {!attendanceState.validTiming ? (
                <div className="sm:col-span-2 text-center py-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-orange-700 font-medium mb-2 text-sm md:text-base">
                      {!departmentTiming ? "Department Timing Not Configured" : "Invalid Timing Format"}
                    </div>
                    <div className="text-sm text-orange-600 mb-3">
                      {!departmentTiming
                        ? "Your department's working hours must be configured before you can check in."
                        : "Department timing must be in 12-hour format (e.g., 9:00 AM - 6:00 PM)."
                      }
                    </div>
                    {user?.role === "master_admin" && (
                      <div className="space-y-2">
                        <div className="text-xs text-orange-500">
                          Go to Departments → Configure Attendance Timing for {user?.department} department
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={refreshTiming}
                          className="text-orange-600 border-orange-300 hover:bg-orange-50 w-full sm:w-auto"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Refresh Timing
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {canCheckIn && (
                    <Button
                      onClick={() => setShowCheckInModal(true)}
                      className="bg-green-600 hover:bg-green-700 h-12 sm:col-span-1"
                      size="lg"
                    >
                      <UserCheck className="h-5 w-5 mr-2" />
                      <span className="hidden sm:inline">Check In Now</span>
                      <span className="sm:hidden">Check In</span>
                    </Button>
                  )}
                  {canCheckOut && !otStatus?.hasActiveOT && (
                    <Button
                      onClick={() => setShowUnifiedCheckoutModal(true)}
                      className="bg-red-600 hover:bg-red-700 h-12 sm:col-span-1"
                      size="lg"
                    >
                      <Timer className="h-5 w-5 mr-2" />
                      Check Out
                    </Button>
                  )}
                  {!canCheckIn && !canCheckOut && todayAttendance && (
                    <div className="sm:col-span-2 text-center py-3">
                      <Badge variant="secondary" className="py-2 px-4 text-xs sm:text-sm">
                        {otStatus?.hasActiveOT ? "Regular Attendance Complete" : "Attendance Complete for Today"}
                      </Badge>
                      {otStatus?.hasActiveOT && (
                        <p className="text-xs text-orange-600 mt-1">Use "End OT" button below to finish overtime</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* OT Management - Smart Redirect to New System */}
            {departmentTiming && departmentTiming.checkInTime && departmentTiming.checkOutTime && (
              <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900 text-sm sm:text-base">Overtime Management</span>
                    {otStatus?.hasActiveOT && (
                      <Badge variant="default" className="bg-blue-600 animate-pulse text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  {otStatus?.currentOTHours && otStatus.currentOTHours > 0 && (
                    <Badge variant="outline" className="text-blue-700 border-blue-400 font-semibold text-xs">
                      {otStatus.currentOTHours.toFixed(1)}h
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-blue-800 mb-4 leading-relaxed">
                  {otStatus?.hasActiveOT
                    ? "🎯 You have an active OT session. Track your time and manage your session on the dedicated OT page."
                    : "⚡ Track overtime with photo verification, live timer, and session history."
                  }
                </p>

                <Link href="/employee-ot">
                  <Button
                    className={cn(
                      "w-full font-medium shadow-sm",
                      otStatus?.hasActiveOT
                        ? "bg-orange-600 hover:bg-orange-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    )}
                    size="lg"
                  >
                    {otStatus?.hasActiveOT ? (
                      <>
                        <Timer className="h-5 w-5 mr-2" />
                        <span>Manage Active OT Session</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        <span>Go to OT Dashboard</span>
                      </>
                    )}
                  </Button>
                </Link>

                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-600">
                  <Activity className="h-3 w-3" />
                  <span>New enhanced OT system with full tracking</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Summary & Department Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.present}</div>
                <div className="text-xs text-muted-foreground">Days Present</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Attendance Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {departmentTiming && departmentTiming.checkInTime && departmentTiming.checkOutTime && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Department Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Check In</div>
                  <div className="font-semibold"><TimeDisplay time={departmentTiming.checkInTime} format12Hour={true} /></div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Check Out</div>
                  <div className="font-semibold"><TimeDisplay time={departmentTiming.checkOutTime} format12Hour={true} /></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Attendance History with Improved Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold">Attendance History</h2>
            <p className="text-sm text-muted-foreground">Track your daily attendance records and patterns</p>
          </div>
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg">Today's Details</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search records..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-48"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records found for the selected date
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAttendance.map((record: any) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{formatDate(record.checkInTime || record.date)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(record.checkInTime || record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {record.checkInTime ? <TimeDisplay time={record.checkInTime} format12Hour={true} /> : '-'}
                            </TableCell>
                            <TableCell>
                              {record.checkOutTime ? <TimeDisplay time={record.checkOutTime} format12Hour={true} /> : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {record.workingHours ? (
                                  <>
                                    <span className="font-medium">{record.workingHours.toFixed(1)}h</span>
                                    {record.overtimeHours && record.overtimeHours > 0 && (
                                      <span className="text-xs text-orange-600">
                                        +{record.overtimeHours.toFixed(1)}h OT
                                      </span>
                                    )}
                                  </>
                                ) : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="text-sm capitalize">{record.status}</span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {record.attendanceType === 'field_work' ? 'Field Work' : record.attendanceType}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <PaginationControls />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Week's Records</CardTitle>
              <CardDescription>
                Showing attendance records for the current week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records found for this week
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedAttendance.map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{formatDate(record.checkInTime)}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(record.checkInTime).toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-600" />
                            <span className="text-sm"><TimeDisplay time={record.checkInTime} format12Hour={true} /></span>
                            {record.checkOutTime && (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <Timer className="h-4 w-4 text-red-600" />
                                <span className="text-sm"><TimeDisplay time={record.checkOutTime} format12Hour={true} /></span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'secondary' : 'destructive'}>
                            {record.status}
                          </Badge>
                          {record.overtimeHours && record.overtimeHours > 0 && (
                            <Badge variant="outline" className="text-orange-600">
                              <Zap className="h-3 w-3 mr-1" />
                              {record.overtimeHours.toFixed(1)}h OT
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <PaginationControls />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg">Monthly Overview</CardTitle>
                  <CardDescription>
                    Comprehensive view of your monthly attendance
                  </CardDescription>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(date)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records found for the selected month
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAttendance.map((record: any) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{formatDate(record.checkInTime || record.date)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(record.checkInTime || record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {record.checkInTime ? <TimeDisplay time={record.checkInTime} format12Hour={true} /> : '-'}
                            </TableCell>
                            <TableCell>
                              {record.checkOutTime ? <TimeDisplay time={record.checkOutTime} format12Hour={true} /> : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {record.workingHours ? (
                                  <>
                                    <span className="font-medium">{record.workingHours.toFixed(1)}h</span>
                                    {record.overtimeHours && record.overtimeHours > 0 && (
                                      <span className="text-xs text-orange-600">
                                        +{record.overtimeHours.toFixed(1)}h OT
                                      </span>
                                    )}
                                  </>
                                ) : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="text-sm capitalize">{record.status}</span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {record.attendanceType === 'field_work' ? 'Field Work' : record.attendanceType}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <PaginationControls />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Check-in Modal */}
      <EnterpriseAttendanceCheckIn
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onSuccess={refreshAttendance}
      />

      {/* Smart Unified Checkout Modal */}
      <SmartUnifiedCheckout
        isOpen={showUnifiedCheckoutModal}
        onClose={() => setShowUnifiedCheckoutModal(false)}
        onSuccess={refreshAttendance}
        currentAttendance={todayAttendance}
        departmentTiming={departmentTiming}
      />

      {/* Manual OT Start Modal */}
      <ManualOTStart
        isOpen={showOTStartModal}
        onClose={() => setShowOTStartModal(false)}
        onSuccess={refreshAttendance}
        otType={otStatus?.otType}
      />

      {/* Manual OT End Modal */}
      <ManualOTEnd
        isOpen={showOTEndModal}
        onClose={() => setShowOTEndModal(false)}
        onSuccess={refreshAttendance}
        otStartTime={otStatus?.otStartTime}
        currentOTHours={otStatus?.currentOTHours}
      />
    </div>
  );
}