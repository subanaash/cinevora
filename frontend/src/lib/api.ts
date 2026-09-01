const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function parseResponse(response: Response) {
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      result?.detail ||
      result?.message ||
      `Backend request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (!result) {
    throw new Error("The backend returned an empty response.");
  }

  return result;
}

export type RecoveryPlanRequest = {
  project_name: string;

  scenes: {
    scene_id: string;
    description: string;
    location: string;
    duration_hours: number;
    indoor: boolean;
    priority: string;
  }[];

  schedule: {
    scene_id: string;
    date: string;
    start_time: string;
    end_time: string;
  }[];

  original_location: {
    name: string;
    indoor: boolean;
  };

  crew: {
    name: string;
    role: string;
  }[];

  equipment: {
    name: string;
    quantity: number;
  }[];

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

export async function generateRecoveryPlan(
  data: RecoveryPlanRequest
) {
  try {
    const response = await fetch(
      `${API_URL}/api/recovery-plan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Unable to connect to the Cinevora backend."
    );
  }
}

export type ApproveRecoveryPlanRequest = {
  project_name: string;
  recovery_plan: unknown;
  approved_by?: string;
};

export async function approveRecoveryPlan(
  data: ApproveRecoveryPlanRequest
) {
  try {
    const response = await fetch(
      `${API_URL}/api/recovery-plan/approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    return await parseResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Unable to connect to the Cinevora backend."
    );
  }
}