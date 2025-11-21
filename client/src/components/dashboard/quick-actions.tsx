import { Link } from "wouter";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  href: string;
  onClick?: () => void;
  category?: "primary" | "secondary";
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
}

export function QuickActions({ actions, title = "Quick Actions" }: QuickActionsProps) {
  const primaryActions = actions.filter(a => a.category !== "secondary");
  const secondaryActions = actions.filter(a => a.category === "secondary");

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4 sm:p-5 md:p-6">
        <CardTitle className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">{title}</CardTitle>
        
        {/* Primary Actions */}
        <div className="mb-6">
          <p className="text-xs uppercase font-semibold text-foreground/50 mb-3">Essential</p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {primaryActions.map((action) => (
              <Link 
                key={action.id} 
                href={action.href}
                onClick={action.onClick}
              >
                <div className="flex flex-col items-center justify-center p-4 sm:p-5 md:p-6 bg-white hover:bg-gray-50 rounded-lg sm:rounded-xl transition-colors cursor-pointer active:scale-95 touch-manipulation border border-gray-200 hover:border-gray-300 hover:shadow-sm">
                  <div className={cn(
                    "h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center mb-2 sm:mb-3",
                    action.iconBgColor
                  )}>
                    <i className={cn(action.icon, "text-lg sm:text-xl md:text-2xl", action.iconColor)}></i>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 text-center leading-tight">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Secondary Actions */}
        {secondaryActions.length > 0 && (
          <div>
            <p className="text-xs uppercase font-semibold text-foreground/50 mb-3">More</p>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {secondaryActions.map((action) => (
                <Link 
                  key={action.id} 
                  href={action.href}
                  onClick={action.onClick}
                >
                  <div className="flex flex-col items-center justify-center p-3 sm:p-4 md:p-5 bg-white hover:bg-gray-50 rounded-lg sm:rounded-xl transition-colors cursor-pointer active:scale-95 touch-manipulation border border-gray-200 hover:border-gray-300 hover:shadow-sm">
                    <div className={cn(
                      "h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full flex items-center justify-center mb-2",
                      action.iconBgColor
                    )}>
                      <i className={cn(action.icon, "text-base sm:text-lg md:text-xl", action.iconColor)}></i>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-700 text-center leading-tight">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
