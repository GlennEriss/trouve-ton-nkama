"use client";

import Link from "next/link";
import { Activity, BarChart3, Building2, Home, Shield, TrendingUp, Users } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: Home },
  { href: "/dashboard/analytics/searches", label: "Analytics recherches", icon: BarChart3 },
  { href: "/dashboard/analytics/traffic", label: "Analytics visites", icon: Activity },
  { href: "/dashboard/analytics/presence", label: "Analytics présence", icon: Users },
  { href: "/dashboard/analytics/ads", label: "Analytics monétisation", icon: TrendingUp },
  { href: "/dashboard/admins", label: "Administrateurs", icon: Shield },
  { href: "/dashboard/users", label: "Utilisateurs", icon: Users },
  { href: "/dashboard/announcers", label: "Annonceurs", icon: Building2 },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="px-2 py-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
            Trouve Ton Nkama
          </p>
          <p className="text-sm text-muted-foreground">Espace administrateur</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 py-1 text-xs text-muted-foreground">Version Sprint 3</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
