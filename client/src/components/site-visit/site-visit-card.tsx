/**
 * Enhanced Site Visit Card Component
 * Displays site visit information with follow-up indicators and timeline
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  User, Phone, MapPin, Clock, RefreshCw, 
  ArrowRight, Building, AlertCircle, CheckCircle,
  FileText, Calendar, Users, Zap
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface SiteVisit {
  id: string;
  customer: {
    name: string;
    mobile: string;
    address: string;
    propertyType: string;
  };
  visitPurpose: string;
  department: string;
  siteInTime: string;
  siteOutTime?: string;
  status: string;
  followUpCount?: number;
  isFollowUp?: boolean;
  followUpOf?: string;
  followUpReason?: string;
  notes?: string;
}

interface SiteVisitCardProps {
  visit: SiteVisit;
  onFollowUp?: (visit: SiteVisit) => void;
  onCheckout?: (visit: SiteVisit) => void;
  showFollowUpButton?: boolean;
  showCheckoutButton?: boolean;
  isCompact?: boolean;
}

const statusColors = {
  'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
  'completed': 'bg-green-100 text-green-800 border-green-200',
  'cancelled': 'bg-red-100 text-red-800 border-red-200'
};

const departmentColors = {
  'technical': 'bg-orange-100 text-orange-800',
  'marketing': 'bg-green-100 text-green-800',
  'admin': 'bg-blue-100 text-blue-800'
};

const followUpReasonIcons = {
  'additional_work_required': Zap,
  'issue_resolution': AlertCircle,
  'status_check': CheckCircle,
  'customer_request': User,
  'maintenance': Clock,
  'other': FileText
};

export function SiteVisitCard({ 
  visit, 
  onFollowUp, 
  onCheckout, 
  showFollowUpButton = true,
  showCheckoutButton = true,
  isCompact = false 
}: SiteVisitCardProps) {
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'h:mm a'),
      relative: formatDistanceToNow(date, { addSuffix: true })
    };
  };

  const siteInTime = formatTime(visit.siteInTime);
  const siteOutTime = visit.siteOutTime ? formatTime(visit.siteOutTime) : null;

  const FollowUpReasonIcon = visit.followUpReason ? 
    followUpReasonIcons[visit.followUpReason as keyof typeof followUpReasonIcons] || FileText : 
    FileText;

  return (
    <Card className={`${isCompact ? 'h-auto' : 'h-full'} transition-all hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              {visit.customer.name}
              {visit.isFollowUp && (
                <Badge variant="outline" className="ml-2">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Follow-up
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={departmentColors[visit.department as keyof typeof departmentColors] || 'bg-gray-100 text-gray-800'}>
                {visit.department.charAt(0).toUpperCase() + visit.department.slice(1)}
              </Badge>
              <Badge variant="outline" className={statusColors[visit.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                {visit.status.replace('_', ' ')}
              </Badge>
              {visit.followUpCount && visit.followUpCount > 0 && (
                <Badge variant="secondary">
                  {visit.followUpCount} follow-up{visit.followUpCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer Information */}
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{visit.customer.mobile}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="flex-1">{visit.customer.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span>{visit.customer.propertyType}</span>
          </div>
        </div>

        <Separator />

        {/* Visit Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Purpose:</span>
            <span>{visit.visitPurpose}</span>
          </div>

          {/* Follow-up specific information */}
          {visit.isFollowUp && visit.followUpReason && (
            <div className="flex items-center gap-2 text-sm">
              <FollowUpReasonIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Reason:</span>
              <span className="capitalize">
                {visit.followUpReason.replace(/_/g, ' ')}
              </span>
            </div>
          )}

          {/* Timing Information */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="font-medium">Check-in:</span>
              <span>{siteInTime.time} on {siteInTime.date}</span>
              <span className="text-muted-foreground">({siteInTime.relative})</span>
            </div>
            
            {siteOutTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-red-600" />
                <span className="font-medium">Check-out:</span>
                <span>{siteOutTime.time} on {siteOutTime.date}</span>
                <span className="text-muted-foreground">({siteOutTime.relative})</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {visit.notes && (
            <div className="text-sm">
              <span className="font-medium">Notes:</span>
              <p className="text-muted-foreground mt-1 text-xs bg-gray-50 p-2 rounded">
                {visit.notes}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {(showFollowUpButton || showCheckoutButton) && (
          <>
            <Separator />
            <div className="flex gap-2 justify-end">
              {showFollowUpButton && onFollowUp && visit.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFollowUp(visit)}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Follow-up
                </Button>
              )}
              
              {showCheckoutButton && onCheckout && visit.status === 'in_progress' && !visit.siteOutTime && (
                <Button
                  size="sm"
                  onClick={() => onCheckout(visit)}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowRight className="h-4 w-4" />
                  Check-out
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}