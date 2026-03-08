import {
  LayoutDashboard,
  Users,
  Activity,
  LogOut,
  Bot,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Activity Log", url: "/activity", icon: Activity },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarContent className="bg-gradient-to-b from-sidebar to-background">
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2.5 py-1">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow shrink-0">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              {!collapsed && (
                <span className="font-display font-bold text-gradient text-base tracking-tight">
                  SalesAgent AI
                </span>
              )}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-6">
            <SidebarMenu className="space-y-1">
              {items.map((item) => {
                const isActive = item.url === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`rounded-lg transition-all duration-200 hover:bg-primary/[0.06] ${
                          isActive
                            ? "bg-primary/[0.08] text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        activeClassName="bg-primary/[0.08] text-primary"
                      >
                        <item.icon className={`mr-2.5 h-4 w-4 transition-colors ${isActive ? "text-primary" : ""}`} />
                        {!collapsed && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/50 p-3">
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/[0.06] rounded-lg transition-all duration-200"
        >
          <LogOut className="mr-2.5 h-4 w-4" />
          {!collapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
