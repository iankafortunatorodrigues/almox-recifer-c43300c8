import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  BookMarked,
  Building2,
  FileText,
  ShoppingCart,
  BarChart3,
  Users,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import logo from "@/assets/logo.jpg";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Materiais", url: "/materials", icon: Package },
  { title: "Movimentações", url: "/movements", icon: ArrowLeftRight },
  { title: "Empréstimos", url: "/loans", icon: BookMarked },
  { title: "Consumíveis", url: "/consumables", icon: Package },
  { title: "Compras", url: "/purchases", icon: ShoppingCart, roles: ["admin", "compras", "almoxarife"] },
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
  { title: "Configurações", url: "/settings", icon: Users, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role } = useUserRole();

  const isActive = (path: string) => location.pathname === path;

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(role || "");
  });

  const userName = user?.email?.split("@")[0] || "Usuário";
  const roleLabel = role === "admin" ? "Administrador" : 
                    role === "compras" ? "Compras" : 
                    role === "diretor" ? "Diretor" : 
                    role === "almoxarife" ? "Almoxarife" : "";

  return (
    <Sidebar className="border-r-0" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Package className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">Almoxarifado</span>
          )}
          <SidebarTrigger className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent">
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </SidebarTrigger>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={`
                      transition-colors
                      ${isActive(item.url) 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }
                    `}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent">
            <span className="text-sm font-medium text-sidebar-accent-foreground">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
              <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
            </div>
          )}
        </div>
        <SidebarMenu className="mt-3">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Sair"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
