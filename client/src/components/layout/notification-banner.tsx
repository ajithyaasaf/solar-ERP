import { useState } from "react";
import { AlertCircle, Info, X, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const notificationIcons = {
    auto_checkout: Clock,
    admin_review: AlertCircle,
    site_visit_auto_closed: MapPin,
    system: Info,
    general: Info,
};

const notificationStyles = {
    auto_checkout: {
        container: "bg-amber-50 border border-amber-300 text-amber-900",
        icon: "text-amber-600",
        action: "text-amber-700 underline hover:no-underline font-medium",
        close: "text-amber-700 hover:bg-amber-200",
    },
    admin_review: {
        container: "bg-blue-50 border border-blue-300 text-blue-900",
        icon: "text-blue-600",
        action: "text-blue-700 underline hover:no-underline font-medium",
        close: "text-blue-700 hover:bg-blue-200",
    },
    site_visit_auto_closed: {
        container: "bg-teal-50 border border-teal-300 text-teal-900",
        icon: "text-teal-600",
        action: "text-teal-700 underline hover:no-underline font-medium",
        close: "text-teal-700 hover:bg-teal-200",
    },
    system: {
        container: "bg-gray-50 border border-gray-300 text-gray-900",
        icon: "text-gray-600",
        action: "text-gray-700 underline hover:no-underline font-medium",
        close: "text-gray-700 hover:bg-gray-200",
    },
    general: {
        container: "bg-gray-50 border border-gray-300 text-gray-900",
        icon: "text-gray-600",
        action: "text-gray-700 underline hover:no-underline font-medium",
        close: "text-gray-700 hover:bg-gray-200",
    },
};

const defaultStyle = notificationStyles.general;

export function NotificationBanner() {
    const { notifications, dismissNotification } = useNotifications();
    // Track optimistically dismissed IDs for instant UI removal
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    // Only show unread notifications that haven't been optimistically dismissed
    const visibleNotifications = notifications.filter(
        n => n.status === "unread" && !dismissedIds.has(n.id)
    );

    if (visibleNotifications.length === 0) {
        return null;
    }

    const handleDismiss = (id: string) => {
        // Optimistically hide immediately
        setDismissedIds(prev => new Set(prev).add(id));
        // Then fire the API call in background
        dismissNotification(id);
    };

    return (
        <div className="space-y-2">
            {visibleNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Info;
                const styles = notificationStyles[notification.type] || defaultStyle;

                return (
                    <div
                        key={notification.id}
                        className={cn(
                            "flex items-start gap-3 rounded-lg p-3 pr-10 relative",
                            styles.container
                        )}
                    >
                        {/* Icon */}
                        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", styles.icon)} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm leading-snug">
                                {notification.title}
                            </p>
                            <p className="text-sm mt-0.5 leading-snug break-words">
                                {notification.message}
                                {notification.actionUrl && notification.actionLabel && (
                                    <a
                                        href={notification.actionUrl}
                                        className={cn("ml-2 text-sm whitespace-nowrap", styles.action)}
                                    >
                                        {notification.actionLabel}
                                    </a>
                                )}
                            </p>
                        </div>

                        {/* Close button — always top-right, clearly clickable */}
                        {notification.dismissible && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "absolute top-2 right-2 h-6 w-6 rounded-full p-0",
                                    styles.close
                                )}
                                onClick={() => handleDismiss(notification.id)}
                                aria-label="Dismiss notification"
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
