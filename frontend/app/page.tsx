"use client";
import { RecoveryPlan, useRecoveryPlan } from "@/src/lib/recoveryplancontext";

import Link from "next/link";
import { useState } from "react";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clapperboard,
  CloudRain,
  FileCheck2,
  MapPin,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";

import { approveRecoveryPlan, generateRecoveryPlan } from "@/src/lib/api";

type ApprovalResult = {
  success?: boolean;
  project_name?: string;
  status?: string;
  approved_by?: string;
  approved_at?: string;

 execution?: {
  audit?: {
    action?: string;
    scenes_changed?: string[];
    location_change_committed?: boolean;
  };
};
};


const productionData = {
  project_name: "Mountain Echoes",

  scenes: [
    {
      scene_id: "SC23",
      description: "Exterior — Mountain Road",
      location: "Original Mountain Road",
      duration_hours: 4,
      indoor: false,
      priority: "high",
    },
  ],

  schedule: [
    {
      scene_id: "SC23",
      date: "2026-09-15",
      start_time: "08:00",
      end_time: "12:00",
    },
  ],

  original_location: {
    name: "Original Mountain Road",
    address: "Mountain production location",
    indoor: false,
  },

  crew: [
    {
      name: "Production Crew",
      role: "Film Crew",
    },
    {
      name: "Camera Team",
      role: "Camera",
    },
  ],

  equipment: [
    {
      name: "Camera Package",
      quantity: 1,
    },
    {
      name: "Outdoor Lighting",
      quantity: 1,
    },
  ],

  budget: {
    total: 100000,
    spent: 25000,
    remaining: 75000,
  },

  disruption: {
    type: "severe_weather",
    description:
    "Severe weather threatens the planned outdoor shooting schedule for SC23. A pre-scouted indoor soundstage (Riverside Studios, previously used during pre-production for this project) is available as a verified backup location, with confirmed availability on 2026-09-17. Crew and equipment have no other bookings for the following five days, giving ample flexibility to reschedule.",
    affected_date: "2026-09-15",
    severity: "high",
  },
  };

