from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any


from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types


from .agent import (
    scheduling_agent,
    resource_agent,
    location_budget_agent,
)
from .decision_engine import run_decision_engine
from .models import Production, RecoveryPlan


APP_NAME = "cinevora"
USER_ID = "production_manager"

session_service = InMemorySessionService()

MAX_RETRIES = 4
INITIAL_RETRY_DELAY = 2.0


def _is_retryable_error(error: Exception) -> bool:
    error_text = str(error).lower()

    retryable_markers = [
        "503",
        "429",
        "unavailable",
        "high demand",
        "temporarily unavailable",
        "internal server error",
        "deadline exceeded",
        "timeout",
        "rate limit",
        "resource_exhausted",
        "quota",
    ]

    return any(
        marker in error_text
        for marker in retryable_markers
    )


async def run_agent(
    agent: Agent,
    prompt: str,
    *,
    max_retries: int = MAX_RETRIES,
) -> str:

    last_error: Exception | None = None

    for attempt in range(max_retries + 1):

        session_id = str(uuid.uuid4())

        runner = Runner(
            agent=agent,
            app_name=APP_NAME,
            session_service=session_service,
            auto_create_session=True,
        )

        request = types.Content(
            role="user",
            parts=[
                types.Part(text=prompt)
            ],
        )

        final_response = ""

        try:

            async for event in runner.run_async(
                user_id=USER_ID,
                session_id=session_id,
                new_message=request,
            ):

                if event.is_final_response() and event.content:

                    if event.content.parts:

                        text_parts = [
                            part.text
                            for part in event.content.parts
                            if getattr(part, "text", None)
                        ]

                        final_response = "\n".join(
                            text_parts
                        ).strip()

            if final_response:
                return final_response

            raise RuntimeError(
                f"Agent '{agent.name}' completed without "
                f"returning a final response."
            )

        except Exception as error:

            last_error = error

            if not _is_retryable_error(error):
                raise

            if attempt >= max_retries:
                break

            delay = INITIAL_RETRY_DELAY * (2 ** attempt)

            print(
                f"[Cinevora] Temporary error from "
                f"'{agent.name}'. "
                f"Retrying in {delay:.1f}s "
                f"(attempt {attempt + 1}/{max_retries})..."
            )

            await asyncio.sleep(delay)

    raise RuntimeError(
        f"Agent '{agent.name}' failed after "
        f"{max_retries + 1} attempts. "
        f"Last error: {last_error}"
    )

def _clean_json_response(
    result: str,
) -> dict[str, Any]:

    if not result:
        raise ValueError(
            "Producer Agent returned an empty response."
        )

    cleaned = result.strip()

    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]

    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)

    except json.JSONDecodeError as error:

        raise ValueError(
            "Producer Agent returned invalid JSON."
        ) from error

    if not isinstance(parsed, dict):

        raise ValueError(
            "Producer Agent JSON response must be an object."
        )

    return parsed

# ------------------------------------------------------------------
# CHANGED: _normalize_string_list now extracts a clean string from
# dict-shaped claim items (e.g. {"type": "risk", "description": "..."})
# instead of falling back to Python's dict repr via str(item).
# ------------------------------------------------------------------
def _normalize_string_list(
    value: Any,
) -> list[str]:

    if not isinstance(value, list):
        return []

    normalized: list[str] = []

    for item in value:
        if item is None:
            continue

        if isinstance(item, dict):
            text = str(
                item.get("description")
                or item.get("claim")
                or ""
            ).strip()
        else:
            text = str(item).strip()

        if text:
            normalized.append(text)

    return normalized


def _normalize_confidence(
    value: Any,
) -> str:

    confidence = str(
        value or "medium"
    ).strip().lower()

    if confidence not in {
        "high",
        "medium",
        "low",
    }:
        return "medium"

    return confidence


def _normalize_validation_status(
    value: Any,
) -> str:

    status = str(
        value or "unverified"
    ).strip().lower()

    allowed = {
        "verified",
        "partially_verified",
        "unverified",
        "not_applicable",
    }

    return (
        status
        if status in allowed
        else "unverified"
    )


