"use client";

import Link from "next/link";
import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  Clapperboard,
  MapPin,
  Package,
  ShieldAlert,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

import { useRecoveryPlan } from "@/src/lib/recoveryplancontext";

export default function ResourcesPage() {
  const { productionData, recoveryPlan, approved } = useRecoveryPlan();
  const crew = productionData?.crew ?? [];
  const equipment = productionData?.equipment ?? [];
  const resourceImpactItems = normalizeResourceImpact(
    recoveryPlan?.resource_impact
  );

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1">
          <header className="flex h-20 items-center justify-between border-b border-border bg-surface px-6 lg:px-10">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-secondary">
                Production command center
              </p>
              <h1 className="cinevora-heading text-xl">
                {productionData?.project_name || "Mountain Echoes"}
              </h1>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-sm text-text-secondary">
                System operational
              </span>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10 lg:py-10">
            <section className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-terracotta-tint px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-terracotta">
                  Production resources
                </span>
                <span className="text-xs text-text-secondary">
                  Crew & equipment intelligence
                </span>
              </div>

              <h2 className="cinevora-heading text-4xl leading-tight lg:text-6xl">
                Resources
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-text-secondary">
                Review crew and equipment assigned to this production, and how
                the current disruption affects their availability.
              </p>
            </section>

            {!productionData && <EmptyState />}

            {productionData && (
              <>
                <section className="mb-8 grid gap-4 md:grid-cols-2">
                  <SummaryCard
                    icon={Users}
                    label="Crew"
                    value={`${crew.length} group${crew.length === 1 ? "" : "s"}`}
                    detail="Assigned to this production"
                    tone="teal"
                  />

                  <SummaryCard
                    icon={Package}
                    label="Equipment"
                    value={`${equipment.length} item${equipment.length === 1 ? "" : "s"}`}
                    detail="Assigned to this production"
                    tone="warning"
                  />
                </section>

                <section className="mb-8">
                  <SectionHeading
                    eyebrow="Personnel"
                    title="Crew assignments"
                  />

                  {crew.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {crew.map((member, index) => (
                        <div
                          key={`${member.name}-${index}`}
                          className="flex items-center gap-4 rounded-[10px] border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(43,36,28,0.05)]"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] bg-teal-tint text-teal">
                            <Users size={19} strokeWidth={1.8} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary">
                              {member.name}
                            </p>
                            <p className="mt-0.5 text-xs text-text-secondary">
                              {member.role}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow text="No crew data available for this production." />
                  )}
                </section>

                <section className="mb-8">
                  <SectionHeading
                    eyebrow="Equipment"
                    title="Equipment assignments"
                  />

                  {equipment.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {equipment.map((item, index) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="flex items-center gap-4 rounded-[10px] border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(43,36,28,0.05)]"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] bg-warning-tint text-warning">
                            <Package size={19} strokeWidth={1.8} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-xs text-text-secondary">
                              Quantity: {item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow text="No equipment data available for this production." />
                  )}
                </section>

                <section className="mb-8 rounded-[10px] border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(43,36,28,0.06)] lg:p-7">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-terracotta-tint text-terracotta">
                      <Truck size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                        Recovery analysis
                      </p>
                      <h3 className="cinevora-heading mt-1 text-2xl">
                        Resource impact
                      </h3>
                    </div>
                  </div>

                  {!recoveryPlan ? (
                    <EmptyRow text="Generate a recovery decision from Overview to see how this disruption affects crew and equipment." />
                  ) : resourceImpactItems.length > 0 ? (
                    <div className="space-y-3">
                      {resourceImpactItems.map((text, index) => (
                        <div
                          key={index}
                          className="rounded-[9px] border border-border/70 bg-background-secondary p-4"
                        >
                          <div className="flex gap-3">
                            <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                            <p className="text-sm leading-6 text-text-secondary">
                              {text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow text="No resource impacts were returned by the recovery analysis." />
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
                        Resource changes require manager approval
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                        {recoveryPlan && approved
                        ? "This crew and equipment reassignment has been approved by the production manager and committed to the Cinevora workspace."
                        : "No crew or equipment reassignment is committed until the production manager explicitly approves the recovery plan."}
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
        No production data yet
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
        Generate a recovery decision from the Overview page to see crew and
        equipment assignments here.
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

function normalizeResourceImpact(items?: unknown[]): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const result: string[] = [];

  for (const item of items) {
    if (typeof item === "string" && item.trim()) {
      result.push(item);
      continue;
    }

    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const text =
        (typeof record.impact === "string" && record.impact) ||
        (typeof record.description === "string" && record.description) ||
        "";

      if (text) {
        result.push(text);
      }
    }
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
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  tone: "teal" | "warning";
}) {
  const styles = {
    teal: "bg-teal-tint text-teal",
    warning: "bg-warning-tint text-warning",
  };

  return (
    <div className="rounded-[10px] border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(43,36,28,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
            {label}
          </p>
          <p className="mt-3 text-xl font-semibold text-text-primary">
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
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      <nav className="flex-1 px-3 py-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
          Workspace
        </p>

        <div className="space-y-1">
          <NavItem href="/" icon={Activity} label="Overview" />
          <NavItem href="/schedule" icon={CalendarDays} label="Schedule" />
          <NavItem href="/resources" icon={Users} label="Resources" active />
          <NavItem href="/locations" icon={MapPin} label="Locations" />
          <NavItem href="/budget" icon={CircleDollarSign} label="Budget" />
        </div>
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-[8px] bg-background-secondary p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-terracotta" />
            <p className="text-xs font-medium text-text-primary">
              Production Manager
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-text-secondary">
            Final approval is required before resource changes are committed.
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
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