import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Search, 
  PlusCircle, 
  Pencil, 
  Download, 
  Eye, 
  Loader2,
  ChevronLeft, 
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Filter
} from "lucide-react";
import { Link } from "wouter";

// Types for pagination and quotations
interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface QuotationsResponse {
  data: any[];
  pagination: PaginationInfo;
}

interface Quotation {
  id: string;
  customerId: string;
  customerName?: string;
  total: number;
  status: string;
  createdAt: string;
  products: any[];
}

export default function Quotations() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // Newest first by default
  const [statusFilter, setStatusFilter] = useState("");
  
  // Debounce search input
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 300);
    
    return () => clearTimeout(timerId);
  }, [searchQuery]);

  // Fetch quotations with pagination and filtering
  const { 
    data: quotationsResponse, 
    isLoading, 
    isFetching,
    isError 
  } = useQuery({
    queryKey: [`/api/quotations?page=${currentPage}&limit=${itemsPerPage}&search=${debouncedSearch}&sortBy=${sortBy}&sortOrder=${sortOrder}${statusFilter && statusFilter !== "all" ? `&status=${statusFilter}` : ''}`]
  });
  
  const quotations = quotationsResponse?.data || [];
  const pagination = quotationsResponse?.pagination;
  
  // Prefetch next page for smoother pagination
  useEffect(() => {
    if (pagination?.hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: [`/api/quotations?page=${currentPage + 1}&limit=${itemsPerPage}&search=${debouncedSearch}&sortBy=${sortBy}&sortOrder=${sortOrder}${statusFilter && statusFilter !== "all" ? `&status=${statusFilter}` : ''}`]
      });
    }
  }, [queryClient, currentPage, itemsPerPage, debouncedSearch, pagination?.hasNextPage, sortBy, sortOrder, statusFilter]);

  // Status badge styles
  const statusStyles = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800"
  };
  
  // Function to handle sort changes
  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle order if clicking the same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortBy(field);
      setSortOrder(field === "createdAt" ? "desc" : "asc"); // Default newest first for dates
    }
    setCurrentPage(1); // Reset to first page
  };
  
  // Render sort indicator
  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    
    return sortOrder === "asc" 
      ? <ArrowUp className="inline h-4 w-4 ml-1" /> 
      : <ArrowDown className="inline h-4 w-4 ml-1" />;
  };

  // Loading state
  if (isLoading && !quotationsResponse) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading quotations...</span>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
        <div>
          <CardTitle className="text-xl">Quotations</CardTitle>
          <CardDescription>Manage your customer quotations</CardDescription>
        </div>
        <Link href="/quotations/new">
          <Button className="bg-primary hover:bg-primary-dark text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by quotation or customer"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Select 
              value={statusFilter} 
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1); // Reset to first page
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1); // Reset to first page
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 items</SelectItem>
                <SelectItem value="20">20 items</SelectItem>
                <SelectItem value="50">50 items</SelectItem>
                <SelectItem value="100">100 items</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value);
                // Default to descending for dates, ascending for everything else
                setSortOrder(value === "createdAt" ? "desc" : "asc");
                setCurrentPage(1); // Reset to first page
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date</SelectItem>
                <SelectItem value="total">Amount</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
            >
              {sortOrder === "asc" ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("createdAt")}>
                  Date {renderSortIndicator("createdAt")}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("total")}>
                  Amount {renderSortIndicator("total")}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                  Status {renderSortIndicator("status")}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && !quotations.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <div className="mt-2">Loading quotations...</div>
                  </TableCell>
                </TableRow>
              ) : quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {debouncedSearch || statusFilter ? "No quotations match your search" : "No quotations found"}
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation: Quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">{quotation.id.substring(0, 6)}</TableCell>
                    <TableCell>
                      <div>{quotation.customerName || "Unknown"}</div>
                    </TableCell>
                    <TableCell>{formatDate(quotation.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(quotation.total)}</TableCell>
                    <TableCell>
                      <Badge className={cn("font-medium capitalize", 
                        quotation.status in statusStyles 
                          ? statusStyles[quotation.status as keyof typeof statusStyles] 
                          : "bg-gray-100"
                      )}>
                        {quotation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              
              {/* Loading indicator for next page */}
              {isFetching && quotations.length > 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      {/* Pagination Controls */}
      {pagination && (
        <CardFooter className="flex items-center justify-between px-6 py-4 border-t">
          <div className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of {pagination.totalItems} quotations
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={!pagination.hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            {/* Page number indicator */}
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
