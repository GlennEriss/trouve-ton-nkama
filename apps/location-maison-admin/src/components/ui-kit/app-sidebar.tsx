"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  CopyCheck,
  DownloadCloud,
  Gift,
  Home,
  ListChecks,
  MapPinned,
  Megaphone,
  ScanSearch,
  Search,
  ShieldCheck,
  Shield,
  Tags,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Logo from "@trouve-ton-nkama/ui/logo";

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
  { href: "/dashboard/listing-claims", label: "Revendications annonces", icon: UserCheck },
  { href: "/dashboard/tags", label: "Tags annonces", icon: Tags },
  { href: "/dashboard/geolocation", label: "Géolocalisation", icon: MapPinned },
  { href: "/dashboard/social-import", label: "Import social", icon: ScanSearch },
  { href: "/dashboard/apify", label: "Apify", icon: DownloadCloud },
  { href: "/dashboard/listings", label: "Annonces", icon: ListChecks },
  { href: "/dashboard/moderation", label: "File de modération", icon: ShieldCheck },
  { href: "/dashboard/reels-moderation", label: "Modération réels", icon: Video },
  { href: "/dashboard/search-requests-moderation", label: "Demandes de recherche", icon: Search },
  { href: "/dashboard/listings/duplicates", label: "Doublons annonces", icon: CopyCheck },
  { href: "/dashboard/finance", label: "Finance crédits", icon: Wallet },
  { href: "/dashboard/gift-withdrawals", label: "Retraits cadeaux", icon: Gift },
  { href: "/dashboard/advertising", label: "Publicité", icon: Megaphone },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          {/* Fond teal foncé : le logo garde ses couleurs de marque comme sur le
              footer de la plateforme, et les textes passent sur les tokens
              sidebar (le text-primary d'origine était invisible ici). */}
          <Logo width="28px" height="28px" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-sidebar-accent-foreground">
              Trouve Ton Nkama
            </p>
            <p className="truncate text-sm text-sidebar-foreground/70">Espace administrateur</p>
          </div>
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
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 py-1 text-xs text-sidebar-foreground/60">Version Sprint 5</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