export default function Home() {
  const [loading, setLoading] = useState(false);
  const {
  recoveryPlan,
  approved,
  setRecoveryResult,
  setApproved,
} = useRecoveryPlan();

  const [error, setError] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const [revisionRequested, setRevisionRequested] = useState(false);
  const [executionResult, setExecutionResult] = useState<ApprovalResult | null>(null);

  async function handleApproveRecoveryPlan() {
    if (!recoveryPlan || approvalLoading) {
      return;
    }

    setApprovalLoading(true);
    setApprovalError("");

    try {
      const result = await approveRecoveryPlan({
        project_name: productionData.project_name,
        recovery_plan: recoveryPlan,
        approved_by: "Production Manager",
      });

      setExecutionResult(result);
      setApproved(true);
    } catch (err) {
      console.error(err);
      setApprovalError(
        err instanceof Error
          ? err.message
          : "Unable to commit the recovery decision."
      );
    } finally {
      setApprovalLoading(false);
    }
  }

  async function handleGenerateRecoveryPlan() {
  setLoading(true);
  setError("");
  setApproved(false);

  try {
    const result = await generateRecoveryPlan(productionData);

    const plan =
      result?.recovery_plan &&
      typeof result.recovery_plan === "object"
        ? result.recovery_plan
        : typeof result?.recovery_plan === "string"
          ? safeParsePlan(result.recovery_plan)
          : result;

    setRecoveryResult(productionData, plan as RecoveryPlan);
  } catch (err) {
    console.error(err);

    setError(
      "Unable to generate the recovery decision. Confirm that the FastAPI server is running and that the AI service is available."
    );
  } finally {
    setLoading(false);
  }
}

  const score = recoveryPlan?.score;

  const overallScore =
    typeof score?.overall === "number" ? score.overall : null;

  const recommendedLocation = getDisplayValue(
    recoveryPlan?.recommended_location
  );

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1">
          {}
          {}
          {}

          <header className="flex h-20 items-center justify-between border-b border-border bg-surface px-6 lg:px-10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                Production command center
              </p>

              <h1 className="cinevora-heading mt-1 text-xl">
                Mountain Echoes
              </h1>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-success opacity-30" />
                <span className="relative h-2 w-2 rounded-full bg-success" />
              </div>

              <span className="text-xs font-medium text-text-secondary">
                System operational
              </span>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10 lg:py-10">

            <section className="mb-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-4xl">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-terracotta-tint px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-terracotta">
                      Active production
                    </span>

                    <span className="rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
                      Recovery workspace
                    </span>
                  </div>

                  <h2 className="cinevora-heading text-4xl leading-[1.05] lg:text-6xl">
                    Production command center
                  </h2>

                  <p className="mt-5 max-w-3xl text-sm leading-7 text-text-secondary">
                    Monitor disruptions, coordinate specialist intelligence,
                    and turn production evidence into an actionable recovery
                    decision.
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 rounded-[10px] border border-border bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(43,36,28,0.05)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-success-tint">
                    <Activity size={16} className="text-success" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-text-primary">
                      Production monitored
                    </p>

                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      Decision workspace active
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8 overflow-hidden rounded-[12px] border border-terracotta/50 bg-terracotta-tint shadow-[0_2px_8px_rgba(196,98,45,0.06)]">
              <div className="p-6 lg:p-7">
                <div className="flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[9px] bg-terracotta text-white shadow-sm">
                      <CloudRain size={22} strokeWidth={1.8} />
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-terracotta">
                          Active disruption
                        </span>

                        <span className="rounded-full bg-terracotta px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
                          Severe weather
                        </span>

                        <span className="rounded-full border border-terracotta/30 bg-white/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-terracotta">
                          High severity
                        </span>
                      </div>

                      <h3 className="cinevora-heading text-2xl lg:text-3xl">
                        Outdoor production at risk
                      </h3>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                        Severe weather may make the planned outdoor locations
                        unsafe or unsuitable, affecting one scenes and its
                        associated production resources.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">

                        <ImpactPill
                          icon={CalendarDays}
                          text="1 scenes affected"
                        />

                        <ImpactPill
                          icon={MapPin}
                          text="1 outdoor locations"
                        />

                        <ImpactPill
                          icon={Users}
                          text="Crew & equipment impacted"
                        />

                        <ImpactPill
                          icon={CircleDollarSign}
                          text="$75K contingency"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateRecoveryPlan}
                    disabled={loading}
                    className="flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-[8px] bg-terracotta px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-terracotta-hover disabled:cursor-not-allowed disabled:opacity-60 xl:min-w-[230px]"
                  >
                    {loading ? (
                      <>
                        <Sparkles size={16} className="animate-pulse" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Generate recovery decision
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            <section className="mb-8 rounded-[12px] border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(43,36,28,0.05)] lg:p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-terracotta-tint">
                      <Sparkles size={14} className="text-terracotta" />
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                      Cinevora intelligence
                    </span>
                  </div>

                  <h3 className="cinevora-heading text-2xl lg:text-3xl">
                    {loading
                      ? "Agents are evaluating the disruption"
                      : recoveryPlan
                        ? "Recovery analysis complete"
                        : "Ready to analyze the disruption"}
                  </h3>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                    {loading
                      ? "Three specialist agents are evaluating schedule, resources, location, logistics, and financial impact before synthesis."
                      : recoveryPlan
                        ? "Specialist analysis has been synthesized into one production recovery recommendation."
                        : "Cinevora will evaluate the disruption across schedule continuity, resources, location, budget, operational risk, and weather resilience."}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 rounded-[9px] border border-border bg-background-secondary px-4 py-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      loading
                        ? "animate-pulse bg-terracotta"
                        : recoveryPlan
                          ? "bg-success"
                          : "bg-text-secondary"
                    }`}
                  />

                  <span className="text-xs font-semibold text-text-primary">
                    {loading
                      ? "Agents working"
                      : recoveryPlan
                        ? "Decision ready"
                        : "System ready"}
                  </span>
                </div>
              </div>

              <div className="mt-7 grid gap-3 border-t border-border pt-6 md:grid-cols-3">
                <AgentCard
                  icon={CalendarDays}
                  label="Scheduling Agent"
                  description="Schedule continuity"
                  status={
                    loading
                      ? "Analyzing"
                      : recoveryPlan
                        ? "Complete"
                        : "Ready"
                  }
                  active={loading}
                  complete={!!recoveryPlan && !loading}
                />

                <AgentCard
                  icon={Users}
                  label="Resource Agent"
                  description="Crew & logistics"
                  status={
                    loading
                      ? "Analyzing"
                      : recoveryPlan
                        ? "Complete"
                        : "Ready"
                  }
                  active={loading}
                  complete={!!recoveryPlan && !loading}
                />

                <AgentCard
                  icon={MapPin}
                  label="Location & Budget"
                  description="Location & financial impact"
                  status={
                    loading
                      ? "Researching"
                      : recoveryPlan
                        ? "Complete"
                        : "Ready"
                  }
                  active={loading}
                  complete={!!recoveryPlan && !loading}
                />
              </div>
            </section>

            {error && (
              <section className="mb-8 rounded-[10px] border border-terracotta/50 bg-terracotta-tint p-5">
                <div className="flex gap-3">
                  <AlertTriangle
                    size={19}
                    className="mt-0.5 shrink-0 text-terracotta"
                  />

                  <div>
                    <p className="text-sm font-semibold text-terracotta">
                      Recovery analysis failed
                    </p>

                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      {error}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {recoveryPlan && (
              <RecoveryCommandCenter
                plan={recoveryPlan}
                overallScore={overallScore}
                recommendedLocation={recommendedLocation}
                approved={approved}
                approvalLoading={approvalLoading}
                approvalError={approvalError}
                executionResult={executionResult}
                onApprove={handleApproveRecoveryPlan}
                revisionRequested={revisionRequested}
                onRequestRevision={() => setRevisionRequested(true)}
              />
            )}

            {!recoveryPlan && !loading && (
              <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatusCard
                  icon={CalendarDays}
                  label="Schedule"
                  value="At Risk"
                  detail="2 scenes affected"
                  tone="warning"
                />

                <StatusCard
                  icon={Users}
                  label="Resources"
                  value="Stable"
                  detail="Crew & equipment available"
                  tone="success"
                />

                <StatusCard
                  icon={MapPin}
                  label="Location"
                  value="Review Needed"
                  detail="Outdoor locations affected"
                  tone="terracotta"
                />

                <StatusCard
                  icon={CircleDollarSign}
                  label="Budget"
                  value="At Risk"
                  detail="$18,000 remaining"
                  tone="teal"
                />
              </section>
            )}

            <section className="mt-10">
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                  Production health
                </p>

                <h3 className="cinevora-heading mt-1 text-2xl">
                  Operational snapshot
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <HealthCard
                  label="Schedule"
                  value="1 scenes"
                  detail="Affected by weather"
                  icon={CalendarDays}
                  tone="warning"
                />

                <HealthCard
                  label="Crew"
                  value="Ready"
                  detail="2 personnel groups"
                  icon={Users}
                  tone="success"
                />

                <HealthCard
                  label="Locations"
                  value="1 affected"
                  detail="1 alternative under review"
                  icon={MapPin}
                  tone="terracotta"
                />

                <HealthCard
                  label="Budget"
                  value="$75K"
                  detail="Remaining contingency"
                  icon={CircleDollarSign}
                  tone="teal"
                />
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
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

            <p className="text-[10px] tracking-[0.12em] text-text-secondary">
              PRODUCTION INTELLIGENCE
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
          Workspace
        </p>

        <div className="space-y-1">
          <NavItem href="/" icon={Activity} label="Overview" active />

          <NavItem
            href="/schedule"
            icon={CalendarDays}
            label="Schedule"
          />

          <NavItem
            href="/resources"
            icon={Users}
            label="Resources"
          />

          <NavItem
            href="/locations"
            icon={MapPin}
            label="Locations"
          />

          <NavItem
            href="/budget"
            icon={CircleDollarSign}
            label="Budget"
          />
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

function ImpactPill({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-terracotta/20 bg-white/60 px-3 py-1.5">
      <Icon size={13} className="text-terracotta" />

      <span className="text-[10px] font-semibold text-text-secondary">
        {text}
      </span>
    </div>
  );
}

function AgentCard({
  icon: Icon,
  label,
  description,
  status,
  active,
  complete,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  status: string;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <div className="rounded-[9px] border border-border bg-background-secondary p-4 transition-colors hover:border-terracotta/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-surface">
            <Icon size={17} className="text-terracotta" />
          </div>

          <div>
            <p className="text-sm font-semibold text-text-primary">
              {label}
            </p>

            <p className="mt-0.5 text-[11px] text-text-secondary">
              {description}
            </p>
          </div>
        </div>

        <div
          className={`mt-1 h-2.5 w-2.5 rounded-full ${
            active
              ? "animate-pulse bg-terracotta"
              : complete
                ? "bg-success"
                : "bg-text-secondary"
          }`}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-secondary">
          Status
        </span>

        <span className="text-xs font-semibold text-text-primary">
          {status}
        </span>
      </div>
    </div>
  );
}

function RecoveryCommandCenter({
  plan,
  overallScore,
  recommendedLocation,
  approved,
  approvalLoading,
  approvalError,
  executionResult,
  onApprove,
  revisionRequested,
  onRequestRevision,
}: {
  plan: RecoveryPlan;
  overallScore: number | null;
  recommendedLocation: string;
  approved: boolean;
  approvalLoading: boolean;
  approvalError: string;
  executionResult: ApprovalResult | null;
  onApprove: () => void;
  revisionRequested: boolean;
  onRequestRevision: () => void;
}) {

  const scoreTone =
    overallScore === null
      ? "text-text-secondary"
      : overallScore >= 8
        ? "text-success"
        : overallScore >= 6
          ? "text-warning"
          : "text-terracotta";

  return (
    <section className="mb-8 space-y-5">

      <div className="overflow-hidden rounded-[12px] border border-border bg-surface shadow-[0_2px_10px_rgba(43,36,28,0.07)]">
        <div className="border-b border-border bg-background-secondary px-6 py-5 lg:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                Recovery decision
              </p>

              <h3 className="cinevora-heading mt-1 text-3xl">
                Cinevora recommendation
              </h3>
            </div>

            {approved ? (
              <div className="flex items-center gap-2 rounded-full bg-success-tint px-3 py-2">
                <CheckCircle2 size={15} className="text-success" />

                <span className="text-xs font-bold text-success">
                  Recovery approved
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full bg-warning-tint px-3 py-2">
                <ShieldAlert size={15} className="text-warning" />

                <span className="text-xs font-bold text-warning">
                  Approval required
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_250px]">
          <div className="p-6 lg:p-8">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-terracotta" />

              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-terracotta">
                Recommended recovery
              </p>
            </div>

            <h4 className="cinevora-heading max-w-4xl text-2xl leading-tight lg:text-3xl">
              {getDisplayValue(plan.recommended_recovery) ||
                "Recovery recommendation generated"}
            </h4>

            <p className="mt-5 max-w-4xl text-sm leading-7 text-text-secondary">
              {plan.decision_reasoning ||
                "Cinevora synthesized the specialist reports into a unified recovery decision."}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <DecisionDetail
                icon={MapPin}
                label="Location decision"
                value={recommendedLocation || "Not confirmed"}
              />

              <DecisionDetail
                icon={CalendarDays}
                label="Schedule action"
                value={
                  summarizeList(plan.updated_schedule) ||
                  "Review required"
                }
              />
            </div>
          </div>

          <div className="border-t border-border bg-background-secondary p-6 lg:border-l lg:border-t-0 lg:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary">
              Overall decision score
            </p>

            <div className="mt-4 flex items-end gap-2">
              <span className={`cinevora-heading text-5xl ${scoreTone}`}>
                {overallScore !== null ? overallScore.toFixed(1) : "—"}
              </span>

              <span className="mb-2 text-sm text-text-secondary">
                / 10
              </span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-terracotta transition-all duration-700"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, (overallScore ?? 0) * 10)
                  )}%`,
                }}
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-text-secondary">
              Composite assessment across schedule, location, resources,
              budget, operational risk, and weather resilience.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <ScorePanel score={plan.score} />

        <section className="rounded-[12px] border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(43,36,28,0.05)]">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
              Decision context
            </p>

            <h3 className="cinevora-heading mt-1 text-2xl">
              Current situation
            </h3>
          </div>

          <p className="text-sm leading-7 text-text-secondary">
            {plan.situation ||
              "The production is experiencing an active disruption requiring recovery planning."}
          </p>

          <div className="mt-6 rounded-[9px] border border-border bg-background-secondary p-4">
            <div className="flex gap-3">
              <ShieldAlert
                size={17}
                className="mt-0.5 shrink-0 text-terracotta"
              />

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                  Decision principle
                </p>

                <p className="mt-1 text-sm leading-6 text-text-primary">
                  Cinevora balances production continuity with crew safety,
                  location feasibility, resource availability, financial
                  exposure, and operational risk.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div>
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
            Impact analysis
          </p>

          <h3 className="cinevora-heading mt-1 text-2xl">
            What changes
          </h3>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <DetailListCard
            title="Schedule impact"
            eyebrow="Production continuity"
            icon={CalendarDays}
            items={plan.updated_schedule}
            empty="No schedule changes were returned."
          />

          <DetailListCard
            title="Resource impact"
            eyebrow="Crew & logistics"
            icon={Users}
            items={plan.resource_impact}
            empty="No resource impacts were returned."
          />

          <DetailListCard
            title="Budget impact"
            eyebrow="Financial exposure"
            icon={CircleDollarSign}
            items={plan.budget_impact}
            empty="No budget impacts were returned."
          />

          <DetailListCard
            title="Risks & assumptions"
            eyebrow="Uncertainty register"
            icon={ShieldAlert}
            items={plan.risks_and_assumptions}
            empty="No risks or assumptions were returned."
          />
        </div>
      </div>

      <EvidencePanel evidence={plan.evidence} />
      <CandidateStrategiesPanel strategies={plan.candidate_strategies} />

      <section className="overflow-hidden rounded-[12px] border border-border bg-surface shadow-[0_1px_3px_rgba(43,36,28,0.05)]">
        <div
          className={`h-1 ${
            approved ? "bg-success" : "bg-terracotta"
          }`}
        />

        <div className="p-6 lg:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-terracotta-tint">
                  <FileCheck2 size={16} className="text-terracotta" />
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                  Production manager
                </p>
              </div>

              <h3 className="cinevora-heading text-2xl">
                {approved
                  ? "Recovery decision committed"
                  : revisionRequested
                    ? "Revision requested — awaiting updated analysis"
                    : "Review and approve the recovery decision"}
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                {approved
                  ? "The production recovery decision has been committed to the Cinevora workspace."
                  : plan.approval ||
                    "This recovery plan requires explicit approval before production changes are committed."}
              </p>

              {approved && executionResult && (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <ExecutionDetail
                    label="Production status"
                    value="Recovery committed"
                  />
                  <ExecutionDetail
                    label="Approved by"
                    value={executionResult.approved_by || "Production Manager"}
                  />
                  <ExecutionDetail
                    label="Scenes updated"
                    value={
                    executionResult.execution?.audit?.scenes_changed?.length
                    ? executionResult.execution.audit.scenes_changed.join(", ")
                    : "No scenes changed"
                }
                  />
                </div>
              )}

              {approvalError && !approved && (
                <p className="mt-4 rounded-[8px] border border-terracotta/40 bg-terracotta-tint px-4 py-3 text-xs leading-5 text-terracotta">
                  {approvalError}
                </p>
              )}
            </div>

            {!approved && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={onApprove}
                  disabled={approvalLoading}
                  className="flex items-center justify-center gap-2 rounded-[8px] bg-terracotta px-5 py-3 text-sm font-semibold text-white transition hover:bg-terracotta-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  {approvalLoading ? "Committing recovery..." : "Approve recovery plan"}
                </button>

                <button
                  onClick={onRequestRevision}
                  className="rounded-[8px] border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-background-secondary"
                >
                  Request revision
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

function ExecutionDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[9px] border border-border bg-background-secondary p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary">
        {label}
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-text-primary">
        {value}
      </p>
    </div>
  );
}

