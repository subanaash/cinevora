from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .models import Production, RecoveryPlan
from .workflow import generate_recovery_plan, execute_recovery_plan


app = FastAPI(
    title="Cinevora API",
    description="Agentic production recovery platform powered by coordinated AI agents.",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecoveryApprovalRequest(BaseModel):
    project_name: str = Field(min_length=1)
    recovery_plan: RecoveryPlan
    approved_by: str = Field(
        default="Production Manager",
        min_length=1,
    )


production_states: dict[str, Production] = {}
recovery_states: dict[str, dict[str, Any]] = {}


@app.get("/")
async def root():
    return {
        "name": "Cinevora",
        "description": "Agentic production recovery platform",
        "status": "online",
        "version": "1.0.0",
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "cinevora-api",
    }


@app.post("/api/recovery-plan")
async def create_recovery_plan(production: Production):
    if production.disruption is None:
        raise HTTPException(
            status_code=400,
            detail="A production disruption is required to generate a recovery plan.",
        )

    try:
        result = await generate_recovery_plan(production)

        if isinstance(result, dict) and "plan" in result:
            recovery_plan = result["plan"]
            analysis = result.get("analysis")
        else:
            recovery_plan = result
            analysis = None

        if isinstance(recovery_plan, dict):
            recovery_plan = RecoveryPlan.model_validate(recovery_plan)

        production_states[production.project_name] = production

        recovery_states[production.project_name] = {
            "status": "DECISION_READY",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "approved_at": None,
            "approved_by": None,
        }

        return {
            "success": True,
            "project_name": production.project_name,
            "status": "DECISION_READY",
            "recovery_plan": recovery_plan.model_dump(),
            "analysis": analysis,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recovery plan: {str(exc)}",
        ) from exc


@app.post("/api/recovery-plan/approve")

async def approve_recovery_plan(
    request: RecoveryApprovalRequest,
):
    project_name = request.project_name

    production = production_states.get(project_name)

    if production is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No active production state was found for this project. "
                "Generate a recovery plan before approving it."
            ),
        )

    existing_state = recovery_states.get(project_name)

    if existing_state and existing_state.get("status") == "RECOVERY_EXECUTED":
        raise HTTPException(
            status_code=409,
            detail="Recovery has already been executed for this project.",
        )

    plan = request.recovery_plan

    if not plan.updated_schedule:
        raise HTTPException(
            status_code=400,
            detail="Recovery plan contains no schedule changes to execute.",
        )

    try:
        execution_result = await execute_recovery_plan(
        production=production,
        recovery_plan=plan,
        approved_by=request.approved_by,
        )

        approved_at = datetime.now(timezone.utc).isoformat()

        recovery_states[project_name] = {
            "status": "RECOVERY_EXECUTED",
            "generated_at": (
                existing_state.get("generated_at")
                if existing_state
                else None
            ),
            "approved_at": approved_at,
            "approved_by": request.approved_by,
        }

        return {
            "success": True,
            "project_name": project_name,
            "status": "RECOVERY_EXECUTED",
            "approved_by": request.approved_by,
            "approved_at": approved_at,
            "execution": execution_result,
            "production_state": production.model_dump(),
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute recovery plan: {str(exc)}",
        ) from exc


@app.get("/api/recovery-status/{project_name}")
async def get_recovery_status(project_name: str):
    state = recovery_states.get(project_name)

    if state is None:
        raise HTTPException(
            status_code=404,
            detail="No recovery state found for this project.",
        )

    production = production_states.get(project_name)

    return {
        "success": True,
        "project_name": project_name,
        "recovery": state,
        "production_state": (
            production.model_dump()
            if production
            else None
        ),
    }