def _normalize_location(
    value: Any,
) -> dict[str, Any] | None:

    if value is None:
        return None

    if isinstance(value, str):

        if not value.strip():
            return None

        return {
            "name": value.strip(),
            "reason": (
                "Selected based on the available "
                "production analysis."
            ),
            "confidence": "medium",
            "status": "candidate",
            "availability_verified": False,
            "permit_verified": False,
            "weather_verified": False,
            "verification_required": True,
            "availability_status": "unknown",
            "validation_status": "unverified",
        }

    if not isinstance(value, dict):
        return None

    name = str(
        value.get("name", "")
    ).strip()

    if not name:
        return None

    return {
        "name": name,
        "reason": str(
            value.get(
                "reason",
                "Selected based on available production analysis.",
            )
        ).strip()
        or "Selected based on available production analysis.",

        "confidence": _normalize_confidence(
            value.get("confidence")
        ),

        "status": str(
            value.get(
                "status",
                "candidate",
            )
        ).strip()
        or "candidate",

        "availability_verified": bool(
            value.get(
                "availability_verified",
                False,
            )
        ),

        "permit_verified": bool(
            value.get(
                "permit_verified",
                False,
            )
        ),

        "weather_verified": bool(
            value.get(
                "weather_verified",
                False,
            )
        ),

        "verification_required": bool(
            value.get(
                "verification_required",
                True,
            )
        ),

        "availability_status": str(
            value.get(
                "availability_status",
                "unknown",
            )
        ).strip()
        or "unknown",

        "validation_status": _normalize_validation_status(
            value.get("validation_status")
        ),
    }


def _normalize_evidence_item(
    item: Any,
) -> dict[str, Any] | None:

    if not isinstance(item, dict):
        return None

    claim = str(
        item.get("claim", "")
    ).strip()

    if not claim:
        return None

    source = item.get("source")

    return {
        "claim": claim,

        "source": (
            str(source).strip()
            if source is not None
            and str(source).strip()
            else None
        ),

        "source_type": str(
            item.get(
                "source_type",
                "unknown",
            )
        ).strip()
        or "unknown",

        "confidence": _normalize_confidence(
            item.get("confidence")
        ),

        "validation_status": _normalize_validation_status(
            item.get("validation_status")
        ),
    }


def _normalize_evidence(
    value: Any,
) -> list[dict[str, Any]]:

    if not isinstance(value, list):
        return []

    normalized = []

    for item in value:

        normalized_item = _normalize_evidence_item(
            item
        )

        if normalized_item:
            normalized.append(
                normalized_item
            )

    return normalized


def _normalize_alternatives(
    value: Any,
) -> list[dict[str, Any]]:

    if not isinstance(value, list):
        return []

    normalized = []

    for item in value:

        if isinstance(item, str):

            if item.strip():

                normalized.append(
                    {
                        "option": item.strip(),
                        "reason_not_selected": (
                            "Not selected based on "
                            "current production analysis."
                        ),
                        "evidence": [],
                    }
                )

            continue

        if not isinstance(item, dict):
            continue

        option = str(
            item.get("option", "")
        ).strip()

        if not option:
            continue

        normalized.append(
            {
                "option": option,

                "reason_not_selected": str(
                    item.get(
                        "reason_not_selected",
                        "Not selected based on current production analysis.",
                    )
                ).strip()
                or "Not selected based on current production analysis.",

                "evidence": _normalize_evidence(
                    item.get("evidence")
                ),
            }
        )

    return normalized


def _normalize_schedule(
    value: Any,
) -> list[dict[str, Any]]:

    if not isinstance(value, list):
        return []

    normalized = []

    for item in value:

        if isinstance(item, str):

            if item.strip():

                normalized.append(
                    {
                        "scene_id": "Unknown",
                        "original_date": "Unknown",
                        "recommended_date": None,
                        "action": item.strip(),
                        "confidence": "medium",
                        "verification_required": True,
                        "verification_reason": (
                            "Schedule change requires "
                            "independent verification."
                        ),
                        "reason": None,
                        "validation_status": "unverified",
                    }
                )

            continue

        if not isinstance(item, dict):
            continue

        scene_id = str(
            item.get("scene_id", "")
        ).strip()

        if not scene_id:
            continue

        recommended_date = item.get(
            "recommended_date"
        )

        if recommended_date is not None:

            recommended_date = str(
                recommended_date
            ).strip()

            if not recommended_date:
                recommended_date = None

        normalized.append(
            {
                "scene_id": scene_id,

                "original_date": str(
                    item.get(
                        "original_date",
                        "Unknown",
                    )
                ).strip()
                or "Unknown",

                "recommended_date": recommended_date,

                "action": str(
                    item.get(
                        "action",
                        "Review",
                    )
                ).strip()
                or "Review",

                "confidence": _normalize_confidence(
                    item.get("confidence")
                ),

                "verification_required": bool(
                    item.get(
                        "verification_required",
                        True,
                    )
                ),

                "verification_reason": (
                    str(
                        item.get(
                            "verification_reason"
                        )
                    ).strip()
                    if item.get(
                        "verification_reason"
                    )
                    else None
                ),

                "reason": (
                    str(
                        item.get("reason")
                    ).strip()
                    if item.get("reason")
                    else None
                ),

                "validation_status": _normalize_validation_status(
                    item.get("validation_status")
                ),
            }
        )

    return normalized