function ScorePanel({
  score,
}: {
  score?: RecoveryPlan["score"];
}) {
  const dimensions = [
    {
      key: "schedule_continuity",
      label: "Schedule continuity",
    },
    {
      key: "location_suitability",
      label: "Location suitability",
    },
    {
      key: "resource_impact",
      label: "Resource impact",
    },
    {
      key: "budget_impact",
      label: "Budget impact",
    },
    {
      key: "operational_risk",
      label: "Operational risk",
    },
    {
      key: "weather_resilience",
      label: "Weather resilience",
    },
  ] as const;

  return (
    <section className="rounded-[12px] border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(43,36,28,0.05)]">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
          Decision scoring
        </p>

        <h3 className="cinevora-heading mt-1 text-2xl">
          Recovery evaluation
        </h3>

        <p className="mt-2 text-xs leading-5 text-text-secondary">
          Comparative assessment generated from the available production
          evidence.
        </p>
      </div>

      <div className="space-y-5">
        {dimensions.map((dimension) => {
          const value = score?.[dimension.key];

          return (
            <ScoreRow
              key={dimension.key}
              label={dimension.label}
              value={typeof value === "number" ? value : null}
            />
          );
        })}
      </div>
    </section>
  );
}

function ScoreRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const tone =
    value === null
      ? "bg-border"
      : value >= 8
        ? "bg-success"
        : value >= 6
          ? "bg-warning"
          : "bg-terracotta";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-text-primary">
          {label}
        </span>

        <span className="text-xs font-bold text-text-secondary">
          {value !== null ? `${value}/10` : "Unknown"}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-background-secondary">
        <div
          className={`h-full rounded-full transition-all duration-700 ${tone}`}
          style={{
            width:
              value !== null
                ? `${Math.max(0, Math.min(100, value * 10))}%`
                : "0%",
          }}
        />
      </div>
    </div>
  );
}

function DecisionDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[9px] border border-border bg-background-secondary p-4">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-terracotta" />

        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-secondary">
          {label}
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold leading-6 text-text-primary">
        {value}
      </p>
    </div>
  );
}

function DetailListCard({
  title,
  eyebrow,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  eyebrow: string;
  icon: React.ElementType;
  items?: unknown[];
  empty: string;
}) {
  const normalizedItems = normalizeList(items);

  return (
    <section className="rounded-[12px] border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(43,36,28,0.05)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
            {eyebrow}
          </p>

          <h3 className="cinevora-heading mt-1 text-2xl">
            {title}
          </h3>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-terracotta-tint">
          <Icon size={17} className="text-terracotta" />
        </div>
      </div>

      {normalizedItems.length > 0 ? (
        <div className="space-y-3">
          {normalizedItems.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-[9px] border border-border/70 bg-background-secondary p-4"
            >
              <div className="flex gap-3">
                <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />

                <p className="text-sm leading-6 text-text-secondary">
                  {item}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[9px] bg-background-secondary p-4 text-sm leading-6 text-text-secondary">
          {empty}
        </p>
      )}
    </section>
  );
}

function EvidencePanel({
  evidence,
}: {
  evidence?: unknown[];
}) {
  const normalizedEvidence = normalizeEvidence(evidence);

  return (
    <section className="rounded-[12px] border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(43,36,28,0.05)]">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
            Decision evidence
          </p>

          <h3 className="cinevora-heading mt-1 text-2xl">
            Why Cinevora reached this decision
          </h3>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-text-secondary">
            Key claims supporting the recommendation, with confidence and
            source context.
          </p>
        </div>

        <span className="rounded-full bg-background-secondary px-3 py-1.5 text-[10px] font-bold text-text-secondary">
          {normalizedEvidence.length} evidence{" "}
          {normalizedEvidence.length === 1 ? "item" : "items"}
        </span>
      </div>

      {normalizedEvidence.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {normalizedEvidence.map((item, index) => (
            <div
              key={`evidence-${index}`}
              className="rounded-[9px] border border-border bg-background-secondary p-4 transition-colors hover:border-terracotta/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-surface">
                    <FileCheck2
                      size={15}
                      className="text-terracotta"
                    />
                  </div>

                  <p className="text-sm font-semibold leading-6 text-text-primary">
                    {item.claim}
                  </p>
                </div>

                <ConfidenceBadge confidence={item.confidence} />
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                  Source
                </p>

                <p className="mt-1 break-words text-xs leading-5 text-text-secondary">
                  {item.source || "Source not specified"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[9px] bg-background-secondary p-5">
          <p className="text-sm leading-6 text-text-secondary">
            No structured evidence was returned by the recovery analysis.
          </p>
        </div>
      )}
    </section>
  );
}

function CandidateStrategiesPanel({
  strategies,
}: {
  strategies?: RecoveryPlan["candidate_strategies"];
}) {
  if (!strategies || strategies.length === 0) {
    return null;
  }

  const sorted = [...strategies].sort(
    (a, b) => (a.rank ?? 99) - (b.rank ?? 99)
  );

  return (
    <section className="rounded-[12px] border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(43,36,28,0.05)]">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
          Decision transparency
        </p>
        <h3 className="cinevora-heading mt-1 text-2xl">
          Alternatives considered
        </h3>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-text-secondary">
          Every candidate strategy Cinevora evaluated, including those
          rejected by the mandatory safety gate.
        </p>
      </div>

      <div className="space-y-3">
        {sorted.map((strategy) => {
          const isRejected = strategy.status === "REJECTED";
          const isSelected = strategy.status === "RECOMMENDED";

          return (
            <div
              key={strategy.strategy_id}
              className={`rounded-[9px] border p-4 ${
                isRejected
                  ? "border-terracotta/40 bg-terracotta-tint"
                  : isSelected
                    ? "border-success/40 bg-success-tint"
                    : "border-border bg-background-secondary"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">
                  {strategy.name || strategy.strategy_id}
                </p>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    isRejected
                      ? "bg-terracotta text-white"
                      : isSelected
                        ? "bg-success text-white"
                        : "bg-border text-text-secondary"
                  }`}
                >
                  {strategy.status || "Evaluated"}
                </span>
              </div>

              {strategy.description && (
                <p className="mt-2 text-xs leading-5 text-text-secondary">
                  {strategy.description}
                </p>
              )}

              {strategy.reason && (
                <p className="mt-2 text-xs italic leading-5 text-text-secondary">
                  {strategy.reason}
                </p>
              )}

              {typeof strategy.score?.overall === "number" && (
                <p className="mt-2 text-xs font-semibold text-text-secondary">
                  Score: {strategy.score.overall}/10
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence?: string;
}) {
  const normalized = confidence?.toLowerCase();

  const className =
    normalized === "high"
      ? "bg-success-tint text-success"
      : normalized === "medium"
        ? "bg-warning-tint text-warning"
        : "bg-background-secondary text-text-secondary";

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${className}`}
    >
      {confidence || "Unknown"}
    </span>
  );
}

function StatusCard({
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
  tone: "warning" | "success" | "terracotta" | "teal";
}) {
  const styles = {
    warning: "bg-warning-tint text-warning",
    success: "bg-success-tint text-success",
    terracotta: "bg-terracotta-tint text-terracotta",
    teal: "bg-teal-tint text-teal",
  };

  return (
    <div className="cinevora-card p-5 transition-transform hover:-translate-y-[1px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary">
            {label}
          </p>

          <p className="mt-3 text-lg font-bold text-text-primary">
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

function HealthCard({
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
  tone: "warning" | "success" | "terracotta" | "teal";
}) {
  const styles = {
    warning: "bg-warning-tint text-warning",
    success: "bg-success-tint text-success",
    terracotta: "bg-terracotta-tint text-terracotta",
    teal: "bg-teal-tint text-teal",
  };

  return (
    <div className="rounded-[10px] border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(43,36,28,0.05)]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary">
          {label}
        </p>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-[7px] ${styles[tone]}`}
        >
          <Icon size={15} />
        </div>
      </div>

      <p className="mt-4 text-xl font-bold text-text-primary">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-text-secondary">
        {detail}
      </p>
    </div>
  );
}

function normalizeList(items?: unknown[]): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item === null || item === undefined) {
        return "";
      }

      if (typeof item === "object") {
        const record = item as Record<string, unknown>;
        if (
          typeof record.scene_id === "string" &&
          typeof record.action === "string"
        ) {
          const datePart =
            typeof record.recommended_date === "string" &&
            record.recommended_date
              ? ` (New date: ${record.recommended_date})`
              : "";

          return `${record.scene_id} — ${record.action}${datePart}`;
        }

        if (typeof record.description === "string") {
          return record.description;
        }

        if (typeof record.reason === "string") {
          return record.reason;
        }

        if (typeof record.action === "string") {
          return record.action;
        }

        if (typeof record.name === "string") {
          return record.name;
        }

        return Object.entries(record)
          .map(([key, value]) => {
            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
            ) {
              return `${formatKey(key)}: ${value}`;
            }

            return "";
          })
          .filter(Boolean)
          .join(" · ");
      }

      return String(item);
    })
    .filter(Boolean);
}

function normalizeEvidence(items?: unknown[]) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    if (typeof item === "string") {
      return {
        claim: item,
        source: "",
        confidence: "unknown",
      };
    }

    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;

      return {
        claim:
          typeof record.claim === "string"
            ? record.claim
            : typeof record.description === "string"
              ? record.description
              : typeof record.name === "string"
                ? record.name
                : "Evidence item",

        source:
          typeof record.source === "string"
            ? record.source
            : typeof record.source_type === "string"
              ? record.source_type
              : "",

        confidence:
          typeof record.confidence === "string"
            ? record.confidence
            : "unknown",
      };
    }

    return {
      claim: String(item),
      source: "",
      confidence: "unknown",
    };
  });
}

function summarizeList(items?: unknown[]): string {
  const normalized = normalizeList(items);

  if (normalized.length === 0) {
    return "";
  }

  if (normalized.length === 1) {
    return normalized[0];
  }

  return `${normalized.length} recovery actions`;
}

function getDisplayValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.name === "string") {
      return record.name;
    }

    if (typeof record.location === "string") {
      return record.location;
    }

    if (typeof record.description === "string") {
      return record.description;
    }

    return "Review recommended location";
  }

  return "";
}

function formatKey(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeParsePlan(value: string): RecoveryPlan {
  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object") {
      return parsed as RecoveryPlan;
    }

    return {
      recommended_recovery: value,
    };
  } catch {
    return {
      recommended_recovery: value,
    };
  }
}