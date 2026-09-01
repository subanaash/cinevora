"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clapperboard,
  Clock3,
  MapPin,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";

import { useRecoveryPlan } from "@/src/lib/recoveryplancontext";

export default function SchedulePage() {
  const { productionData, recoveryPlan, approved } = useRecoveryPlan();

  const scenes = productionData?.scenes ?? [];

  const scheduleByScene = new Map(
    (productionData?.schedule ?? []).map((item) => [
      item.scene_id,
      item,
    ])
  );

  const updatedScheduleEntries = normalizeUpdatedSchedule(
    recoveryPlan?.updated_schedule
  );

  const totalHours = scenes.reduce(
    (sum, scene) => sum + (scene.duration_hours ?? 0),
    0
  );

  const disruption = productionData?.disruption;

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
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-full bg-terracotta-tint px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-terracotta">
                      Production planning
                    </span>
                    <span className="text-xs text-text-secondary">
                      Schedule intelligence
                    </span>
                  </div>

                  <h2 className="cinevora-heading text-4xl leading-tight lg:text-6xl">
                    Schedule
                  </h2>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-text-secondary">
                    Review affected scenes, understand schedule exposure, and
                    prepare recovery actions using Cinevora&apos;s production
                    intelligence.
                  </p>
                </div>

                {scenes.length > 0 && (
                  <div className="flex items-center gap-3 rounded-[10px] border border-border bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(43,36,28,0.06)]">
                    <CalendarDays size={17} className="text-terracotta" />
                    <div>
                      <p className="text-xs font-semibold text-text-primary">
                        {scenes.length} scene{scenes.length === 1 ? "" : "s"} affected
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        {totalHours} hours of scheduled production
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {!productionData && (
              <EmptyState />
            )}

            {productionData && disruption && (
              <>
                <section className="mb-8 overflow-hidden rounded-[10px] border border-terracotta bg-terracotta-tint">
                  <div className="flex flex-col gap-5 p-6 lg:p-7 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] bg-terracotta text-white">
                        <AlertTriangle size={21} strokeWidth={1.8} />
                      </div>

                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-terracotta">
                            Schedule disruption
                          </span>
                          <span className="rounded-full bg-terracotta px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                            {disruption.severity} severity
                          </span>
                        </div>

                        <h3 className="cinevora-heading text-2xl lg:text-3xl">
                          Outdoor production schedule at risk
                        </h3>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                          {disruption.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <MetricPill value={String(scenes.length)} label="Scenes" />
                      <MetricPill value={`${totalHours}h`} label="Production" />
                    </div>
                  </div>
                </section>

                <section className="mb-8 grid gap-4 md:grid-cols-3">
                  <SummaryCard
                    icon={CalendarDays}
                    label="Schedule status"
                    value="At risk"
                    detail="Outdoor scenes affected"
                    tone="terracotta"
                  />

                  <SummaryCard
                    icon={Clock3}
                    label="Production exposure"
                    value={`${totalHours} hours`}
                    detail="Scheduled shooting time"
                    tone="warning"
                  />

                  <SummaryCard
                    icon={ShieldAlert}
                    label="Recovery state"
                    value={
                      recoveryPlan ? "Decision generated" : "Pending decision"
                    }
                    detail={
                      recoveryPlan
                        ? "Review the recovery plan below"
                        : "Generate a recovery decision from Overview"
                    }
                    tone="teal"
                  />
                </section>

                <section className="mb-8">
                  <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                        Shooting schedule
                      </p>
                      <h3 className="cinevora-heading mt-1 text-2xl lg:text-3xl">
                        Affected scenes
                      </h3>
                    </div>
                    <span className="text-xs text-text-secondary">
                      Recovery priority shown per scene
                    </span>
                  </div>

                  <div className="space-y-4">
                    {scenes.map((scene, index) => (
                      <SceneCard
                        key={scene.scene_id}
                        scene={scene}
                        scheduleItem={scheduleByScene.get(scene.scene_id)}
                        recoveryAction={updatedScheduleEntries.find(
                          (entry) => entry.scene_id === scene.scene_id
                        )}
                        highPriority={index === 0}
                      />
                    ))}
                  </div>
                </section>

                {recoveryPlan && (
                  <section className="mb-8 rounded-[10px] border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(43,36,28,0.06)] lg:p-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] bg-teal-tint text-teal">
                          <Clock3 size={20} strokeWidth={1.8} />
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                            Recovery planning
                          </p>
                          <h3 className="cinevora-heading mt-1 text-2xl lg:text-3xl">
                            Recovery sequence
                          </h3>
                          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
                            {recoveryPlan.decision_reasoning ||
                              "Cinevora's recommended recovery sequence, generated from specialist analysis."}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-[9px] bg-background-secondary px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                          Decision state
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-warning" />

                          <span className="text-sm font-semibold text-text-primary">
                           {approved ? "Approved" : recoveryPlan.approval || "Verification required"}
                          </span>


                        </div>
                      </div>
                    </div>

                    {updatedScheduleEntries.length > 0 && (
                      <div className="mt-7 grid gap-3 border-t border-border pt-6 md:grid-cols-2">
                        {updatedScheduleEntries.map((entry, index) => (
                          <RecoveryStep
                            key={`${entry.scene_id}-${index}`}
                            number={String(index + 1).padStart(2, "0")}
                            title={entry.scene_id}
                            description={entry.action}
                            active={index === 0}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                <section className="rounded-[10px] border border-border bg-background-secondary p-6 lg:p-7">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-surface">
                      <CheckCircle2 size={19} className="text-success" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
                        Production control
                      </p>
                      <h3 className="cinevora-heading mt-1 text-xl lg:text-2xl">
                        Schedule changes remain under manager approval
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                      {approved
                      ? "This schedule change has been approved by the production manager and committed to the Cinevora workspace."
                      : "Cinevora provides a decision-support recommendation. No schedule change is considered committed until the production manager explicitly approves the recovery plan."}
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
        No recovery plan generated yet
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
        Generate a recovery decision from the Overview page to see affected
        scenes, schedule impact, and recovery actions here.
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

type UpdatedScheduleEntry = {
  scene_id: string;
  action: string;
  recommended_date: string | null;
};

function normalizeUpdatedSchedule(
  items?: unknown[]
): UpdatedScheduleEntry[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const result: UpdatedScheduleEntry[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;

    const sceneId =
      typeof record.scene_id === "string" ? record.scene_id : null;

    if (!sceneId) {
      continue;
    }

    result.push({
      scene_id: sceneId,
      action:
        typeof record.action === "string" && record.action.trim()
          ? record.action
          : "Recovery action pending detail",
      recommended_date:
        typeof record.recommended_date === "string"
          ? record.recommended_date
          : null,
    });
  }

  return result;
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
          <NavItem href="/schedule" icon={CalendarDays} label="Schedule" active />
          <NavItem href="/resources" icon={Users} label="Resources" />
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
            Final approval is required before schedule changes are committed.
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

function MetricPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[78px] rounded-[8px] border border-terracotta/20 bg-white/50 px-3 py-2 text-center">
      <p className="text-sm font-semibold text-terracotta">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.1em] text-text-secondary">
        {label}
      </p>
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
  tone: "terracotta" | "warning" | "teal";
}) {
  const styles = {
    terracotta: "bg-terracotta-tint text-terracotta",
    warning: "bg-warning-tint text-warning",
    teal: "bg-teal-tint text-teal",
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

function SceneCard({
  scene,
  scheduleItem,
  recoveryAction,
  highPriority,
}: {
  scene: {
    scene_id: string;
    description: string;
    location: string;
    duration_hours: number;
    priority: string;
  };
  scheduleItem?: { date: string; start_time: string; end_time: string };
  recoveryAction?: { action: string; recommended_date?: string | null };
  highPriority: boolean;
}) {
  return (
    <article className="rounded-[10px] border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(43,36,28,0.05)] transition-shadow hover:shadow-[0_4px_12px_rgba(43,36,28,0.08)] lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[9px] text-sm font-bold ${
              highPriority
                ? "bg-terracotta text-white"
                : "bg-background-secondary text-text-primary"
            }`}
          >
            {scene.scene_id.replace("SC", "")}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-semibold text-text-primary lg:text-lg">
                {scene.description}
              </h4>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  highPriority
                    ? "bg-terracotta-tint text-terracotta"
                    : "bg-background-secondary text-text-secondary"
                }`}
              >
                {scene.priority} priority
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
              {scheduleItem && (
                <span className="flex items-center gap-2">
                  <Clock3 size={14} />
                  {scheduleItem.start_time} – {scheduleItem.end_time}
                </span>
              )}
              <span>{scene.duration_hours} hours</span>
              <span className="flex items-center gap-2">
                <MapPin size={14} />
                {scene.location}
              </span>
            </div>

            {recoveryAction && (
              <p className="mt-2 text-xs leading-5 text-teal">
                Recovery: {recoveryAction.action}
                {recoveryAction.recommended_date &&
                  ` (New date: ${recoveryAction.recommended_date})`}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-[8px] bg-terracotta-tint px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-terracotta" />
          <span className="text-xs font-medium text-terracotta">
            Weather affected
          </span>
        </div>
      </div>
    </article>
  );
}

function RecoveryStep({
  number,
  title,
  description,
  active = false,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[9px] border p-4 ${
        active
          ? "border-terracotta/30 bg-terracotta-tint"
          : "border-border bg-background-secondary"
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold ${
            active
              ? "bg-terracotta text-white"
              : "bg-surface text-text-secondary"
          }`}
        >
          {number}
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}