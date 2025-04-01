import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  CalendarDays,
  LineChart,
  Settings,
  TrendingUp,
  UserCircle,
  HelpCircle,
  FileText,
} from "lucide-react";

interface SidebarProps {
  appMode: 'sales' | 'club';
}

export function Sidebar({ appMode = 'sales' }: SidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;

  // Club Navigation
  const clubNav = [
    {
      title: "Menu Principal",
      links: [
        {
          title: "Dashboard",
          href: "/club",
          icon: Home,
          active: pathname === "/club",
        },
        {
          title: "Documentos",
          href: "/club/documents",
          icon: FileText,
          active: pathname.includes("/documents"),
        },
        {
          title: "Sócios",
          href: "/members/list",
          icon: Users,
          active: pathname.includes("/members"),
        },
        {
          title: "Jogos",
          href: "/games",
          icon: CalendarDays,
          active: pathname.includes("/game") || pathname === "/games",
        },
        {
          title: "Finanças",
          href: "/finances",
          icon: TrendingUp,
          active: pathname.includes("/financ") || pathname.includes("/monthly-fees") || pathname.includes("/chart-of-accounts") || pathname.includes("/bank-accounts"),
        },
        {
          title: "Relatórios",
          href: "/financial-statement",
          icon: LineChart,
          active: pathname.includes("/statement") || pathname.includes("/statistics"),
        },
        {
          title: "Configurações",
          href: "/settings",
          icon: Settings,
          active: pathname === "/settings",
        },
        {
          title: "Manual de Uso",
          href: "/club/user-guide",
          icon: HelpCircle,
          active: pathname === "/club/user-guide",
        },
      ],
    },
  ];

  // Sales Navigation
  const salesNav = [
    {
      title: "Menu Principal",
      links: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: Home,
          active: pathname === "/dashboard",
        },
        {
          title: "Clientes",
          href: "/customers",
          icon: Users,
          active: pathname === "/customers",
        },
        {
          title: "Vendas",
          href: "/sales",
          icon: TrendingUp,
          active: pathname === "/sales",
        },
        {
          title: "Configurações",
          href: "/admin-settings",
          icon: Settings,
          active: pathname === "/admin-settings",
        },
        {
          title: "Planos",
          href: "/plan-config",
          icon: LineChart,
          active: pathname === "/plan-config",
        },
        {
          title: "Manual de Uso",
          href: "/user-guide",
          icon: HelpCircle,
          active: pathname === "/user-guide",
        },
      ],
    },
  ];

  // Determine which navigation to use
  const navigation = appMode === 'club' ? clubNav : salesNav;

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          {appMode === 'club' ? (
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              FutConnect
            </h2>
          ) : (
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Admin Panel
            </h2>
          )}
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start px-2">
              <Link to="/member-portal" className="flex items-center gap-2 w-full">
                <UserCircle className="mr-2 h-4 w-4" />
                Portal do Sócio
              </Link>
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-200px)]">
          {navigation.map((group, i) => (
            <div key={i} className="px-3 py-2">
              {group.title && (
                <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-gray-500 uppercase">
                  {group.title}
                </h2>
              )}
              <div className="space-y-1">
                {group.links.map((link, j) => (
                  <Button
                    key={j}
                    variant={link.active ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      link.active ? "bg-futconnect-50 text-futconnect-600 hover:bg-futconnect-100 hover:text-futconnect-700" : ""
                    )}
                    asChild
                  >
                    <Link to={link.href}>
                      {link.icon && <link.icon className="mr-2 h-4 w-4" />}
                      {link.title}
                    </Link>
                  </Button>
                ))}
              </div>
              {i < navigation.length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </ScrollArea>
      </div>
    </div>
  );
}
