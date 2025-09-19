/**
 * Site Visit Management Page
 * Handles field operations for Technical, Marketing, and Admin departments
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  MapPin, 
  Clock, 
  Timer,
  Users, 
  Activity, 
  Camera,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  LogOut,
  RefreshCw,
  History
} from "lucide-react";
import { SiteVisitStartModal } from "@/components/site-visit/site-visit-start-modal";
import { SiteVisitDetailsModal } from "@/components/site-visit/site-visit-details-modal";
import { SiteVisitCheckoutModal } from "@/components/site-visit/site-visit-checkout-modal";
import { FollowUpModal } from "@/components/site-visit/follow-up-modal";
import { FollowUpDetailsModal } from "@/components/site-visit/follow-up-details-modal";
import { formatDistanceToNow } from "date-fns";

interface SiteVisit {
  id: string;
  userId: string;
  department: 'technical' | 'marketing' | 'admin';
  visitPurpose: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  siteInTime: string;
  siteOutTime?: string;
  customer: {
    name: string;
    mobile: string;
    address: string;
    propertyType: string;
  };
  technicalData?: any;
  marketingData?: any;
  adminData?: any;
  sitePhotos: Array<{
    url: string;
    timestamp: string;
    description?: string;
  }>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isFollowUp?: boolean;
  followUpOf?: string;
  followUpReason?: string;
  followUpCount?: number;
  hasFollowUps?: boolean;
}

// Unified Site Visit Types
interface CustomerVisitGroup {
  customerMobile: string;
  customerName: string;
  customerAddress: string;
  primaryVisit: SiteVisit;
  followUps: SiteVisit[];
  totalVisits: number;
  latestStatus: string;
  hasActiveVisit: boolean;
}

// Group visits by customer (mobile + name combination)
function groupVisitsByCustomer(visits: SiteVisit[]): CustomerVisitGroup[] {
  if (!visits || !Array.isArray(visits)) {
    return [];
  }

  const groupMap = new Map<string, CustomerVisitGroup>();

  visits.forEach((visit) => {
    // Use combination of mobile and customer name for unique grouping
    // This ensures different customers with same mobile are shown separately
    const groupKey = `${visit.customer.mobile}_${visit.customer.name.toLowerCase()}`;
    
    if (!groupMap.has(groupKey)) {
      // Initialize new group with this visit as primary
      groupMap.set(groupKey, {
        customerMobile: visit.customer.mobile,
        customerName: visit.customer.name,
        customerAddress: visit.customer.address,
        primaryVisit: visit,
        followUps: [],
        totalVisits: 1,
        latestStatus: visit.status,
        hasActiveVisit: visit.status === 'in_progress'
      });
    } else {
      const group = groupMap.get(groupKey)!;
      
      // If this visit is newer than current primary, swap them
      const visitTime = new Date(visit.createdAt || visit.siteInTime);
      const primaryTime = new Date(group.primaryVisit.createdAt || group.primaryVisit.siteInTime);
      
      if (visitTime > primaryTime) {
        // Move current primary to follow-ups and set this as new primary
        group.followUps.unshift(group.primaryVisit);
        group.primaryVisit = visit;
      } else {
        // Add as follow-up (maintain chronological order)
        group.followUps.push(visit);
      }
      
      group.totalVisits++;
      
      // Update status to latest active status
      if (visit.status === 'in_progress') {
        group.hasActiveVisit = true;
        group.latestStatus = 'in_progress';
      } else if (group.latestStatus !== 'in_progress') {
        group.latestStatus = visit.status;
      }
    }
  });

  // Sort follow-ups by date (newest first)
  groupMap.forEach(group => {
    group.followUps.sort((a, b) => 
      new Date(b.createdAt || b.siteInTime).getTime() - 
      new Date(a.createdAt || a.siteInTime).getTime()
    );
  });

  // Convert to array and sort by latest activity
  return Array.from(groupMap.values()).sort((a, b) => {
    const aLatest = Math.max(
      new Date(a.primaryVisit.createdAt || a.primaryVisit.siteInTime).getTime(),
      ...a.followUps.map(f => new Date(f.createdAt || f.siteInTime).getTime())
    );
    const bLatest = Math.max(
      new Date(b.primaryVisit.createdAt || b.primaryVisit.siteInTime).getTime(),
      ...b.followUps.map(f => new Date(f.createdAt || f.siteInTime).getTime())
    );
    return bLatest - aLatest;
  });
}

export default function SiteVisitPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [selectedSiteVisit, setSelectedSiteVisit] = useState<SiteVisit | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isFollowUpDetailsModalOpen, setIsFollowUpDetailsModalOpen] = useState(false);
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("my-visits");

  // Check if user has access to Site Visit features
  const hasAccess = user?.department && ['technical', 'marketing', 'admin', 'administration'].includes(user.department.toLowerCase());

  // Fetch user's site visits
  const { data: mySiteVisits, isLoading: isLoadingMy } = useQuery({
    queryKey: ['/api/site-visits', { userId: user?.uid }],
    queryFn: async () => {
      const response = await apiRequest(`/api/site-visits?userId=${user?.uid}`, 'GET');
      return await response.json();
    },
    enabled: Boolean(hasAccess && user?.uid && activeTab === 'my-visits'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch user's follow-up visits
  const { data: myFollowUps, isLoading: isLoadingMyFollowUps } = useQuery({
    queryKey: ['/api/follow-ups', { userId: user?.uid }],
    queryFn: async () => {
      const response = await apiRequest(`/api/follow-ups?userId=${user?.uid}`, 'GET');
      return await response.json();
    },
    enabled: Boolean(hasAccess && user?.uid && activeTab === 'my-visits'),
    refetchInterval: 30000,
  });

  // Fetch team/all site visits based on permissions
  const { data: teamSiteVisits, isLoading: isLoadingTeam, refetch: refetchTeam } = useQuery({
    queryKey: ['/api/site-visits', { department: user?.department }],
    queryFn: async () => {
      const response = await apiRequest(`/api/site-visits?department=${user?.department}`, 'GET');
      return await response.json();
    },
    enabled: Boolean(hasAccess && user?.department && activeTab === 'team-visits'),
    refetchInterval: 30000,
  });

  // Fetch team follow-ups for team visits tab
  const { data: teamFollowUps, isLoading: isLoadingTeamFollowUps } = useQuery({
    queryKey: ['/api/follow-ups', { department: user?.department }],
    queryFn: async () => {
      const response = await apiRequest(`/api/follow-ups?department=${user?.department}`, 'GET');
      return await response.json();
    },
    enabled: Boolean(hasAccess && user?.department && activeTab === 'team-visits'),
    refetchInterval: 30000,
  });

  // Fetch active site visits
  const { data: activeSiteVisits, isLoading: isLoadingActive, refetch: refetchActive } = useQuery({
    queryKey: ['/api/site-visits/active'],
    queryFn: async () => {
      const response = await apiRequest('/api/site-visits/active', 'GET');
      return await response.json();
    },
    enabled: Boolean(hasAccess && activeTab === 'active-visits'),
    refetchInterval: 15000, // More frequent updates for active visits
  });

  // Fetch active follow-ups for active visits tab  
  const { data: activeFollowUps, isLoading: isLoadingActiveFollowUps } = useQuery({
    queryKey: ['/api/follow-ups/active'],
    queryFn: async () => {
      const response = await apiRequest('/api/follow-ups?status=in_progress', 'GET');
      return await response.json();
    },
    enabled: Boolean(hasAccess && activeTab === 'active-visits'),
    refetchInterval: 15000,
  });

  // Fetch site visit statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/site-visits/stats'],
    queryFn: async () => {
      const response = await apiRequest('/api/site-visits/stats', 'GET');
      return await response.json();
    },
    enabled: Boolean(hasAccess),
    refetchInterval: 60000, // Refresh stats every minute
  });

  // Delete site visit mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/site-visits/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Site visit deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/site-visits'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete site visit",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSiteVisit = (id: string) => {
    if (confirm("Are you sure you want to delete this site visit?")) {
      deleteMutation.mutate(id);
    }
  };

  // Convert follow-ups to site visit format for display
  const convertFollowUpToSiteVisit = (followUp: any): SiteVisit => {
    return {
      id: followUp.id,
      userId: followUp.userId,
      department: followUp.department,
      customer: followUp.customer,
      visitPurpose: `Follow-up: ${followUp.followUpReason?.replace(/_/g, ' ')}`,
      siteInTime: followUp.siteInTime,
      siteOutTime: followUp.siteOutTime,
      siteInLocation: followUp.siteInLocation,
      siteOutLocation: followUp.siteOutLocation,
      siteInPhotoUrl: followUp.siteInPhotoUrl,
      siteOutPhotoUrl: followUp.siteOutPhotoUrl,
      status: followUp.status,
      notes: followUp.notes || followUp.description,
      isFollowUp: true,
      followUpOf: followUp.originalVisitId,
      followUpReason: followUp.followUpReason,
      createdAt: followUp.createdAt,
      updatedAt: followUp.updatedAt,
      sitePhotos: followUp.sitePhotos || []
    };
  };

  // Combine site visits and follow-ups for display
  const combineVisitsAndFollowUps = (visits: any, followUps: any) => {
    const siteVisits = visits?.data || [];
    const followUpVisits = followUps?.data || [];
    
    console.log("=== COMBINE VISITS DEBUG ===");
    console.log("Site visits count:", siteVisits.length);
    console.log("Follow-ups count:", followUpVisits.length);
    console.log("Follow-ups data:", followUpVisits);
    
    const convertedFollowUps = followUpVisits.map(convertFollowUpToSiteVisit);
    const combined = [...siteVisits, ...convertedFollowUps];
    
    console.log("Combined visits count:", combined.length);
    console.log("Combined data:", combined);
    
    // Sort by creation time (most recent first)
    return combined.sort((a, b) => {
      const aTime = new Date(a.createdAt || a.siteInTime).getTime();
      const bTime = new Date(b.createdAt || b.siteInTime).getTime();
      return bTime - aTime;
    });
  };

  const handleViewDetails = (siteVisit: SiteVisit) => {
    // Check if this is a follow-up visit stored in the separate collection
    if (siteVisit.isFollowUp && siteVisit.id) {
      // This is a follow-up visit - use the follow-up details modal
      setSelectedFollowUpId(siteVisit.id);
      setIsFollowUpDetailsModalOpen(true);
    } else {
      // This is a regular site visit - use the regular details modal
      setSelectedSiteVisit(siteVisit);
      setIsDetailsModalOpen(true);
    }
  };

  const handleCheckoutSiteVisit = (siteVisit: SiteVisit) => {
    // For follow-ups, we need to use the follow-up checkout endpoint
    if (siteVisit.isFollowUp && siteVisit.id) {
      // Set up for follow-up checkout
      setSelectedFollowUpId(siteVisit.id);
      setSelectedSiteVisit(siteVisit); // Still need this for the checkout modal
      setIsCheckoutModalOpen(true);
    } else {
      // Regular site visit checkout
      setSelectedSiteVisit(siteVisit);
      setIsCheckoutModalOpen(true);
    }
  };

  const handleFollowUpVisit = (siteVisit: SiteVisit) => {
    setSelectedSiteVisit(siteVisit);
    setIsFollowUpModalOpen(true);
  };

  // Follow-up checkout mutation
  const followUpCheckoutMutation = useMutation({
    mutationFn: async ({ followUpId, checkoutData }: { followUpId: string; checkoutData: any }) => {
      return apiRequest(`/api/follow-ups/${followUpId}/checkout`, 'PATCH', checkoutData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Follow-up checkout completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/site-visits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/follow-ups'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to checkout follow-up visit",
        variant: "destructive",
      });
    }
  });

  const handleFollowUpCheckout = async (followUpId: string) => {
    try {
      // Fetch the follow-up data to get full details for checkout modal
      const response = await apiRequest(`/api/follow-ups/${followUpId}`, 'GET');
      const followUpData = await response.json();
      const followUp = followUpData.data;
      
      if (followUp) {
        // Set the isFollowUp flag and open the checkout modal with proper location/photo capture
        const followUpForCheckout = {
          ...followUp,
          isFollowUp: true // Ensure this flag is set
        };
        
        setSelectedSiteVisit(followUpForCheckout);
        setIsCheckoutModalOpen(true);
      } else {
        toast({
          title: "Error",
          description: "Follow-up visit not found",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || "Failed to load follow-up visit for checkout",
        variant: "destructive",
      });
    }
  };

  if (!hasAccess) {
    return (
      <div className="container mx-auto p-2 sm:p-4 lg:p-8">
        <Card>
          <CardHeader className="text-center sm:text-left">
            <CardTitle className="flex items-center gap-2 justify-center sm:justify-start text-lg sm:text-xl">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
              Site Visit Management
            </CardTitle>
            <CardDescription className="text-sm">
              Field operations management for Technical, Marketing, and Admin departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 sm:py-8 px-4">
              <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Access Restricted</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-md mx-auto">
                Site Visit features are only available to Technical, Marketing, and Admin departments.
              </p>
              <Badge variant="outline" className="text-xs sm:text-sm">
                Your Department: {user?.department || 'Not Assigned'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-8 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Site Visit Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage field operations and site visits for {user?.department} department
          </p>
        </div>
        <Button 
          onClick={() => setIsStartModalOpen(true)} 
          size="default"
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Start Site Visit
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <Activity className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600 flex-shrink-0" />
                <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Visits</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{(stats as any)?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <Clock className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-orange-600 flex-shrink-0" />
                <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">In Progress</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{(stats as any)?.inProgress || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-600 flex-shrink-0" />
                <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Completed</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{(stats as any)?.completed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-purple-600 flex-shrink-0" />
                <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Department</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{(stats as any)?.byDepartment?.[user?.department || ''] || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Site Visits Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="my-visits" className="text-xs sm:text-sm px-2 py-2">My Visits</TabsTrigger>
          <TabsTrigger value="active-visits" className="text-xs sm:text-sm px-2 py-2">Active Visits</TabsTrigger>
          <TabsTrigger value="team-visits" className="text-xs sm:text-sm px-2 py-2">Team Visits</TabsTrigger>
        </TabsList>

        {/* My Site Visits */}
        <TabsContent value="my-visits">
          <Card>
            <CardHeader>
              <CardTitle>My Site Visits</CardTitle>
              <CardDescription>
                Your personal site visits and field operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(isLoadingMy || isLoadingMyFollowUps) ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (() => {
                const combinedVisits = combineVisitsAndFollowUps(mySiteVisits, myFollowUps);
                return combinedVisits.length === 0;
              })() ? (
                <div className="text-center py-6 sm:py-8 px-4">
                  <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No site visits yet</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-sm mx-auto">
                    Start your first site visit to begin tracking field operations
                  </p>
                  <Button 
                    onClick={() => setIsStartModalOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start Site Visit
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const combinedVisits = combineVisitsAndFollowUps(mySiteVisits, myFollowUps);
                    return groupVisitsByCustomer(combinedVisits);
                  })().map((group: CustomerVisitGroup, index: number) => (
                    <UnifiedSiteVisitCard
                      key={`${group.customerMobile}_${group.customerName}_${index}`}
                      visitGroup={group}
                      onView={handleViewDetails}
                      onCheckout={handleCheckoutSiteVisit}
                      onFollowUp={handleFollowUpVisit}
                      onDelete={handleDeleteSiteVisit}
                      showActions={true}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Site Visits */}
        <TabsContent value="active-visits">
          <Card>
            <CardHeader>
              <CardTitle>Active Site Visits</CardTitle>
              <CardDescription>
                Currently in-progress site visits across all departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Real-time updates every 15 seconds
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchActive()}
                  className="h-8 px-3"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              {(isLoadingActive || isLoadingActiveFollowUps) ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (() => {
                const combinedActiveVisits = combineVisitsAndFollowUps(activeSiteVisits, activeFollowUps);
                const activeInProgressVisits = combinedActiveVisits.filter(visit => visit.status === 'in_progress');
                return activeInProgressVisits.length === 0;
              })() ? (
                <div className="text-center py-6 sm:py-8 px-4">
                  <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No active site visits</h3>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto">
                    All site visits have been completed
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const combinedActiveVisits = combineVisitsAndFollowUps(activeSiteVisits, activeFollowUps);
                    const activeInProgressVisits = combinedActiveVisits.filter(visit => visit.status === 'in_progress');
                    return groupVisitsByCustomer(activeInProgressVisits);
                  })().map((group: CustomerVisitGroup, index: number) => (
                    <UnifiedSiteVisitCard
                      key={`${group.customerMobile}_${group.customerName}_${index}`}
                      visitGroup={group}
                      onView={handleViewDetails}
                      onCheckout={handleCheckoutSiteVisit}
                      onFollowUp={handleFollowUpVisit}
                      showActions={true}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Site Visits */}
        <TabsContent value="team-visits">
          <Card>
            <CardHeader>
              <CardTitle>Team Site Visits</CardTitle>
              <CardDescription>
                Site visits from your department team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Real-time updates every 30 seconds
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchTeam()}
                  className="h-8 px-3"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              {(isLoadingTeam || isLoadingTeamFollowUps) ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (() => {
                const combinedTeamVisits = combineVisitsAndFollowUps(teamSiteVisits, teamFollowUps);
                return combinedTeamVisits.length === 0;
              })() ? (
                <div className="text-center py-6 sm:py-8 px-4">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No team site visits</h3>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto">
                    No site visits from your department team yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupVisitsByCustomer(combineVisitsAndFollowUps(teamSiteVisits, teamFollowUps)).map((group: CustomerVisitGroup, index: number) => (
                    <UnifiedSiteVisitCard
                      key={`${group.customerMobile}_${group.customerName}_${index}`}
                      visitGroup={group}
                      onView={handleViewDetails}
                      onCheckout={handleCheckoutSiteVisit}
                      onFollowUp={handleFollowUpVisit}
                      showActions={true}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SiteVisitStartModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        userDepartment={user?.department?.toLowerCase() === 'administration' ? 'admin' : (user?.department || 'technical')}
      />

      <SiteVisitDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        siteVisit={selectedSiteVisit}
      />

      {selectedSiteVisit && (
        <SiteVisitCheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          siteVisit={selectedSiteVisit}
        />
      )}

      <FollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        originalVisit={selectedSiteVisit}
      />

      <FollowUpDetailsModal
        isOpen={isFollowUpDetailsModalOpen}
        onClose={() => setIsFollowUpDetailsModalOpen(false)}
        followUpId={selectedFollowUpId}
        onCheckout={handleFollowUpCheckout}
      />
    </div>
  );
}

// Unified Site Visit Card Component
interface UnifiedSiteVisitCardProps {
  visitGroup: CustomerVisitGroup;
  onView: (visit: SiteVisit) => void;
  onCheckout?: (visit: SiteVisit) => void;
  onFollowUp?: (visit: SiteVisit) => void;
  onDelete?: (visitId: string) => void;
  showActions: boolean;
}

function UnifiedSiteVisitCard({ visitGroup, onView, onCheckout, onFollowUp, onDelete, showActions }: UnifiedSiteVisitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'technical': return 'bg-blue-100 text-blue-800';
      case 'marketing': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return formatDistanceToNow(new Date(timeString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const currentActiveVisit = visitGroup.hasActiveVisit 
    ? (visitGroup.primaryVisit.status === 'in_progress' 
        ? visitGroup.primaryVisit 
        : visitGroup.followUps.find(f => f.status === 'in_progress'))
    : null;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <CardTitle className="text-base sm:text-lg truncate">{visitGroup.customerName}</CardTitle>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <Badge className={getStatusColor(visitGroup.latestStatus)}>
                {visitGroup.latestStatus.replace('_', ' ')}
              </Badge>
              {visitGroup.totalVisits > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {visitGroup.totalVisits} visits
                </Badge>
              )}
            </div>
          </div>
          
          {visitGroup.followUps.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                {visitGroup.followUps.length} follow-up{visitGroup.followUps.length > 1 ? 's' : ''}
              </Badge>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate sm:text-clip">{visitGroup.customerMobile}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1 text-xs sm:text-sm line-clamp-2">{visitGroup.customerAddress}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6">
        {/* Primary Visit Display */}
        <div className="border rounded-lg p-2 sm:p-3 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <Badge className={getDepartmentColor(visitGroup.primaryVisit.department)}>
                {visitGroup.primaryVisit.department}
              </Badge>
              <span className="text-xs sm:text-sm font-medium">Latest Visit</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTime(visitGroup.primaryVisit.siteInTime)}
            </span>
          </div>
          
          <div className="text-xs sm:text-sm space-y-1">
            <div><strong>Purpose:</strong> <span className="break-words">{visitGroup.primaryVisit.visitPurpose}</span></div>
            {visitGroup.primaryVisit.notes && (
              <div><strong>Notes:</strong> <span className="break-words">{visitGroup.primaryVisit.notes}</span></div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground">
              <span>Check-in: {formatTime(visitGroup.primaryVisit.siteInTime)}</span>
              {visitGroup.primaryVisit.siteOutTime && (
                <span>Check-out: {formatTime(visitGroup.primaryVisit.siteOutTime)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Visit Timeline - All Visits Chronologically */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <History className="h-4 w-4" />
            <span>Visit Timeline ({visitGroup.totalVisits} visits)</span>
          </div>
          
          {/* Create chronological list of ALL visits */}
          {(() => {
            // Combine primary visit and follow-ups in reverse chronological order (latest first)
            const allVisits = [visitGroup.primaryVisit, ...visitGroup.followUps]
              .sort((a, b) => new Date(b.siteInTime || b.createdAt).getTime() - new Date(a.siteInTime || a.createdAt).getTime());
            
            return (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {allVisits.map((visit, index) => {
                  const isOriginal = !visit.isFollowUp;
                  const visitNumber = index + 1;
                  const isLatest = index === allVisits.length - 1;
                  
                  return (
                    <div key={visit.id} className={`border rounded-lg p-3 transition-all hover:shadow-sm ${
                      isLatest ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                    }`}>
                      {/* Visit Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-medium">
                            {isOriginal ? `Original Visit` : `Follow-up #${visitNumber - 1}`}
                          </Badge>
                          <Badge className={getDepartmentColor(visit.department)}>
                            {visit.department}
                          </Badge>
                          <Badge className={getStatusColor(visit.status)}>
                            {visit.status.replace('_', ' ')}
                          </Badge>
                          {isLatest && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(visit.siteInTime || visit.createdAt)}
                        </span>
                      </div>
                      
                      {/* Visit Details */}
                      <div className="text-sm space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Purpose:</span> 
                          <span>{visit.visitPurpose}</span>
                        </div>
                        
                        {visit.followUpReason && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Reason:</span> 
                            <span className="capitalize">{visit.followUpReason.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                        
                        {visit.notes && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium">Notes:</span> 
                            <span className="text-muted-foreground text-xs">{visit.notes.substring(0, 100)}{visit.notes.length > 100 ? '...' : ''}</span>
                          </div>
                        )}
                        
                        {/* Timing Info */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Check-in: {formatTime(visit.siteInTime || visit.createdAt)}</span>
                          {visit.siteOutTime && (
                            <span>Check-out: {formatTime(visit.siteOutTime)}</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Individual Visit Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(visit)}
                          className="text-xs h-7 px-3"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                        
                        {visit.status === 'in_progress' && onCheckout && (
                          <Button
                            size="sm"
                            onClick={() => onCheckout(visit)}
                            className="text-xs h-7 px-3 bg-blue-600 hover:bg-blue-700"
                          >
                            <LogOut className="h-3 w-3 mr-1" />
                            Check-out
                          </Button>
                        )}
                        
                        {visit.status === 'completed' && onFollowUp && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onFollowUp(visit)}
                            className="text-xs h-7 px-3"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Create Follow-up
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Quick Actions for Overall Customer */}
        {showActions && (
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2 border-t">
            {onFollowUp && visitGroup.latestStatus !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFollowUp(visitGroup.primaryVisit)}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Start New Follow-up
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Legacy Site Visit Card Component (kept for compatibility)
interface SiteVisitCardProps {
  siteVisit: SiteVisit;
  onView: () => void;
  onCheckout?: () => void;
  onFollowUp?: () => void;
  onDelete?: () => void;
  showActions: boolean;
}

function SiteVisitCard({ siteVisit, onView, onCheckout, onFollowUp, onDelete, showActions }: SiteVisitCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'technical': return 'bg-blue-100 text-blue-800';
      case 'marketing': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getStatusColor(siteVisit.status)}>
                {siteVisit.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={getDepartmentColor(siteVisit.department)}>
                {siteVisit.department}
              </Badge>
              <Badge variant="outline">
                {siteVisit.visitPurpose}
              </Badge>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg">{siteVisit.customer.name}</h3>
              <p className="text-sm text-muted-foreground">{siteVisit.customer.address}</p>
              <p className="text-sm text-muted-foreground">{siteVisit.customer.mobile}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {siteVisit.siteOutTime ? (
                  <span>Completed {formatDistanceToNow(new Date(siteVisit.siteOutTime))} ago</span>
                ) : (
                  <span>Started {formatDistanceToNow(new Date(siteVisit.siteInTime))} ago</span>
                )}
              </div>
              {siteVisit.siteOutTime && (
                <div className="flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  <span>Duration: {Math.round((new Date(siteVisit.siteOutTime).getTime() - new Date(siteVisit.siteInTime).getTime()) / (1000 * 60))}min</span>
                </div>
              )}
              {siteVisit.sitePhotos.length > 0 && (
                <div className="flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  <span>{siteVisit.sitePhotos.length} photo{siteVisit.sitePhotos.length !== 1 ? 's' : ''}</span>
                  {siteVisit.sitePhotos.length > 5 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      {siteVisit.sitePhotos.length > 15 ? 'Comprehensive' : 'Good Coverage'}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onView}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {siteVisit.status === 'in_progress' && onCheckout && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onCheckout}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
              {siteVisit.status === 'completed' && onFollowUp && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFollowUp}
                  className="text-blue-600 hover:text-blue-700"
                  title="Create follow-up visit"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              {onDelete && siteVisit.status !== 'in_progress' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}