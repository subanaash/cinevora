"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clapperboard,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";

import { useRecoveryPlan } from "@/src/lib/recoveryplancontext";

export default function BudgetPage() {
  const { productionData, recoveryPlan } = useRecoveryPlan();

  const budget = productionData?.budget;
  const budgetImpactItems = normalizeBudgetImpact(
    recoveryPlan?.budget_impact
  );

  const utilizationPct =
    budget && budget.total > 0
      ? Math.round((budget.spent / budget.total) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="flex-1">
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
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-sm text-text-secondary">
                System operational
              </span>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10 lg:py-10">
            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-text-secondary">
                Financial recovery
              </p>
              <h2 className="cinevora-heading text-4xl leading-tight lg:text-5xl">
                Production budget
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
                Evaluate available budget capacity and identify financial
                exposure introduced by the recovery plan.
              </p>
            </div>

            {!productionData && <EmptyState />}

            {productionData && budget && (
              <>
                <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Total budget"
                    value={formatCurrency(budget.total)}
                    detail="Approved production budget"
                    icon={CircleDollarSign}
                  />

                  <SummaryCard
                    label="Spent"
                    value={formatCurrency(budget.spent)}
                    detail="Current production spend"
                    icon={Activity}
                  />

                  <SummaryCard
                    label="Remaining"
                    value={formatCurrency(budget.remaining)}
                    detail="Available budget capacity"
                    icon={CircleDollarSign}
                    emphasis
                  />

                  <SummaryCard
                    label="Recovery status"
                    value={recoveryPlan ? "Analyzed" : "Under review"}
                    detail="Recovery costs not confirmed"
                    icon={AlertTriangle}
                    warning
                  />
                </section>

                <section className="mb-8 rounded-[8px] border border-terracotta bg-terracotta-tint p-6">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-terracotta text-white">
                      <AlertTriangle size={20} strokeWidth={1.8} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-terracotta">
                        Financial attention
                      </p>

                      <h3 className="cinevora-heading mt-2 text-2xl">
                        Recovery costs are not yet confirmed
                      </h3>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                        The production currently has {formatCurrency(budget.remaining)}{" "}
                        remaining. Alternative-location, transportation, and
                        production changes may introduce additional costs.
                        Cinevora does not treat these costs as confirmed
                        until supporting information is available.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="mb-8 rounded-[8px] border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(43,36,28,0.08)]">
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                      Budget position
                    </p>
                    <h3 className="cinevora-heading mt-1 text-2xl">
                      Current financial capacity
                    </h3>
                  </div>

                  <div>
                    <div className="mb-3 flex items-end justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          Budget utilized
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {formatCurrency(budget.spent)} of the approved{" "}
                          {formatCurrency(budget.total)} budget
                        </p>
                      </div>
                      <p className="text-2xl font-semibold text-text-primary">
                        {utilizationPct}%
                      </p>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-background-secondary">
                      <div
                        className="h-full rounded-full bg-terracotta transition-all"
                        style={{ width: `${utilizationPct}%` }}
                      />
                    </div>

                    <div className="mt-3 flex justify-between text-xs text-text-secondary">
                      <span>{formatCurrency(budget.spent)} spent</span>
                      <span>{formatCurrency(budget.remaining)} remaining</span>
                    </div>
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    <BudgetMetric
                      label="Approved"
                      value={formatCurrency(budget.total)}
                      detail="Total production budget"
                    />
                    <BudgetMetric
                      label="Spent"
                      value={formatCurrency(budget.spent)}
                      detail="Current production spend"
                    />
                    <BudgetMetric
                      label="Available"
                      value={formatCurrency(budget.remaining)}
                      detail="Remaining capacity"
                      highlight
                    />
                  </div>
                </section>

                <section>
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                      Recovery exposure
                    </p>
                    <h3 className="cinevora-heading mt-1 text-2xl">
                      Cost areas requiring review
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                      Cinevora has identified the following budget impacts
                      from the recovery analysis.
                    </p>
                  </div>

                  {!recoveryPlan ? (
                    <EmptyRow text="Generate a recovery decision from Overview to see budget impact analysis here." />
                  ) : budgetImpactItems.length > 0 ? (
                    <div className="overflow-hidden rounded-[8px] border border-border bg-surface shadow-[0_1px_3px_rgba(43,36,28,0.06)]">
                      {budgetImpactItems.map((text, index) => (
                        <div
                          key={index}
                          className="flex gap-3 border-b border-border px-5 py-4 last:border-b-0"
                        >
                          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                          <p className="text-sm leading-6 text-text-secondary">
                            {text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow text="No budget impacts were returned by the recovery analysis." />
                  )}
                </section>

                <section className="mt-8 rounded-[8px] border border-border bg-background-secondary p-5">
                  <div className="flex gap-3">
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-teal"
                      strokeWidth={1.8}
                    />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        Financial decision point
                      </p>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">
                        {formatCurrency(budget.remaining)} remains within the
                        approved production budget. Recovery costs are
                        currently unconfirmed, so location, transportation,
                        and operational changes should be verified before the
                        production manager approves the recovery plan.
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
        No budget data yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
        Generate a recovery decision from the Overview page to see budget
        capacity and recovery cost exposure here.
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

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

function normalizeBudgetImpact(items?: unknown[]): string[] {
  if (!Array.isArray(items)) return [];

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

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  emphasis = false,
  warning = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  emphasis?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={`cinevora-card p-5 ${emphasis ? "border-teal" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
            {label}
          </p>
          <p
            className={`mt-3 text-2xl font-semibold ${
              emphasis
                ? "text-teal"
                : warning
                ? "text-terracotta"
                : "text-text-primary"
            }`}
          >
            {value}
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {detail}
          </p>
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-[8px] ${
            warning
              ? "bg-terracotta-tint text-terracotta"
              : "bg-teal-tint text-teal"
          }`}
        >
          <Icon size={17} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}

function BudgetMetric({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[8px] p-4 ${
        highlight ? "border border-teal bg-teal-tint" : "bg-background-secondary"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
        {label}
      </p>
      <p
        className={`mt-2 text-xl font-semibold ${
          highlight ? "text-teal" : "text-text-primary"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-text-secondary">{detail}</p>
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
          <NavItem icon={Activity} label="Overview" href="/" />
          <NavItem icon={CalendarDays} label="Schedule" href="/schedule" />
          <NavItem icon={Users} label="Resources" href="/resources" />
          <NavItem icon={MapPin} label="Locations" href="/locations" />
          <NavItem icon={CircleDollarSign} label="Budget" href="/budget" active />
        </div>
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-[8px] bg-background-secondary p-4">
          <p className="text-xs font-medium text-text-primary">
            Production Manager
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Final approval required
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