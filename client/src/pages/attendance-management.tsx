import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { TimeDisplay } from "@/components/time/time-display";
import { Button } from "@/components/ui/button";
import { UndoManager, useUndoManager } from "@/components/undo/undo-manager";
import { useOfflineHandler, callWithOfflineHandling } from "@/utils/offline-handler";
import { getUserFriendlyMessage } from "@/utils/user-friendly-messages";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { 
  CalendarIcon, Search, Loader2, FileText, BarChart, UserCheck, Clock, 
  Plus, Edit, Trash2, Eye, Download, Upload, Settings, Users, 
  CheckCircle, XCircle, AlertCircle, MapPin, Camera
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { departments } from "@shared/schema";
import * as XLSX from 'xlsx';

export default function AttendanceManagement() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Undo management
  const { actions, addAction, executeUndo, clearActions } = useUndoManager();
  
  // Offline handling
  const offlineHandler = useOfflineHandler();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // Remove calendar popup completely to fix overlay issues
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("live");
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    employeeName: string;
    date: string;
    time: string;
    attendanceType: string;
    customerName?: string;
    location?: string;
  } | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    checkInTime: '',
    checkOutTime: '',
    status: '',
    overtimeHours: 0,
    remarks: ''
  });

  // Real-time attendance data - Fixed memory leak with cleanup
  const { data: liveAttendance = [], isLoading: isLoadingLive, refetch: refetchLive } = useQuery({
    queryKey: ['/api/attendance/live'],
    enabled: !!user && user.role === "master_admin",
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: false, // Prevent excessive refetching
  });

  // CRITICAL FIX: Memory leak prevention with proper cleanup
  useEffect(() => {
    return () => {
      // Clear all intervals and ongoing requests on unmount
      queryClient.cancelQueries({ queryKey: ['/api/attendance/live'] });
      queryClient.cancelQueries({ queryKey: ['/api/attendance'] });
    };
  }, [queryClient]);

  // Daily attendance records
  const { data: dailyAttendance = [], isLoading: isLoadingDaily, refetch: refetchDaily } = useQuery({
    queryKey: ['/api/attendance', { date: selectedDate.toISOString().split('T')[0] }],
    enabled: !!user,
    queryFn: async () => {
      const dateParam = selectedDate.toISOString().split('T')[0];
      const attendanceResponse = await apiRequest(`/api/attendance?date=${dateParam}`, 'GET');
      const attendanceData = await attendanceResponse.json();
      
      // Enrich with user details
      const usersResponse = await apiRequest('/api/users', 'GET');
      const users = await usersResponse.json();
      
      return attendanceData.map((record: any) => {
        const userDetails = users.find((u: any) => u.id === record.userId);
        return {
          ...record,
          userName: userDetails?.displayName || `User #${record.userId}`,
          userDepartment: userDetails?.department || null,
          userDesignation: userDetails?.designation || null,
          userEmail: userDetails?.email || null
        };
      });
    },
  });

  // Attendance policies
  const { data: attendancePolicies = [] } = useQuery({
    queryKey: ['/api/attendance/policies'],
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest('/api/attendance/policies', 'GET');
      return response.json();
    },
  });

  // Department statistics
  const { data: departmentStats = [] } = useQuery({
    queryKey: ['/api/attendance/department-stats', selectedDate.toISOString().split('T')[0]],
    enabled: !!user,
    queryFn: async () => {
      const dateParam = selectedDate.toISOString().split('T')[0];
      const response = await apiRequest(`/api/attendance/department-stats?date=${dateParam}`, 'GET');
      return response.json();
    },
  });

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest(`/api/attendance/${id}`, 'PATCH', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchLive();
      refetchDaily();
      setShowEditModal(false);
      toast({
        title: "Success",
        description: "Attendance record updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update attendance record",
        variant: "destructive",
      });
    },
  });

  // Enhanced bulk actions mutation with undo capabilities
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, attendanceIds, data }: { 
      action: string; 
      attendanceIds: string[]; 
      data?: any 
    }) => {
      return await callWithOfflineHandling(
        async () => {
          const response = await apiRequest('/api/attendance/bulk-action', 'POST', { action, attendanceIds, data });
          return response.json();
        },
        async () => {
          const response = await apiRequest('/api/attendance/bulk-action', 'POST', { action, attendanceIds, data });
          return response.json();
        }
      );
    },
    onSuccess: (result, variables) => {
      const { action, attendanceIds } = variables;
      
      // Add undo action for bulk operations
      if (action === 'approve' || action === 'reject' || action === 'update_status') {
        addAction({
          description: `${getUserFriendlyMessage(action, 'attendance')} ${attendanceIds.length} attendance records`,
          undoFunction: async () => {
            await apiRequest('/api/attendance/bulk-undo', 'POST', { 
              actionId: result.actionId,
              attendanceIds 
            });
            queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
            refetchLive();
            refetchDaily();
          },
          affectedCount: attendanceIds.length,
          category: 'attendance',
          canUndo: true
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      refetchLive();
      refetchDaily();
      toast({
        title: "Changes applied successfully",
        description: `Updated ${attendanceIds.length} attendance records`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unable to make changes",
        description: getUserFriendlyMessage(error.message || "Failed to update attendance records", 'errors'),
        variant: "destructive",
      });
    },
  });

  // Helper function to check if record is incomplete (missing checkout)
  const isIncompleteRecord = (record: any) => {
    // Record is incomplete if there's check-in but no check-out time
    // Also check for empty strings and null values
    return record.checkInTime && 
           record.checkInTime !== '' && 
           (!record.checkOutTime || record.checkOutTime === '');
  };

  // Helper function to get suggested checkout time for department
  const getSuggestedCheckoutTime = (record: any) => {
    if (!record.userDepartment) return "6:00 PM";
    
    // Get department closing time (default to 6:00 PM)
    const departmentClosingTimes = {
      'technical': '6:00 PM',
      'marketing': '6:00 PM', 
      'admin': '5:30 PM',
      'hr': '5:30 PM',
      'sales': '7:00 PM'
    };
    
    return departmentClosingTimes[record.userDepartment as keyof typeof departmentClosingTimes] || "6:00 PM";
  };

  // Filter attendance records
  const filteredDailyAttendance = dailyAttendance.filter((record: any) => {
    const matchesSearch = !searchQuery || 
      record.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.userEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === "all" || 
      record.userDepartment === selectedDepartment;
    
    const matchesStatus = selectedStatus === "all" || record.status === selectedStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Separate incomplete records for easy identification
  const incompleteRecords = filteredDailyAttendance.filter((record: any) => isIncompleteRecord(record));
  const completeRecords = filteredDailyAttendance.filter((record: any) => !isIncompleteRecord(record));

  // Debug logging for incomplete records (only when there are incomplete records)
  if (incompleteRecords.length > 0) {
    console.log('🚨 Found incomplete records:', {
      count: incompleteRecords.length,
      records: incompleteRecords.map((r: any) => ({
        name: r.userName,
        department: r.userDepartment,
        checkIn: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : 'None',
        missingCheckout: !r.checkOutTime
      }))
    });
  }

  // Filter live attendance - Fix TypeScript error
  const filteredLiveAttendance = (Array.isArray(liveAttendance) ? liveAttendance : []).filter((record: any) => {
    const matchesSearch = !searchQuery || 
      record.userName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === "all" || 
      record.userDepartment === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  // Handle edit attendance - Enhanced for forgotten checkouts
  const handleEditAttendance = (record: any) => {
    const isIncomplete = isIncompleteRecord(record);
    const suggestedCheckout = isIncomplete ? getSuggestedCheckoutTime(record) : '';
    
    setEditingAttendance(record);
    setEditForm({
      checkInTime: record.checkInTime ? 
        (typeof record.checkInTime === 'string' ? 
          new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 
          record.checkInTime) : '',
      checkOutTime: record.checkOutTime ? 
        (typeof record.checkOutTime === 'string' ? 
          new Date(record.checkOutTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 
          record.checkOutTime) : suggestedCheckout,
      status: record.status || 'present',
      overtimeHours: record.overtimeHours || 0,
      remarks: record.remarks || (isIncomplete ? 'Checkout time corrected by admin - forgotten checkout detected' : '')
    });
    setShowEditModal(true);
  };

  // Quick fix for incomplete checkout
  const handleQuickFixCheckout = (record: any) => {
    const suggestedTime = getSuggestedCheckoutTime(record);
    const checkOutDate = new Date(record.date);
    
    // Parse suggested time (e.g., "6:00 PM")
    const timeMatch = suggestedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let [, hours, minutes, period] = timeMatch;
      let hour24 = parseInt(hours);
      if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
      if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
      checkOutDate.setHours(hour24, parseInt(minutes), 0, 0);
    }

    const updateData = {
      checkOutTime: checkOutDate.toISOString(),
      status: 'present',
      remarks: `Auto-corrected checkout at department closing time (${suggestedTime}) by admin`,
      approvedBy: user?.uid
    };

    updateAttendanceMutation.mutate({
      id: record.id,
      data: updateData
    });
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (!editingAttendance) return;
    
    const updateData: any = {
      status: editForm.status,
      overtimeHours: editForm.overtimeHours,
      remarks: editForm.remarks,
      approvedBy: user?.uid
    };

    // Convert times to full datetime if provided
    if (editForm.checkInTime) {
      const checkInDate = new Date(editingAttendance.date);
      // Parse 12-hour format properly
      const timeMatch = editForm.checkInTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let [, hours, minutes, period] = timeMatch;
        let hour24 = parseInt(hours);
        if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
        if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
        checkInDate.setHours(hour24, parseInt(minutes), 0, 0);
        updateData.checkInTime = checkInDate.toISOString();
      }
    }

    if (editForm.checkOutTime) {
      const checkOutDate = new Date(editingAttendance.date);
      // Parse 12-hour format properly
      const timeMatch = editForm.checkOutTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let [, hours, minutes, period] = timeMatch;
        let hour24 = parseInt(hours);
        if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
        if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
        checkOutDate.setHours(hour24, parseInt(minutes), 0, 0);
        updateData.checkOutTime = checkOutDate.toISOString();
      }
    }

    updateAttendanceMutation.mutate({
      id: editingAttendance.id,
      data: updateData
    });
  };

  // Handle export to Excel
  const handleExportAttendance = () => {
    try {
      // Prepare data for export
      const exportData = filteredDailyAttendance.map((record: any) => ({
        'Employee Name': record.userName || 'N/A',
        'Email': record.userEmail || 'N/A',
        'Department': record.userDepartment || 'N/A',
        'Designation': record.userDesignation || 'N/A',
        'Date': formatDate(new Date(record.date)),
        'Check In': record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Not Checked In',
        'Check Out': record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Not Checked Out',
        'Working Hours': record.workingHours ? `${record.workingHours.toFixed(1)}h` : '0h',
        'Overtime Hours': record.overtimeHours ? `${record.overtimeHours.toFixed(1)}h` : '0h',
        'Status': record.status || 'Unknown',
        'Late Minutes': record.lateMinutes || 0,
        'Attendance Type': record.attendanceType === 'field_work' ? 'Field Work' : 
                           record.attendanceType === 'remote' ? 'Remote Work' : 'Office',
        'Customer Name': record.customerName || '',
        'Location': record.location || '',
        'Remarks': record.remarks || ''
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const columnWidths = [
        { wch: 20 }, // Employee Name
        { wch: 25 }, // Email
        { wch: 15 }, // Department
        { wch: 15 }, // Designation
        { wch: 12 }, // Date
        { wch: 12 }, // Check In
        { wch: 12 }, // Check Out
        { wch: 12 }, // Working Hours
        { wch: 12 }, // Overtime Hours
        { wch: 10 }, // Status
        { wch: 10 }, // Late Minutes
        { wch: 15 }, // Attendance Type
        { wch: 20 }, // Customer Name
        { wch: 30 }, // Location
        { wch: 30 }  // Remarks
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");

      // Generate filename with date
      const fileName = `attendance-report-${formatDate(selectedDate)}.xlsx`;

      // Write and download file
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Export Successful",
        description: `Attendance report exported as ${fileName}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to export attendance data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle image viewing with preloading
  const handleViewImage = async (record: any) => {
    if (!record.checkInImageUrl) {
      toast({
        title: "No Image Available",
        description: "This attendance record doesn't have an associated photo",
        variant: "destructive",
      });
      return;
    }
    
    setImageLoading(true);
    setShowImageModal(true);
    setSelectedImage(null); // Reset previous image
    
    // Prepare image metadata
    const imageData = {
      url: record.checkInImageUrl,
      employeeName: record.userName || 'Unknown Employee',
      date: formatDate(new Date(record.date)),
      time: record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Unknown Time',
      attendanceType: record.attendanceType === 'field_work' ? 'Field Work' : 
                     record.attendanceType === 'remote' ? 'Remote Work' : 'Office',
      customerName: record.customerName,
      location: record.location
    };
    
    // Preload image with timeout for better UX
    const img = new Image();
    const timeout = setTimeout(() => {
      setImageLoading(false);
      toast({
        title: "Loading Timeout",
        description: "Image is taking too long to load. Please try again.",
        variant: "destructive",
      });
    }, 10000); // 10 second timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      setSelectedImage(imageData);
      setImageLoading(false);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      setImageLoading(false);
      setShowImageModal(false);
      toast({
        title: "Image Load Failed",
        description: "Unable to load the attendance photo. The image may be corrupted or unavailable.",
        variant: "destructive",
      });
    };
    
    img.src = record.checkInImageUrl;
  };

  // Reset image modal state
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
    setImageLoading(false);
  };

  // Handle view details modal
  const handleViewDetails = (record: any) => {
    setSelectedAttendanceRecord(record);
    setShowDetailsModal(true);
  };

  // Calculate total time for an attendance record
  const calculateTotalTime = (record: any) => {
    if (!record.checkInTime || !record.checkOutTime) return 0;
    const checkIn = new Date(record.checkInTime);
    const checkOut = new Date(record.checkOutTime);
    return Math.max(0, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)); // Hours
  };

  // Enhanced status badge with incomplete detection
  const getStatusBadge = (record: any) => {
    const status = record?.status;
    const isIncomplete = isIncompleteRecord(record);
    
    // Handle incomplete records (missing checkout)
    if (isIncomplete) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse">
            <AlertCircle className="h-3 w-3 mr-1" />
            Incomplete
          </Badge>
        </div>
      );
    }

    // Handle null/undefined status values
    if (!status) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
          Unknown
        </Badge>
      );
    }

    const styles = {
      present: "bg-green-100 text-green-800 border-green-200",
      absent: "bg-red-100 text-red-800 border-red-200",
      late: "bg-orange-100 text-orange-800 border-orange-200",
      leave: "bg-yellow-100 text-yellow-800 border-yellow-200",
      holiday: "bg-blue-100 text-blue-800 border-blue-200",
      half_day: "bg-purple-100 text-purple-800 border-purple-200"
    };
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "font-medium capitalize border", 
          styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200"
        )}
        style={{
          backgroundColor: status === 'present' ? '#dcfce7' : 
                          status === 'absent' ? '#fee2e2' :
                          status === 'late' ? '#fed7aa' :
                          status === 'leave' ? '#fef3c7' :
                          status === 'holiday' ? '#dbeafe' :
                          status === 'half_day' ? '#e9d5ff' : '#f3f4f6',
          color: status === 'present' ? '#166534' : 
                status === 'absent' ? '#991b1b' :
                status === 'late' ? '#c2410c' :
                status === 'leave' ? '#a16207' :
                status === 'holiday' ? '#1e40af' :
                status === 'half_day' ? '#7c3aed' : '#374151'
        }}
      >
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Check if user is master admin
  if (user?.role !== "master_admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-gray-500">Only master administrators can access attendance management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Attendance Management</h1>
          <p className="text-gray-500 text-sm md:text-base">Complete control over employee attendance system</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => setShowPolicyModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-sm"
            size="sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Policies
          </Button>
          <Button 
            onClick={handleExportAttendance}
            className="bg-green-600 hover:bg-green-700 text-sm" 
            size="sm"
            disabled={filteredDailyAttendance.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export ({filteredDailyAttendance.length} records)
          </Button>
        </div>
      </div>

      {/* Summary and Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Department Statistics Cards */}
        {departmentStats.map((dept: any) => (
          <Card key={dept.department}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 capitalize font-medium">{dept.department}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-semibold text-sm">{dept.present}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-600 font-semibold text-sm">{dept.absent}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-orange-600 font-semibold text-sm">{dept.late}</span>
                    </div>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Incomplete Records Alert Card */}
        {incompleteRecords.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-amber-700 font-medium">Incomplete Records</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-amber-800 font-bold text-lg">{incompleteRecords.length}</span>
                    <span className="text-xs text-amber-600">missing checkouts</span>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Forgotten Checkout Alert Banner */}
      {incompleteRecords.length > 0 && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-200 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">
                    {incompleteRecords.length} Employee{incompleteRecords.length > 1 ? 's' : ''} Forgot to Check Out
                  </h3>
                  <p className="text-sm text-amber-700">
                    These records need admin correction. System suggests department closing times as defaults.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("incomplete")}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View & Fix
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    incompleteRecords.forEach((record: any) => handleQuickFixCheckout(record));
                  }}
                  disabled={updateAttendanceMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {updateAttendanceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Quick Fix All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="live" className="flex items-center gap-2 text-xs sm:text-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="hidden sm:inline">Live Tracking</span>
              <span className="sm:hidden">Live</span>
            </TabsTrigger>
            <TabsTrigger value="daily" className="flex items-center gap-2 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Daily Records</span>
              <span className="sm:hidden">Daily</span>
              {incompleteRecords.length > 0 && (
                <Badge variant="destructive" className="ml-1 px-1 py-0 text-xs">
                  {incompleteRecords.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="corrections" className="flex items-center gap-2 text-xs sm:text-sm">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Corrections</span>
              <span className="sm:hidden">Fix</span>
              {incompleteRecords.length > 0 && (
                <Badge variant="destructive" className="ml-1 px-1 py-0 text-xs">
                  {incompleteRecords.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search employees..."
                className="pl-10 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept.charAt(0).toUpperCase() + dept.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(activeTab === "daily" || activeTab === "corrections") && (
              <>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50 w-full sm:w-auto">
                  <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 sm:flex-none">{formatDate(selectedDate)}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
                      className="h-6 w-6 p-0"
                    >
                      ←
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                      className="h-6 w-6 p-0"
                    >
                      →
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Live Tracking Tab */}
        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                Live Attendance Tracking
              </CardTitle>
              <CardDescription className="text-sm">
                Real-time monitoring of employee check-ins and check-outs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLive ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-2">Loading live data...</p>
                </div>
              ) : filteredLiveAttendance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active attendance records found</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-4">
                    {filteredLiveAttendance.map((record: any) => (
                      <Card key={record.id} className="border shadow-sm">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-base">{record.userName}</p>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {record.userDepartment?.toUpperCase() || 'N/A'}
                                </Badge>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditAttendance(record)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {record.checkInImageUrl && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleViewImage(record)}
                                    title="View Field Work Photo"
                                  >
                                    <Camera className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Check In</p>
                                <p className="font-medium mt-1">
                                  {record.checkInTime ? <TimeDisplay time={record.checkInTime} format12Hour={true} /> : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Location</p>
                                <p className="font-medium mt-1 capitalize">{record.location || 'office'}</p>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t">
                              {getStatusBadge(record)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLiveAttendance.map((record: any) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {record.userName}
                            </TableCell>
                            <TableCell className="capitalize">
                              {record.userDepartment || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {record.checkInTime ? <TimeDisplay time={record.checkInTime} format12Hour={true} /> : '-'}
                            </TableCell>
                            <TableCell className="capitalize">
                              {record.location || 'office'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(record)}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditAttendance(record)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                {record.checkInImageUrl && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleViewImage(record)}
                                    title="View Field Work Photo"
                                  >
                                    <Camera className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Records Tab */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Daily Attendance Records - {formatDate(selectedDate)}</CardTitle>
              <CardDescription className="text-sm">
                Comprehensive view of all employee attendance for the selected date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDaily ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-muted-foreground mt-2">Loading attendance data...</p>
                </div>
              ) : filteredDailyAttendance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance records found for this date</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-4">
                    {filteredDailyAttendance.map((record: any) => (
                      <Card key={record.id} className={`border shadow-sm ${isIncompleteRecord(record) ? 'border-amber-300 bg-amber-50/30' : ''}`}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-base">{record.userName}</p>
                                <p className="text-sm text-muted-foreground">{record.userEmail}</p>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {record.userDepartment?.toUpperCase() || 'N/A'}
                                </Badge>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditAttendance(record)}
                                  title="Edit Attendance"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {record.checkInImageUrl && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleViewImage(record)}
                                    title="View Field Work Photo"
                                  >
                                    <Camera className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Check In</p>
                                <p className="font-medium mt-1">
                                  {record.checkInTime ? <TimeDisplay time={record.checkInTime} format12Hour={true} /> : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Check Out</p>
                                <p className="font-medium mt-1">
                                  {record.checkOutTime ? (
                                    <TimeDisplay time={record.checkOutTime} format12Hour={true} />
                                  ) : (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                      Missing
                                    </Badge>
                                  )}
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Working Hours</p>
                                <p className="font-medium mt-1">
                                  {record.workingHours ? (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {record.workingHours.toFixed(1)}h
                                    </div>
                                  ) : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Overtime</p>
                                <p className="font-medium mt-1">
                                  {record.overtimeHours && record.overtimeHours > 0 ? (
                                    <Badge variant="secondary" className="text-xs">
                                      {record.overtimeHours.toFixed(1)}h OT
                                    </Badge>
                                  ) : '-'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t">
                              {getStatusBadge(record)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Working Hours</TableHead>
                          <TableHead>Overtime</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDailyAttendance.map((record: any) => (
                          <TableRow key={record.id} className={isIncompleteRecord(record) ? "bg-amber-50/30" : ""}>
                            <TableCell className="font-medium">
                              <div>
                                <div>{record.userName}</div>
                                <div className="text-xs text-gray-500">{record.userEmail}</div>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">
                              {record.userDepartment || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {record.checkInTime ? <TimeDisplay time={record.checkInTime} format12Hour={true} /> : '-'}
                            </TableCell>
                            <TableCell>
                              {record.checkOutTime ? <TimeDisplay time={record.checkOutTime} format12Hour={true} /> : '-'}
                            </TableCell>
                            <TableCell>
                              {record.workingHours ? `${record.workingHours.toFixed(1)}h` : '-'}
                            </TableCell>
                            <TableCell>
                              {record.overtimeHours ? `${record.overtimeHours.toFixed(1)}h` : '-'}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(record)}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditAttendance(record)}
                                  title="Edit Attendance"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                {record.checkInImageUrl && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleViewImage(record)}
                                    title="View Field Work Photo"
                                  >
                                    <Camera className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewDetails(record)}
                                  title="View Details"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        {/* Corrections Tab - Now includes incomplete records */}
        <TabsContent value="corrections" className="space-y-4">
          {/* Incomplete Records Section */}
          {incompleteRecords.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-5 w-5" />
                  Incomplete Records - Urgent Action Required
                </CardTitle>
                <CardDescription className="text-amber-700">
                  {incompleteRecords.length} employee(s) forgot to check out on {formatDate(selectedDate)}. 
                  These records need immediate correction to maintain data accuracy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-sm text-amber-700">
                    Click "Quick Fix" to use department closing times, or "Edit" for custom times.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      incompleteRecords.forEach((record: any) => handleQuickFixCheckout(record));
                    }}
                    disabled={updateAttendanceMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {updateAttendanceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4 mr-2" />
                    )}
                    Quick Fix All
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Missing Checkout</TableHead>
                        <TableHead>Suggested Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incompleteRecords.map((record: any) => (
                        <TableRow key={record.id} className="bg-amber-50/30">
                          <TableCell className="font-medium">
                            <div>
                              <div>{record.userName}</div>
                              <div className="text-xs text-gray-500">{record.userEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">
                            {record.userDepartment || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <TimeDisplay time={record.checkInTime} format12Hour={true} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <XCircle className="h-3 w-3 mr-1" />
                              Missing
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Clock className="h-3 w-3 mr-1" />
                              {getSuggestedCheckoutTime(record)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickFixCheckout(record)}
                                disabled={updateAttendanceMutation.isPending}
                                className="border-green-300 text-green-700 hover:bg-green-100"
                                title="Quick fix with suggested time"
                              >
                                <Clock className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditAttendance(record)}
                                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                                title="Edit with custom time"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* General Corrections Section */}
          <Card>
            <CardHeader>
              <CardTitle>General Attendance Corrections</CardTitle>
              <CardDescription>
                All attendance records for {formatDate(selectedDate)} - Edit any record as needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDailyAttendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDailyAttendance.map((record: any) => (
                        <TableRow key={record.id} className={isIncompleteRecord(record) ? "bg-amber-50/30" : ""}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{record.userName}</div>
                              <div className="text-xs text-gray-500">{record.userEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">
                            {record.userDepartment || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {record.checkInTime ? (
                              <TimeDisplay time={record.checkInTime} format12Hour={true} />
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-500">No check-in</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.checkOutTime ? (
                              <TimeDisplay time={record.checkOutTime} format12Hour={true} />
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <XCircle className="h-3 w-3 mr-1" />
                                Missing
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.status === 'present' ? 'default' : record.status === 'absent' ? 'destructive' : 'secondary'}>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditAttendance(record)}
                              className="border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance records found for {formatDate(selectedDate)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Viewer Modal */}
      <Dialog open={showImageModal} onOpenChange={handleCloseImageModal}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Field Work Attendance Photo
            </DialogTitle>
            <DialogDescription>
              {selectedImage && `Photo taken by ${selectedImage.employeeName} on ${selectedImage.date} at ${selectedImage.time}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Image Container */}
            <div className="flex-1 relative bg-gray-50 flex items-center justify-center overflow-hidden">
              {imageLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">Loading image...</p>
                </div>
              ) : selectedImage ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={selectedImage.url}
                    alt="Field work attendance photo"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg cursor-zoom-in"
                    onClick={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (img.style.transform === 'scale(2)') {
                        img.style.transform = 'scale(1)';
                        img.style.cursor = 'zoom-in';
                      } else {
                        img.style.transform = 'scale(2)';
                        img.style.cursor = 'zoom-out';
                      }
                    }}
                    style={{ transition: 'transform 0.3s ease' }}
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No image available</p>
                </div>
              )}
            </div>
            
            {/* Image Metadata */}
            {selectedImage && (
              <div className="p-6 border-t bg-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Employee</Label>
                    <p className="font-medium">{selectedImage.employeeName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Date & Time</Label>
                    <p className="font-medium">{selectedImage.date}</p>
                    <p className="text-gray-600">{selectedImage.time}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Attendance Type</Label>
                    <Badge variant="outline" className="mt-1">
                      {selectedImage.attendanceType}
                    </Badge>
                  </div>
                  {selectedImage.customerName && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Customer</Label>
                      <p className="font-medium">{selectedImage.customerName}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="h-3 w-3" />
                    Verified attendance photo
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedImage?.url) {
                          const link = document.createElement('a');
                          link.href = selectedImage.url;
                          link.download = `attendance-${selectedImage.employeeName}-${selectedImage.date}.jpg`;
                          link.click();
                        }
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCloseImageModal}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Attendance Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingAttendance && isIncompleteRecord(editingAttendance) ? (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Fix Incomplete Record
                </>
              ) : (
                <>
                  <Edit className="h-5 w-5" />
                  Edit Attendance Record
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingAttendance && isIncompleteRecord(editingAttendance) ? (
                <div className="space-y-2">
                  <p>Fixing missing checkout for {editingAttendance?.userName}</p>
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                    <Clock className="h-4 w-4" />
                    Suggested time: {getSuggestedCheckoutTime(editingAttendance)} (department closing)
                  </div>
                </div>
              ) : (
                `Modify attendance details for ${editingAttendance?.userName}`
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkInTime">Check In Time</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={editForm.checkInTime}
                  onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="checkOutTime" className="flex items-center gap-2">
                  Check Out Time
                  {editingAttendance && isIncompleteRecord(editingAttendance) && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                      Missing
                    </Badge>
                  )}
                </Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={editForm.checkOutTime}
                  onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                  className={editingAttendance && isIncompleteRecord(editingAttendance) ? "border-amber-300 bg-amber-50" : ""}
                  placeholder={editingAttendance && isIncompleteRecord(editingAttendance) ? getSuggestedCheckoutTime(editingAttendance) : ""}
                />
                {editingAttendance && isIncompleteRecord(editingAttendance) && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => setEditForm({ ...editForm, checkOutTime: getSuggestedCheckoutTime(editingAttendance) })}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Use Department Time
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => setEditForm({ ...editForm, checkOutTime: "6:00 PM" })}
                      className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      Use 6:00 PM
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="overtimeHours">Overtime Hours</Label>
              <Input
                id="overtimeHours"
                type="number"
                step="0.5"
                min="0"
                value={editForm.overtimeHours}
                onChange={(e) => setEditForm({ ...editForm, overtimeHours: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Add remarks or notes..."
                value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateAttendanceMutation.isPending}
            >
              {updateAttendanceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Attendance Record Details
            </DialogTitle>
            <DialogDescription>
              {selectedAttendanceRecord && `Complete details for ${selectedAttendanceRecord.userName} on ${formatDate(new Date(selectedAttendanceRecord.date))}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAttendanceRecord && (
            <div className="space-y-6">
              {/* Employee Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employee Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Employee Name</Label>
                      <p className="font-medium">{selectedAttendanceRecord.userName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Email</Label>
                      <p className="font-medium">{selectedAttendanceRecord.userEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Department</Label>
                      <p className="font-medium capitalize">{selectedAttendanceRecord.userDepartment || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Designation</Label>
                      <p className="font-medium capitalize">{selectedAttendanceRecord.userDesignation || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Date</Label>
                      <p className="font-medium">{formatDate(new Date(selectedAttendanceRecord.date))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Timing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Attendance Timing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Check In Time</Label>
                      <p className="font-medium">
                        {selectedAttendanceRecord.checkInTime ? (
                          <TimeDisplay time={selectedAttendanceRecord.checkInTime} format12Hour={true} />
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700">Not Checked In</Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Check Out Time</Label>
                      <p className="font-medium">
                        {selectedAttendanceRecord.checkOutTime ? (
                          <TimeDisplay time={selectedAttendanceRecord.checkOutTime} format12Hour={true} />
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700">Not Checked Out</Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Working Hours</Label>
                      <p className="font-medium">
                        {selectedAttendanceRecord.workingHours ? 
                          `${selectedAttendanceRecord.workingHours.toFixed(1)}h` : 
                          `${calculateTotalTime(selectedAttendanceRecord).toFixed(1)}h`
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Overtime Hours</Label>
                      <p className="font-medium">
                        {selectedAttendanceRecord.overtimeHours ? 
                          `${selectedAttendanceRecord.overtimeHours.toFixed(1)}h` : '0h'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Status</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedAttendanceRecord)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Late Minutes</Label>
                      <p className="font-medium">
                        {selectedAttendanceRecord.lateMinutes ? 
                          `${selectedAttendanceRecord.lateMinutes} minutes` : 'On Time'
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Attendance Type</Label>
                      <Badge variant="outline" className="mt-1">
                        {selectedAttendanceRecord.attendanceType === 'field_work' ? 'Field Work' : 
                         selectedAttendanceRecord.attendanceType === 'remote' ? 'Remote Work' : 'Office'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Reason/Notes</Label>
                      <p className="font-medium">{selectedAttendanceRecord.reason || selectedAttendanceRecord.remarks || 'No additional notes'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Record ID</Label>
                      <p className="font-medium text-xs">{selectedAttendanceRecord.id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter className="sticky bottom-0 bg-white border-t pt-4">
            <Button
              variant="outline"
              onClick={() => selectedAttendanceRecord && handleEditAttendance(selectedAttendanceRecord)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Record
            </Button>
            <Button onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Policies Modal */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="max-w-3xl h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Attendance Policies & Settings
            </DialogTitle>
            <DialogDescription>
              Configure attendance policies, working hours, and system settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Current Policies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Policies</CardTitle>
              </CardHeader>
              <CardContent>
                {attendancePolicies.length > 0 ? (
                  <div className="space-y-4">
                    {attendancePolicies.map((policy: any) => (
                      <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{policy.name}</h4>
                          <p className="text-sm text-gray-600">{policy.description}</p>
                          {policy.rules && (
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium">Rules:</span> {Object.keys(policy.rules).length} configured
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={policy.isActive ? "default" : "secondary"}>
                            {policy.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No attendance policies configured</p>
                    <Button className="mt-4" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Policy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Department Working Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {departments.map((dept) => (
                    <div key={dept} className="p-4 border rounded-lg">
                      <h4 className="font-medium capitalize mb-2">{dept}</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Check-in:</span>
                          <span className="font-medium">9:00 AM</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Check-out:</span>
                          <span className="font-medium">6:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Working Hours:</span>
                          <span className="font-medium">8 hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Break Time:</span>
                          <span className="font-medium">1 hour</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        <Edit className="h-3 w-3 mr-2" />
                        Modify
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">General Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Late Arrival Threshold</h4>
                      <p className="text-sm text-gray-600">Grace period before marking as late</p>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">15 minutes</span>
                      <Button variant="outline" size="sm" className="ml-2">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Overtime Threshold</h4>
                      <p className="text-sm text-gray-600">Minimum overtime hours to qualify</p>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">30 minutes</span>
                      <Button variant="outline" size="sm" className="ml-2">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Photo Verification</h4>
                      <p className="text-sm text-gray-600">Require photos for attendance</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">Enabled</Badge>
                      <Button variant="outline" size="sm" className="ml-2">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Location Verification</h4>
                      <p className="text-sm text-gray-600">GPS-based attendance validation</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">Enabled</Badge>
                      <Button variant="outline" size="sm" className="ml-2">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Policy
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Settings
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Settings
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="sticky bottom-0 bg-white border-t pt-4">
            <Button variant="outline" onClick={() => setShowPolicyModal(false)}>
              Close
            </Button>
            <Button>
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Undo Manager */}
      <UndoManager
        actions={actions}
        onUndo={executeUndo}
        onClear={clearActions}
      />
    </div>
  );
}