def _normalize_score(
    value: Any,
) -> dict[str, Any] | None:

    if not isinstance(value, dict):
        return None

    score_fields = [
        "schedule_continuity",
        "location_suitability",
        "resource_impact",
        "budget_impact",
        "operational_risk",
        "weather_resilience",
    ]

    normalized = {}

    try:

        for field in score_fields:

            score_value = int(
                value.get(field, 5)
            )

            normalized[field] = max(
                1,
                min(10, score_value),
            )

        normalized["overall"] = round(
            sum(
                normalized[field]
                for field in score_fields
            )
            / len(score_fields),
            1,
        )

        return normalized

    except (TypeError, ValueError):

        return None

def _normalize_plan(
    data: dict[str, Any],
) -> dict[str, Any]:

    normalized = {

        "situation": str(
            data.get(
                "situation",
                "The production disruption requires recovery analysis.",
            )
        ).strip(),

        "recommended_recovery": str(
            data.get(
                "recommended_recovery",
                "Review available recovery options before proceeding.",
            )
        ).strip(),

        "recommended_location": (
            _normalize_location(
                data.get(
                    "recommended_location"
                )
            )
        ),

        "alternatives_considered": (
            _normalize_alternatives(
                data.get(
                    "alternatives_considered"
                )
            )
        ),

        "updated_schedule": (
            _normalize_schedule(
                data.get(
                    "updated_schedule"
                )
            )
        ),

        "resource_impact": (
            _normalize_string_list(
                data.get(
                    "resource_impact"
                )
            )
        ),

        "budget_impact": (
            _normalize_string_list(
                data.get(
                    "budget_impact"
                )
            )
        ),

        "decision_reasoning": str(
            data.get(
                "decision_reasoning",
                "The recommendation is based on available specialist analysis.",
            )
        ).strip(),

        "risks_and_assumptions": (
            _normalize_string_list(
                data.get(
                    "risks_and_assumptions"
                )
            )
        ),

        "approval": str(
            data.get(
                "approval",
                "PENDING_APPROVAL",
            )
        ).strip()
        or "PENDING_APPROVAL",

        "score": _normalize_score(
            data.get("score")
        ),

        "evidence": _normalize_evidence(
            data.get("evidence")
        ),

        "candidate_strategies": [],

        "decision_evaluation": None,

        "decision_critique": None,

        "verification_requirements": (
            _normalize_string_list(
                data.get(
                    "verification_requirements"
                )
            )
        ),

        "next_actions": (
            _normalize_string_list(
                data.get(
                    "next_actions"
                )
            )
        ),

        "generated_at": data.get(
            "generated_at"
        ),
    }

    return RecoveryPlan.model_validate(
        normalized
    ).model_dump()


async def _run_specialist_agents(
    production_data: str,
) -> tuple[str, str, str]:

    scheduling_prompt = f"""
Analyze this production disruption from a scheduling perspective.

Production data:
{production_data}

Focus on:

- affected scenes
- schedule impact
- possible rescheduling
- scene priority
- scene dependencies
- available production windows
- constraints
- risks

Do not invent dates, availability, dependencies,
or weather information.

Clearly distinguish:

- known facts
- assumptions
- unknown information

Return concise production-focused findings.
"""

    resource_prompt = f"""
Analyze this production disruption from a resource and logistics perspective.

Production data:
{production_data}

Focus on:

- crew requirements
- equipment requirements
- transportation
- equipment movement
- setup and relocation
- logistics
- resource conflicts
- operational risks

Do not invent:

- crew availability
- equipment availability
- transportation availability
- travel times
- exact costs

Clearly distinguish:

- known facts
- assumptions
- unknown information

Return concise production-focused findings.
"""

    location_prompt = f"""
Analyze this production disruption from a location and budget perspective.

Production data:
{production_data}

Use the location search tool when current external information is required.

Focus on:

- alternative filming locations
- visual suitability
- similarity to the original location
- facilities
- indoor or weather-independent alternatives
- accessibility
- travel implications
- permits
- logistics
- budget implications

Do not invent:

- location availability
- prices
- permits
- travel times
- weather conditions
- facilities

If information cannot be verified, state that it is unknown.

When external web information is used, preserve the source URL.

Clearly distinguish:

- verified information
- estimates
- assumptions
- unknown information

Return concise production-focused findings.
"""

    return await asyncio.gather(

        run_agent(
            scheduling_agent,
            scheduling_prompt,
        ),

        run_agent(
            resource_agent,
            resource_prompt,
        ),

        run_agent(
            location_budget_agent,
            location_prompt,
        ),
    )

