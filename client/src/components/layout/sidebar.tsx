import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/auth-context";
import { Leaf, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import logoPath from "@assets/Logo_1756709823475.png";

import type { SystemPermission } from "@shared/schema";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiredPermissions?: SystemPermission | SystemPermission[];
  roles?: ("master_admin" | "admin" | "employee")[];
  requiresApproval?: boolean;
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, hasPermission, hasRole, canApprove } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMd, setIsMd] = useState(false);
  
  // Remove legacy permission hook - now using enterprise RBAC

  // Handle responsive window resizing
  useEffect(() => {
    const handleResize = () => {
      setIsMd(window.innerWidth >= 768);
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define navigation items with enterprise RBAC permissions
  const navItems: NavItem[] = [
    { 
      href: "/dashboard", 
      label: "Dashboard", 
      icon: <i className="ri-dashboard-line mr-3 text-xl"></i>,
      requiredPermissions: "dashboard.view"
    },
    { 
      href: "/customers", 
      label: "Customers", 
      icon: <i className="ri-user-3-line mr-3 text-xl"></i>,
      requiredPermissions: ["customers.view", "customers.create"]
    },
    { 
      href: "/products", 
      label: "Products", 
      icon: <i className="ri-store-2-line mr-3 text-xl"></i>,
      requiredPermissions: ["products.view", "products.create"]
    },
    { 
      href: "/quotations", 
      label: "Quotations", 
      icon: <i className="ri-file-list-3-line mr-3 text-xl"></i>,
      requiredPermissions: ["quotations.view", "quotations.create"]
    },
    { 
      href: "/invoices", 
      label: "Invoices", 
      icon: <i className="ri-bill-line mr-3 text-xl"></i>,
      requiredPermissions: ["invoices.view", "invoices.create"]
    },
    { 
      href: "/attendance", 
      label: "Attendance", 
      icon: <i className="ri-time-line mr-3 text-xl"></i>,
      requiredPermissions: ["attendance.view_own", "attendance.view_team", "attendance.view_all"]
    },
    { 
      href: "/leave", 
      label: "Leave Management", 
      icon: <i className="ri-calendar-check-line mr-3 text-xl"></i>,
      requiredPermissions: ["leave.view_own", "leave.view_team", "leave.view_all"]
    },
    { 
      href: "/site-visit", 
      label: "Site Visit", 
      icon: <i className="ri-map-pin-line mr-3 text-xl"></i>,
      requiredPermissions: ["site_visit.view", "site_visit.create"]
    },
    { 
      href: "/site-visit-monitoring", 
      label: "Site Visit Monitoring", 
      icon: <i className="ri-dashboard-line mr-3 text-xl"></i>,
      roles: ["master_admin", "admin"],
      requiredPermissions: ["site_visit.view_all", "site_visit.reports"]
    },
    { 
      href: "/user-management", 
      label: "User Management", 
      icon: <i className="ri-user-settings-line mr-3 text-xl"></i>,
      roles: ["master_admin", "admin"],
      requiredPermissions: ["users.view", "users.create"]
    },
    { 
      href: "/hr-management", 
      label: "HR Management", 
      icon: <i className="ri-team-line mr-3 text-xl"></i>,
      roles: ["master_admin", "admin"],
      requiredPermissions: ["users.view"]
    },
    { 
      href: "/departments", 
      label: "Departments", 
      icon: <i className="ri-building-line mr-3 text-xl"></i>,
      roles: ["master_admin"],
      requiredPermissions: ["departments.view", "departments.create"]
    },
    { 
      href: "/attendance-management", 
      label: "Attendance Management", 
      icon: <i className="ri-shield-user-line mr-3 text-xl"></i>,
      roles: ["master_admin"]
    },
    { 
      href: "/payroll-management", 
      label: "Payroll Management", 
      icon: <i className="ri-money-dollar-circle-line mr-3 text-xl"></i>,
      roles: ["master_admin"]
    },
    { 
      href: "/office-locations", 
      label: "Office Locations", 
      icon: <i className="ri-map-pin-line mr-3 text-xl"></i>,
      roles: ["master_admin"],
      requiredPermissions: "system.settings"
    },
    { 
      href: "/settings", 
      label: "Settings", 
      icon: <i className="ri-settings-4-line mr-3 text-xl"></i>
    },
  ];

  // Filter items based on enterprise RBAC permissions
  const filteredNavItems = navItems.filter(item => {
    // Always show items with no restrictions
    if (!item.roles && !item.requiredPermissions && !item.requiresApproval) return true;
    
    // If no user, don't show restricted items
    if (!user) return false;
    
    // Check role-based access if specified
    if (item.roles && !hasRole(item.roles)) return false;
    
    // Check enterprise permissions
    if (item.requiredPermissions && !hasPermission(item.requiredPermissions)) return false;
    
    // Check approval permissions if required
    if (item.requiresApproval && !canApprove) return false;
    
    return true;
  });

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col bg-white border-r border-gray-200 h-full transition-all duration-300 ease-in-out",
        isCollapsed ? "md:w-[70px] lg:w-20" : "md:w-56 lg:w-64",
      )}
    >
      <div className="py-3 px-3 md:p-4 border-b border-gray-200 flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-2",
          isCollapsed ? "justify-center w-full" : "justify-center w-full"
        )}>
          <img 
            src={logoPath} 
            alt="Prakash Green Energy" 
            className={cn(
              "object-contain",
              isCollapsed ? "h-16 w-16" : "h-20 w-auto max-w-[280px]"
            )}
          />
        </div>
        {isMd && (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className={`${isCollapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'} text-lg`}></i>
          </button>
        )}
      </div>
      
      <div className="overflow-y-auto flex-grow p-1 md:p-2">
        <nav className={cn("space-y-0.5 md:space-y-1", isCollapsed && "flex flex-col items-center")}>
          {filteredNavItems.map((item, index) => (
            <Link 
              key={index} 
              href={item.href}
              className={cn(
                "sidebar-item flex items-center px-3 py-2.5 md:px-4 md:py-3 rounded-md hover:bg-gray-100 text-gray-700 transition-colors duration-200",
                isCollapsed && "justify-center px-2",
                location === item.href && "active bg-primary/10",
                !isCollapsed && location === item.href && "border-l-4 border-primary"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <div className={isCollapsed ? "mx-auto" : ""}>{item.icon}</div>
              {!isCollapsed && <span className="text-sm md:text-base truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className={cn(
        "p-3 md:p-4 border-t border-gray-200",
        isCollapsed && "flex justify-center"
      )}>
        {!isCollapsed ? (
          <div className="flex items-center">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "User"} 
                  className="h-9 w-9 md:h-10 md:w-10 rounded-full object-cover"
                />
              ) : (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="h-5 w-5 text-gray-500"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            <div className="ml-2 md:ml-3 min-w-0">
              <p className="font-medium text-xs md:text-sm truncate max-w-[80px] md:max-w-[100px] lg:max-w-none">
                {user?.displayName || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-[80px] md:max-w-[100px] lg:max-w-none">
                {user?.role === "master_admin" ? "Master Admin" : user?.role === "admin" ? "Admin" : "Employee"}
              </p>
            </div>
            <button 
              onClick={() => {
                import("@/lib/firebase").then(({ logoutUser }) => {
                  logoutUser().then(() => {
                    window.location.href = "/login";
                  });
                });
              }} 
              className="ml-auto text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => {
              import("@/lib/firebase").then(({ logoutUser }) => {
                logoutUser().then(() => {
                  window.location.href = "/login";
                });
              });
            }} 
            className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
