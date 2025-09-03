import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Badge
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  CalendarIcon, Search, Loader2, FileText, BarChart, UserCheck, Clock, 
  Download, Users, CheckCircle, XCircle, AlertCircle, MapPin, Camera, User, TrendingUp
} from "lucide-react";

import { formatDate } from "@/lib/utils";
import { TimeDisplay } from "@/components/time/time-display";
import { DateRangePicker } from "@/components/ui/date-picker";

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'half_day': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'early_checkout': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Badge className={`${getStatusColor(status)} font-medium`}>
      {status?.replace('_', ' ') || 'Unknown'}
    </Badge>
  );
};

export default function AttendanceReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State for filtering - Default to last 30 days
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      from: thirtyDaysAgo,
      to: today
    };
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Range attendance records - Enhanced for date range and person filtering
  const { data: rangeAttendance = [], isLoading: isLoadingRange, error: rangeError, refetch: refetchRange } = useQuery({
    queryKey: ['/api/attendance/range', { 
      from: dateRange.from?.toISOString().split('T')[0], 
      to: dateRange.to?.toISOString().split('T')[0],
      userId: selectedEmployee !== "all" ? selectedEmployee : undefined,
      department: selectedDepartment !== "all" ? selectedDepartment : undefined
    }],
    enabled: !!user && !!dateRange.from && !!dateRange.to,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('from', dateRange.from.toISOString().split('T')[0]);
      if (dateRange.to) params.append('to', dateRange.to.toISOString().split('T')[0]);
      if (selectedEmployee !== "all") params.append('userId', selectedEmployee);
      if (selectedDepartment !== "all") params.append('department', selectedDepartment);
      
      console.log('Fetching attendance data with params:', params.toString());
      const response = await apiRequest(`/api/attendance/range?${params}`, 'GET');
      const data = await response.json();
      console.log('Received attendance data:', data);
      return data;
    },
  });

  // All users for employee dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest('/api/users', 'GET');
      return response.json();
    },
  });

  // Department statistics - use single date for stats
  const { data: departmentStats = [] } = useQuery({
    queryKey: ['/api/attendance/department-stats', dateRange.from?.toISOString().split('T')[0]],
    enabled: !!user && !!dateRange.from,
    queryFn: async () => {
      const dateParam = dateRange.from?.toISOString().split('T')[0];
      const response = await apiRequest(`/api/attendance/department-stats?date=${dateParam}`, 'GET');
      return response.json();
    },
  });

  // Filter attendance records
  const filteredRangeAttendance = rangeAttendance.filter((record: any) => {
    if (selectedStatus !== "all" && record.status !== selectedStatus) return false;
    return true;
  });

  // Helper function to check if a record is incomplete
  const isIncompleteRecord = (record: any) => {
    return !record.checkOutTime && record.checkInTime;
  };

  // Export functionality
  const handleExportExcel = () => {
    try {
      const dateRangeStr = dateRange.from && dateRange.to ? 
        `${formatDate(dateRange.from)}-to-${formatDate(dateRange.to)}` : 
        formatDate(new Date());
      
      // Add filter info to filename
      let fileName = `attendance-report-${dateRangeStr}`;
      if (selectedEmployee !== "all") {
        const employeeName = allUsers.find((u: any) => u.id === selectedEmployee)?.displayName || "employee";
        fileName += `-${employeeName.replace(/\s+/g, '-').toLowerCase()}`;
      }
      if (selectedDepartment !== "all") {
        fileName += `-${selectedDepartment}`;
      }
      fileName += '.xlsx';

      const exportData = filteredRangeAttendance.map((record: any) => ({
        'Employee Name': record.userName || `User #${record.userId}`,
        'Department': record.userDepartment || 'Unknown',
        'Date': formatDate(new Date(record.date)),
        'Check In Time': record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-US', { hour12: true }) : 'Not recorded',
        'Check Out Time': record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-US', { hour12: true }) : 'Not recorded',
        'Working Hours': record.workingHours ? `${record.workingHours.toFixed(2)}` : '0.00',
        'Overtime Hours': record.overtimeHours ? `${record.overtimeHours.toFixed(2)}` : '0.00',
        'Status': record.status || 'Unknown',
        'Has Photo': record.checkInPhoto ? 'Yes' : 'No',
        'Has Location': record.checkInLocation ? 'Yes' : 'No',
        'Check In Location': record.checkInLocation ? 
          `${record.checkInLocation.latitude}, ${record.checkInLocation.longitude}` : 'Not recorded',
        'Check Out Location': record.checkOutLocation ? 
          `${record.checkOutLocation.latitude}, ${record.checkOutLocation.longitude}` : 'Not recorded'
      }));

      // Add summary sheet
      const summaryData = [
        { 'Filter': 'Date Range', 'Value': `${dateRange.from?.toLocaleDateString()} to ${dateRange.to?.toLocaleDateString()}` },
        { 'Filter': 'Employee', 'Value': selectedEmployee === "all" ? 'All Employees' : allUsers.find((u: any) => u.id === selectedEmployee)?.displayName || 'Unknown' },
        { 'Filter': 'Department', 'Value': selectedDepartment === "all" ? 'All Departments' : selectedDepartment },
        { 'Filter': 'Status', 'Value': selectedStatus === "all" ? 'All Statuses' : selectedStatus },
        { 'Filter': 'Total Records', 'Value': filteredRangeAttendance.length.toString() },
        { 'Filter': 'Export Date', 'Value': new Date().toLocaleString() }
      ];

      const wb = XLSX.utils.book_new();
      
      // Add summary sheet
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Export Summary');
      
      // Add attendance data sheet
      const dataWs = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, dataWs, 'Attendance Data');
      
      XLSX.writeFile(wb, fileName);
      
      console.log(`Exported ${exportData.length} records to ${fileName}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Get unique departments for filtering
  const availableDepartments = Array.from(new Set(
    allUsers.map((user: any) => user.department).filter((dept: string) => Boolean(dept))
  )) as string[];

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Attendance Reports</h1>
          <p className="text-gray-600 mt-1">Advanced filtering and analytics for attendance data</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleExportExcel}
            disabled={filteredRangeAttendance.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            Export ({filteredRangeAttendance.length} records)
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              setSelectedEmployee("all");
              setSelectedDepartment("all");
              setSelectedStatus("all");
              const today = new Date();
              const thirtyDaysAgo = new Date(today);
              thirtyDaysAgo.setDate(today.getDate() - 30);
              setDateRange({ from: thirtyDaysAgo, to: today });
              refetchRange();
            }}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Clear Filters
          </Button>
          
          <Button
            variant="outline"
            onClick={() => refetchRange()}
            disabled={isLoadingRange}
            className="flex items-center gap-2"
          >
            {isLoadingRange ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Filters
          </CardTitle>
          <CardDescription>
            Filter attendance records by employee, department, date range, and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Employee Filter */}
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {allUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {availableDepartments.map((dept: string) => (
                    <SelectItem key={dept} value={dept}>
                      {dept.charAt(0).toUpperCase() + dept.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="early_checkout">Early Checkout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker 
                dateRange={dateRange}
                setDateRange={setDateRange}
                className="w-full"
              />
              
              {/* Quick Date Presets */}
              <div className="flex flex-wrap gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    setDateRange({ from: today, to: today });
                  }}
                >
                  Today
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    setDateRange({ from: yesterday, to: yesterday });
                  }}
                >
                  Yesterday
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const sevenDaysAgo = new Date(today);
                    sevenDaysAgo.setDate(today.getDate() - 7);
                    setDateRange({ from: sevenDaysAgo, to: today });
                  }}
                >
                  Last 7 Days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const thirtyDaysAgo = new Date(today);
                    thirtyDaysAgo.setDate(today.getDate() - 30);
                    setDateRange({ from: thirtyDaysAgo, to: today });
                  }}
                >
                  Last 30 Days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    setDateRange({ from: firstDayOfMonth, to: today });
                  }}
                >
                  This Month
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredRangeAttendance.length}</p>
                <p className="text-sm text-gray-600">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {filteredRangeAttendance.filter((r: any) => r.status === 'present').length}
                </p>
                <p className="text-sm text-gray-600">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {filteredRangeAttendance.filter((r: any) => isIncompleteRecord(r)).length}
                </p>
                <p className="text-sm text-gray-600">Incomplete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredRangeAttendance.reduce((sum: number, r: any) => sum + (r.overtimeHours || 0), 0).toFixed(1)}h
                </p>
                <p className="text-sm text-gray-600">Total OT</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee-specific analytics when individual selected */}
      {selectedEmployee !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Employee Analytics - {allUsers.find((u: any) => u.id === selectedEmployee)?.displayName || "Unknown"}
            </CardTitle>
            <CardDescription>
              Individual performance metrics for the selected date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{filteredRangeAttendance.length}</div>
                <div className="text-sm text-blue-600">Total Days</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {filteredRangeAttendance.filter((r: any) => !isIncompleteRecord(r)).length}
                </div>
                <div className="text-sm text-green-600">Complete Days</div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">
                  {filteredRangeAttendance.filter((r: any) => r.status === 'half_day').length}
                </div>
                <div className="text-sm text-amber-600">Half Days</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {filteredRangeAttendance.reduce((sum: number, r: any) => sum + (r.workingHours || 0), 0).toFixed(1)}h
                </div>
                <div className="text-sm text-purple-600">Total Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">
            Detailed Attendance Records - {dateRange.from && dateRange.to ? 
              `${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}` : 'Date Range'}
          </CardTitle>
          <CardDescription>
            Comprehensive view of all filtered attendance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRange ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-muted-foreground mt-2">Loading attendance data...</p>
            </div>
          ) : filteredRangeAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Working Hours</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRangeAttendance.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.userName || `User #${record.userId}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {record.userDepartment || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDate(new Date(record.date))}
                      </TableCell>
                      <TableCell>
                        {record.checkInTime ? (
                          <div className="flex items-center gap-2">
                            <TimeDisplay time={record.checkInTime} format12Hour={true} />
                            {record.checkInPhoto && (
                              <Camera className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-500">No check-in</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.checkOutTime ? (
                          <div className="flex items-center gap-2">
                            <TimeDisplay time={record.checkOutTime} format12Hour={true} />
                            {record.checkOutPhoto && (
                              <Camera className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        ) : isIncompleteRecord(record) ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {record.workingHours ? `${record.workingHours.toFixed(1)}h` : '0h'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {record.overtimeHours ? `${record.overtimeHours.toFixed(1)}h` : '0h'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                      <TableCell>
                        {(record.checkInLocation || record.checkOutLocation) && (
                          <MapPin className="h-4 w-4 text-blue-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="space-y-2">
                <p className="font-medium">No attendance records found</p>
                {rangeError ? (
                  <p className="text-sm text-red-600">Error loading data: {rangeError.message}</p>
                ) : (
                  <div className="text-sm space-y-1">
                    <p>Current filters:</p>
                    <p>• Date range: {dateRange.from ? dateRange.from.toLocaleDateString() : 'Not set'} to {dateRange.to ? dateRange.to.toLocaleDateString() : 'Not set'}</p>
                    {selectedEmployee !== "all" && <p>• Employee: {allUsers.find((u: any) => u.id === selectedEmployee)?.displayName || 'Unknown'}</p>}
                    {selectedDepartment !== "all" && <p>• Department: {selectedDepartment}</p>}
                    {selectedStatus !== "all" && <p>• Status: {selectedStatus}</p>}
                    <p className="mt-3 text-gray-600">Try adjusting your filters or check if attendance data exists for this period</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}