def _build_synthesis_prompt(
    production_data: str,
    scheduling_result: str,
    resource_result: str,
    location_result: str,
    decision_result: dict[str, Any],
) -> str:

    selected_strategy = decision_result.get(
        "selected_strategy"
    )

    decision_status = decision_result.get(
        "decision_status"
    )

    strategies = decision_result.get(
        "strategies",
        [],
    )

    verification_requirements = decision_result.get(
        "verification_requirements",
        [],
    )

    next_actions = decision_result.get(
        "next_actions",
        [],
    )

    return f"""
You are Cinevora's Producer Agent.

Produce a grounded preliminary recovery plan.

The deterministic Decision Engine has already evaluated
candidate strategies.

You MUST respect its result.

Production data:
{production_data}

Scheduling Agent:
{scheduling_result}

Resource Agent:
{resource_result}

Location & Budget Agent:
{location_result}

Decision Engine Status:
{decision_status}

Selected Strategy:
{json.dumps(selected_strategy, indent=2, default=str)}

Candidate Strategies:
{json.dumps(strategies, indent=2, default=str)}

Verification Requirements:
{json.dumps(verification_requirements, indent=2)}

Next Actions:
{json.dumps(next_actions, indent=2)}

IMPORTANT RULES:

- Do not override the Decision Engine.
- Do not invent facts.
- Do not claim approval.
- Do not claim availability unless explicitly verified.
- Do not claim permits are approved unless explicitly verified.
- Do not claim crew or equipment availability unless verified.
- Do not invent future dates.
- Do not invent weather conditions.
- Preserve uncertainty.
- Production-manager approval remains mandatory.

If a future date is not explicitly supported,
use:

"Unknown - verification required"

If no safe strategy is selected:

- clearly state that no safe strategy is currently available
- do not invent a recovery plan
- recommend verification and additional information gathering

Return ONLY valid JSON.

Use exactly this structure:

{{
  "situation": "string",

  "recommended_recovery": "string",

  "recommended_location": null,

  "alternatives_considered": [],

  "updated_schedule": [],

  "resource_impact": [],

  "budget_impact": [],

  "decision_reasoning": "string",

  "risks_and_assumptions": [],

  "approval": "PENDING_APPROVAL",

  "score": null,

  "evidence": [],

  "verification_requirements": [],

  "next_actions": [],

  "generated_at": null
}}

Example of a populated updated_schedule entry (include one per affected
scene identified in the production data - do not leave updated_schedule
empty when scenes are affected by the disruption):

{{
  "scene_id": "SC.23",
  "original_date": "2026-08-15",
  "recommended_date": null,
  "action": "Suspend and reschedule to earliest verified safe window",
  "confidence": "medium",
  "verification_required": true,
  "verification_reason": "Future date depends on confirmed weather clearance",
  "reason": "Preserves original creative location per selected strategy"
}}

IMPORTANT: Even when no specific recommended_date can be verified,
you MUST still include one updated_schedule entry PER AFFECTED SCENE,
with recommended_date set to null and action describing the recovery
decision being made for that scene. An empty updated_schedule list is
only acceptable when NO scenes are affected by the disruption. Since
scenes are affected in this production, updated_schedule must contain
at least one entry per affected scene - do not return an empty list.

The "action" field must be a specific, human-readable description of
the recovery decision for that scene (e.g. "Suspend and reschedule
to earliest verified safe window pending location confirmation"),
never the placeholder word "Review" or similarly vague text.

Similarly, risks_and_assumptions MUST NOT be empty when the disruption
and recovery decision involve any genuine uncertainty (e.g. unverified
weather timing, unconfirmed future availability, potential costs).
Include at least 2-3 specific risks or assumptions relevant to this
scenario - do not return an empty list unless there is truly zero
residual uncertainty, which is rare.

Every important external claim should have evidence.

Every risk, resource impact, and budget impact claim MUST have a
corresponding entry in "evidence" with an accurate source_type:
"production_data" (taken directly from the Production data above),
"web_research" (from the Location & Budget Agent's search tool results),
"agent_analysis" (specialist reasoning without external grounding), or
"unknown" (only if genuinely ungrounded).

Set confidence "high" only for verified or production_data-backed claims,
"medium" for well-reasoned agent_analysis, and "low" for speculative
claims. Accurate, honest confidence and source_type values are required -
do not default everything to "unknown" or "medium" if a better answer
is supported by the inputs above.

Evidence source_type must be one of:

production_data
web_research
agent_analysis
unknown
"""


