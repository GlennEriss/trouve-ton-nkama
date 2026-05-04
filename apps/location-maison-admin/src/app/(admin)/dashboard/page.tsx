import { Activity, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui-kit/kpi-card";
import { PageHeader } from "@/components/ui-kit/page-header";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vue d'ensemble"
        description="Socle IAM en place. Le Sprint 2 active la gestion opérationnelle des admins."
        actions={<Button size="sm">Exporter</Button>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Admins en ligne"
          value="--"
          helper="Connexion de la présence admin (Sprint 2)"
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          label="Recherches sur 7 jours"
          value="--"
          helper="Connexion de l'analytics de recherche (Sprint 6)"
          icon={<Search className="h-4 w-4" />}
        />
        <KpiCard
          label="Visites de la plateforme"
          value="--"
          helper="Connexion de Firebase/Vercel (Sprint 6)"
          icon={<Activity className="h-4 w-4" />}
        />
      </section>
    </div>
  );
}
