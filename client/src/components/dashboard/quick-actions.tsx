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
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 md:p-5 bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 rounded-lg sm:rounded-xl transition-colors cursor-pointer active:scale-95 touch-manipulation border border-primary/20">
                  <div className={cn(
                    "h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center mb-2 sm:mb-2",
                    action.iconBgColor
                  )}>
                    <i className={cn(action.icon, "text-base sm:text-lg md:text-xl", action.iconColor)}></i>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 text-center leading-tight">{action.label}</span>
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
                  <div className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg sm:rounded-xl transition-colors cursor-pointer active:scale-95 touch-manipulation">
                    <div className={cn(
                      "h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center mb-1 sm:mb-2",
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