async def _synthesize_recovery_plan(
    production_data: str,
    scheduling_result: str,
    resource_result: str,
    location_result: str,
    decision_result: dict[str, Any],
) -> dict[str, Any]:

    producer_agent = Agent(
        name="producer_synthesis_agent",
        model="gemini-2.5-flash",
        description=(
            "Produces a grounded preliminary production recovery assessment."
        ),
        instruction=(
            "Return only valid JSON. "
            "Never invent production facts. "
            "Respect the deterministic decision engine."
        ),
    )

    prompt = _build_synthesis_prompt(
        production_data,
        scheduling_result,
        resource_result,
        location_result,
        decision_result,
    )

    result = await run_agent(
        producer_agent,
        prompt,
    )

    try:

        parsed = _clean_json_response(
            result
        )

        return _normalize_plan(
            parsed
        )

    except (ValueError, TypeError) as error:

        repair_prompt = f"""
The Producer Agent response failed validation.

Validation error:

{error}

Previous response:

{result}

Decision Engine result:

{json.dumps(
    decision_result,
    indent=2,
    default=str,
)}

Return the same grounded decision as valid JSON.

Do not invent information.

Do not change the Decision Engine's selected strategy.

Do not invent future dates.

Any unsupported future date must be:

"Unknown - verification required"

Approval must remain:

"PENDING_APPROVAL"

Return ONLY JSON.

Use this structure:

{{
  "situation": "string",
  "recommended_recovery": "string",
  "recommended_location": null,
  "alternatives_considered": [],
  "updated_schedule": [],
  "resource_impact": [],
  "budget_impact": [],
  "decision_reasoning": "string",
  "risks_and_assumptions": [],
  "approval": "PENDING_APPROVAL",
  "score": null,
  "evidence": [],
  "verification_requirements": [],
  "next_actions": [],
  "generated_at": null
}}
"""

        repaired_result = await run_agent(
            producer_agent,
            repair_prompt,
            max_retries=1,
        )

        repaired = _clean_json_response(
            repaired_result
        )

        return _normalize_plan(
            repaired
        )

