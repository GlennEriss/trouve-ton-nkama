import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, FileText, Mail, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type LegalSection = {
  id: string;
  title: string;
  description: ReactNode;
  bullets?: ReactNode[];
};

export type RelatedDocument = {
  href: string;
  label: string;
};

type LegalDocumentTemplateProps = {
  badge: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSection[];
  relatedDocuments?: RelatedDocument[];
  contactEmail?: string;
};

export default function LegalDocumentTemplate({
  badge,
  title,
  subtitle,
  updatedAt,
  sections,
  relatedDocuments = [],
  contactEmail,
}: Readonly<LegalDocumentTemplateProps>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#e6f5f3] via-white to-[#eef3f6]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-120px] h-80 w-80 rounded-full bg-[#1FA89B]/20 blur-3xl" />
        <div className="absolute bottom-0 left-[-100px] h-72 w-72 rounded-full bg-[#146B67]/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8 md:pt-14">
        <section className="rounded-3xl border border-[#146B67]/15 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(20,107,103,0.45)] backdrop-blur-sm md:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#146B67]/10 px-4 py-1.5 text-sm font-semibold text-[#146B67]">
            <ShieldCheck className="h-4 w-4" />
            {badge}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#1b3030] md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600 md:text-lg">{subtitle}</p>
          <p className="mt-4 text-sm font-medium text-slate-500">Dernière mise à jour: {updatedAt}</p>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Sommaire</h2>
            <nav className="mt-4 space-y-2">
              {sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-[#146B67]/10 hover:text-[#146B67]"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <span>{section.title}</span>
                </a>
              ))}
            </nav>

            {relatedDocuments.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700">Documents liés</h3>
                <div className="mt-2 space-y-1.5">
                  {relatedDocuments.map((doc) => (
                    <Link
                      key={doc.href}
                      href={doc.href}
                      className="inline-flex items-center gap-1 text-sm text-[#146B67] hover:underline"
                    >
                      {doc.label}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div className="space-y-4">
            {sections.map((section) => (
              <Card
                key={section.id}
                id={section.id}
                className="scroll-mt-28 border-slate-200/80 bg-white/95 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.35)]"
              >
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-[#1b3030]">{section.title}</h2>
                  <div className="mt-3 text-slate-700 leading-relaxed">{section.description}</div>

                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {section.bullets.map((bullet, index) => (
                        <li key={`${section.id}-bullet-${index}`} className="flex items-start gap-3 text-slate-700">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1FA89B]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}

            {contactEmail && (
              <Card className="border-[#146B67]/20 bg-[#f2faf8] shadow-none">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-3 text-[#174141]">
                    <Mail className="h-5 w-5 text-[#146B67]" />
                    <span className="font-semibold">Contact légal:</span>
                    <a href={`mailto:${contactEmail}`} className="text-[#146B67] hover:underline">
                      {contactEmail}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
          <FileText className="h-4 w-4" />
          <span>Ces informations sont publiées par Trouve Ton Nkama.</span>
        </div>
      </div>
    </div>
  );
}
