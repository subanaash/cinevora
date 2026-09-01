"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type ProductionScene = {
  scene_id: string;
  description: string;
  location: string;
  duration_hours: number;
  indoor: boolean;
  priority: string;
};

export type ProductionData = {
  project_name: string;
  scenes: ProductionScene[];
  schedule: {
    scene_id: string;
    date: string;
    start_time: string;
    end_time: string;
  }[];
  original_location: {
    name: string;
    address?: string;
    indoor: boolean;
  };
  crew: { name: string; role: string }[];
  equipment: { name: string; quantity: number }[];
  budget: {
    total: number;
    spent: number;
    remaining: number;
  };
  disruption: {
    type: string;
    description: string;
    affected_date: string;
    severity: string;
  };
};

export type RecoveryPlan = {
  situation?: string;
  recommended_recovery?: string;
  recommended_location?:
    | string
    | { name?: string; reason?: string; confidence?: string };
  alternatives_considered?: unknown[];
  updated_schedule?: unknown[];
  resource_impact?: unknown[];
  budget_impact?: unknown[];
  decision_reasoning?: string;
  risks_and_assumptions?: unknown[];
  score?: {
    schedule_continuity?: number;
    location_suitability?: number;
    resource_impact?: number;
    budget_impact?: number;
    operational_risk?: number;
    weather_resilience?: number;
    overall?: number;
  };
    evidence?: unknown[];
  approval?: string;
  candidate_strategies?: {
    strategy_id?: string;
    name?: string;
    description?: string;
    status?: string;
    reason?: string;
    score?: { overall?: number };
    rank?: number;
  }[];
};

type RecoveryPlanState = {
  productionData: ProductionData | null;
  recoveryPlan: RecoveryPlan | null;
  approved: boolean;
  generatedAt: string | null;
};

type RecoveryPlanContextValue = RecoveryPlanState & {
  setRecoveryResult: (
    productionData: ProductionData,
    recoveryPlan: RecoveryPlan
  ) => void;
  setApproved: (value: boolean) => void;
  clearRecoveryResult: () => void;
};

const STORAGE_KEY = "cinevora:recovery-plan-state";

const RecoveryPlanContext =
  createContext<RecoveryPlanContextValue | null>(null);

const EMPTY_STATE: RecoveryPlanState = {
  productionData: null,
  recoveryPlan: null,
  approved: false,
  generatedAt: null,
};

export function RecoveryPlanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RecoveryPlanState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state AFTER mount, never during initial render, so
  // the server-rendered HTML and the client's first render always
  // match (both start empty). This avoids a hydration mismatch.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        setState(JSON.parse(raw) as RecoveryPlanState);
      }
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, hydrated]);



  function setRecoveryResult(productionData: ProductionData, recoveryPlan: RecoveryPlan) {
    setState({ productionData, recoveryPlan, approved: false, generatedAt: new Date().toISOString() });
  }

  function setApproved(value: boolean) {
    setState((prev) => ({ ...prev, approved: value }));
  }

  function clearRecoveryResult() {
    setState({ productionData: null, recoveryPlan: null, approved: false, generatedAt: null });
  }

  return (
    <RecoveryPlanContext.Provider
      value={{ ...state, setRecoveryResult, setApproved, clearRecoveryResult }}
    >
      {children}
    </RecoveryPlanContext.Provider>
  );
}

export function useRecoveryPlan() {
  const ctx = useContext(RecoveryPlanContext);
  if (!ctx) {
    throw new Error("useRecoveryPlan must be used within a RecoveryPlanProvider");
  }
  return ctx;
}