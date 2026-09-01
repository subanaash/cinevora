"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Clapperboard,
  CloudRain,
  FileCheck2,
  MapPin,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";

import { useRecoveryPlan } from "@/src/lib/recoveryplancontext";

export default function LocationsPage() {
  const { productionData, recoveryPlan } = useRecoveryPlan();

  const scenes = productionData?.scenes ?? [];
  const originalLocationName = productionData?.original_location?.name;
  const recommendedLocation = getRecommendedLocation(
    recoveryPlan?.recommended_location
  );
  const evidence = normalizeEvidence(recoveryPlan?.evidence);

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-border bg-surface px-6 lg:px-10">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-secondary">
                Production
              </p>
              <h1 className="cinevora-heading text-xl">
                {productionData?.project_name || "Mountain Echoes"}
              </h1>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-sm text-text-secondary">
                System operational
              </span>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10 lg:py-10">
            <section className="mb-8">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-terracotta-tint px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-terracotta">
                  Location intelligence
                </span>
                <span className="text-xs text-text-secondary">
                  Recovery workspace
                </span>
              </div>

              <h2 className="cinevora-heading text-4xl leading-tight lg:text-6xl">
                Locations
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-text-secondary">
                Evaluate disrupted filming locations and candidate
                alternatives using operational constraints before a recovery
                decision is committed.
              </p>
            </section>

            {!productionData && <EmptyState />}

            {productionData && (
              <>
                <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <SummaryCard
                    label="Affected"
                    value={String(scenes.length)}
                    detail="Original outdoor locations"
                    icon={AlertTriangle}
                    tone="risk"
                  />

                  <SummaryCard
                    label="Candidate"
                    value={recommendedLocation ? "1" : "0"}
                    detail={
                      recommendedLocation
                        ? "Alternative identified"
                        : "None identified yet"
                    }
                    icon={MapPin}
                    tone="teal"
                  />

                  <SummaryCard
                    label="Decision"
                    value={recoveryPlan ? "Generated" : "Pending"}
                    detail="Evidence verification required"
                    icon={FileCheck2}
                    tone="warning"
                  />
                </section>

                <section className="mb-8">
                  <SectionHeading
                    eyebrow="Original locations"
                    title="Locations affected by the disruption"
                  />

                  <div className="grid gap-4 lg:grid-cols-2">
                    {scenes.map((scene) => (
                      <article
                        key={scene.scene_id}
                        className="rounded-[10px] border border-terracotta/30 bg-surface p-5 shadow-[0_1px_3px_rgba(43,36,28,0.05)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-terracotta-tint text-terracotta">
                            <AlertTriangle size={19} strokeWidth={1.8} />
                          </div>
                          <span className="rounded-full bg-terracotta-tint px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-terracotta">
                            Weather risk
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                            Original location
                          </span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                            {scene.scene_id}
                          </span>
                        </div>

                        <h4 className="cinevora-heading mt-2 text-xl leading-tight">
                          {scene.location}
                        </h4>

                        <p className="mt-3 text-sm leading-6 text-text-secondary">
                          {scene.description}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="mb-8 overflow-hidden rounded-[10px] border border-border bg-surface shadow-[0_1px_3px_rgba(43,36,28,0.06)]">
                  <div className="border-b border-border px-6 py-5 lg:px-7">
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-terracotta" />
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                        Recovery analysis
                      </p>
                    </div>
                    <h3 className="cinevora-heading mt-1 text-2xl">
                      Recommended alternative location
                    </h3>
                  </div>

                  <div className="p-6 lg:p-7">
                    {!recoveryPlan ? (
                      <EmptyRow text="Generate a recovery decision from Overview to see recommended alternative locations here." />
                    ) : recommendedLocation ? (
                      <>
                        <div className="flex gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-teal-tint text-teal">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary">
                              {recommendedLocation.name}
                            </p>
                            {recommendedLocation.reason && (
                              <p className="mt-1 text-xs text-text-secondary">
                                {recommendedLocation.reason}
                              </p>
                            )}
                          </div>
                        </div>

                        <p className="mt-5 max-w-3xl text-sm leading-7 text-text-secondary">
                          This candidate is not confirmed. Cinevora requires
                          operational verification before it can be
                          recommended as the final production location.
                        </p>
                      </>
                    ) : (
                      <EmptyRow text="No specific alternative location was recommended - the recovery analysis did not have enough verified evidence to name one." />
                    )}
                  </div>
                </section>

                <section className="mb-8 rounded-[10px] border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(43,36,28,0.06)] lg:p-7">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-teal-tint text-teal">
                      <FileCheck2 size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                        Decision evidence
                      </p>
                      <h3 className="cinevora-heading mt-1 text-2xl">
                        Location-related evidence
                      </h3>
                    </div>
                  </div>

                  {evidence.length > 0 ? (
                    <div className="space-y-3">
                      {evidence.map((item, index) => (
                        <div
                          key={index}
                          className="rounded-[9px] border border-border/70 bg-background-secondary p-4"
                        >
                          <p className="text-sm leading-6 text-text-secondary">
                            {item.claim}
                          </p>
                          {item.source && (
                            <p className="mt-1 text-xs text-text-secondary">
                              Source: {item.source}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow text="No location-related evidence was returned by the recovery analysis." />
                  )}
                </section>

                <section className="rounded-[10px] border border-border bg-background-secondary p-6 lg:p-7">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-surface">
                      <ShieldAlert size={19} className="text-terracotta" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                        Production control
                      </p>
                      <h3 className="cinevora-heading mt-1 text-xl lg:text-2xl">
                        Location changes require manager approval
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                        Do not commit an alternative location until
                        availability, permits, cost, access, and weather
                        resilience are confirmed by the production manager.
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <section className="mb-8 rounded-[10px] border border-border bg-surface p-8 text-center shadow-[0_1px_3px_rgba(43,36,28,0.06)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[10px] bg-terracotta-tint">
        <Sparkles size={22} className="text-terracotta" />
      </div>
      <h3 className="cinevora-heading mt-4 text-2xl">
        No location data yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
        Generate a recovery decision from the Overview page to see affected
        locations and candidate alternatives here.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-2 rounded-[8px] bg-terracotta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-terracotta-hover"
      >
        Go to Overview
      </Link>
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-[9px] bg-background-secondary p-4 text-sm leading-6 text-text-secondary">
      {text}
    </p>
  );
}

function getRecommendedLocation(
  value: unknown
): { name: string; reason?: string } | null {
  if (!value) return null;

  if (typeof value === "string") {
    return { name: value };
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : null;
    if (!name) return null;

    return {
      name,
      reason: typeof record.reason === "string" ? record.reason : undefined,
    };
  }

  return null;
}

function normalizeEvidence(
  items?: unknown[]
): { claim: string; source: string | null }[] {
  if (!Array.isArray(items)) return [];

  const result: { claim: string; source: string | null }[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;

    const claim = typeof record.claim === "string" ? record.claim : null;
    if (!claim) continue;

    const claimLower = claim.toLowerCase();
    const isLocationRelated =
      claimLower.includes("location") ||
      claimLower.includes("permit") ||
      claimLower.includes("studio") ||
      claimLower.includes("facility") ||
      claimLower.includes("indoor") ||
      claimLower.includes("outdoor");

    if (!isLocationRelated) continue;

    result.push({
      claim,
      source: typeof record.source === "string" ? record.source : null,
    });
  }

  return result;
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
        {eyebrow}
      </p>
      <h3 className="cinevora-heading mt-1 text-2xl lg:text-3xl">{title}</h3>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  tone: "risk" | "teal" | "warning";
}) {
  const styles = {
    risk: "bg-terracotta-tint text-terracotta",
    teal: "bg-teal-tint text-teal",
    warning: "bg-warning-tint text-warning",
  };

  return (
    <div className="cinevora-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold text-text-primary">
            {value}
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {detail}
          </p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${styles[tone]}`}
        >
          <Icon size={17} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
      <div className="flex h-20 items-center border-b border-border px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Cinevora home">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-terracotta text-white">
            <Clapperboard size={19} strokeWidth={1.8} />
          </div>
          <div>
            <p className="font-semibold tracking-wide text-text-primary">
              CINEVORA
            </p>
            <p className="text-[11px] tracking-[0.12em] text-text-secondary">
              PRODUCTION INTELLIGENCE
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
          Workspace
        </p>

        <div className="space-y-1">
          <NavItem icon={Activity} label="Overview" href="/" />
          <NavItem icon={CalendarDays} label="Schedule" href="/schedule" />
          <NavItem icon={Users} label="Resources" href="/resources" />
          <NavItem icon={MapPin} label="Locations" href="/locations" active />
          <NavItem icon={CircleDollarSign} label="Budget" href="/budget" />
        </div>
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-[8px] bg-background-secondary p-4">
          <div className="flex items-center gap-2">
            <FileCheck2 size={15} className="text-terracotta" />
            <p className="text-xs font-medium text-text-primary">
              Production Manager
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-text-secondary">
            Final approval is required before recovery changes are committed.
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-terracotta-tint text-terracotta"
          : "text-text-secondary hover:bg-background-secondary hover:text-text-primary"
      }`}
    >
      <Icon size={18} strokeWidth={1.8} />
      {label}
    </Link>
  );
}