def _merge_decision_engine(
    recovery_plan: dict[str, Any],
    decision_result: dict[str, Any],
) -> dict[str, Any]:

    strategies = decision_result.get(
        "strategies",
        [],
    )

    selected_strategy = decision_result.get(
        "selected_strategy"
    )

    decision_evaluation = decision_result.get(
        "decision_evaluation"
    )

    verification_requirements = decision_result.get(
        "verification_requirements",
        [],
    )

    next_actions = decision_result.get(
        "next_actions",
        [],
    )

    recovery_plan["candidate_strategies"] = (
        strategies
    )

    recovery_plan["verification_requirements"] = (
        verification_requirements
    )

    recovery_plan["next_actions"] = (
        next_actions
    )

    recovery_plan["decision_evaluation"] = (
        decision_evaluation
    )

    if selected_strategy is None:

        recovery_plan["recommended_recovery"] = (
            "No safe recovery strategy is currently "
            "available. Production should remain suspended "
            "until the required information is verified."
        )

        recovery_plan["approval"] = (
            "PENDING_APPROVAL"
        )

        return recovery_plan

    # --------------------------------------------------------
    # Deterministic strategy selection
    # --------------------------------------------------------

    strategy_action = selected_strategy.get(
        "recommended_action"
    )

    if strategy_action:

        recovery_plan["recommended_recovery"] = (
            strategy_action
        )

    strategy_description = selected_strategy.get(
        "description"
    )

    if strategy_description:

        existing_reasoning = recovery_plan.get(
            "decision_reasoning",
            "",
        )

        recovery_plan["decision_reasoning"] = (
            strategy_description
            + " "
            + existing_reasoning
        ).strip()

    # --------------------------------------------------------
    # Use deterministic score
    # --------------------------------------------------------

    selected_score = selected_strategy.get(
        "score"
    )

    if selected_score:

        recovery_plan["score"] = {
            "schedule_continuity": int(
                selected_score.get(
                    "schedule_continuity",
                    5,
                )
            ),

            "location_suitability": int(
                selected_score.get(
                    "location_suitability",
                    5,
                )
            ),

            "resource_impact": int(
                selected_score.get(
                    "resource_feasibility",
                    5,
                )
            ),

            "budget_impact": int(
                selected_score.get(
                    "budget_efficiency",
                    5,
                )
            ),

            "operational_risk": int(
                selected_score.get(
                    "operational_risk",
                    5,
                )
            ),

            "weather_resilience": int(
                selected_score.get(
                    "weather_resilience",
                    5,
                )
            ),

            "overall": float(
                selected_score.get(
                    "overall",
                    5.0,
                )
            ),
        }

    # --------------------------------------------------------
    # Make verification explicit
    # --------------------------------------------------------

    if decision_result.get(
        "decision_status"
    ) == "DECISION_READY_WITH_VERIFICATION":

        recovery_plan["approval"] = (
            "PENDING_APPROVAL - verification required"
        )

    else:

        recovery_plan["approval"] = (
            "PENDING_APPROVAL"
        )

    return recovery_plan


# ============================================================
# MAIN WORKFLOW
# ============================================================

# ------------------------------------------------------------------
# CHANGED: generate_recovery_plan now runs the decision engine TWICE.
# Pass 1 generates candidate strategies with no evidence (as before).
# The Producer Agent then synthesizes a plan and extracts structured
# evidence from the specialist findings (source_type, confidence, etc).
# Pass 2 re-runs the decision engine with that real evidence, so the
# evidence-confidence scoring actually reflects what was found instead
# of always seeing evidence=[] and applying the maximum penalty.
# ------------------------------------------------------------------
async def generate_recovery_plan(
    production: Production,
) -> dict[str, Any]:

    if production.disruption is None:

        raise ValueError(
            "A production disruption is required "
            "to generate a recovery plan."
        )

    if not production.scenes:

        raise ValueError(
            "At least one production scene is required."
        )

    production_data = production.model_dump_json(
        indent=2
    )


    specialist_results = (
        await _run_specialist_agents(
            production_data
        )
    )

    (
        scheduling_result,
        resource_result,
        location_result,
    ) = specialist_results

    specialist_analysis = {
        "scheduling": scheduling_result,
        "resources": resource_result,
        "location_budget": location_result,
    }

    # Pass 1: candidate strategies, no evidence yet.
    decision_result = run_decision_engine(
        production.model_dump(),
        specialist_analysis=specialist_analysis,
        evidence=[],
    )

    recovery_plan = await _synthesize_recovery_plan(
        production_data,
        scheduling_result,
        resource_result,
        location_result,
        decision_result,
    )

    extracted_evidence = recovery_plan.get(
        "evidence", []
    )

    # Pass 2: re-score using the evidence the Producer Agent actually
    # extracted from the specialist findings, so confidence-based
    # scoring is grounded instead of defaulting to zero confidence.
    decision_result = run_decision_engine(
        production.model_dump(),
        specialist_analysis=specialist_analysis,
        evidence=extracted_evidence,
    )

    recovery_plan = _merge_decision_engine(
        recovery_plan,
        decision_result,
    )

    return {
        "plan": recovery_plan,

        "analysis": {
            "scheduling": scheduling_result,

            "resources": resource_result,

            "location_budget": location_result,

            "decision_engine": {
                "decision_status": decision_result.get(
                    "decision_status"
                ),

                "decision_reason": decision_result.get(
                    "decision_reason"
                ),

                "candidate_strategies": decision_result.get(
                    "strategies",
                    [],
                ),

                "selected_strategy": decision_result.get(
                    "selected_strategy"
                ),

                "decision_evaluation": decision_result.get(
                    "decision_evaluation"
                ),

                "verification_requirements": decision_result.get(
                    "verification_requirements",
                    [],
                ),

                "next_actions": decision_result.get(
                    "next_actions",
                    [],
                ),
            },
        },
    }