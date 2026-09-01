import asyncio
import json
import uuid
from datetime import date, datetime
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

from .models import (
    ApprovalStatus,
    Location,
    Production,
    RecoveryPlan,
    ValidationStatus,
)


APP_NAME = "cinevora"
USER_ID = "production_manager"

session_service = InMemorySessionService()

MAX_RETRIES = 4
INITIAL_RETRY_DELAY = 2.0

VALID_CONFIDENCE_LEVELS = {
    "high",
    "medium",
    "low",
}

VALID_EVIDENCE_TYPES = {
    "production_data",
    "web_research",
    "agent_analysis",
    "unknown",
}


def _is_retryable_error(error: Exception) -> bool:
    """
    Determine whether an agent failure is likely temporary.

    Retryable failures include:
    - rate limits
    - quota exhaustion
    - temporary service outages
    - timeouts
    - 5xx failures
    """

    error_text = str(error).lower()

    retryable_markers = {
        "503",
        "429",
        "500",
        "502",
        "504",
        "unavailable",
        "high demand",
        "temporarily unavailable",
        "internal server error",
        "bad gateway",
        "deadline exceeded",
        "timeout",
        "rate limit",
        "resource_exhausted",
        "quota",
        "connection reset",
    }

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
    """
    Execute an ADK agent with bounded exponential backoff.

    A new session is created for each attempt so a failed request
    cannot contaminate a retry with partial conversational state.
    """

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

                if (
                    event.is_final_response()
                    and event.content
                    and event.content.parts
                ):

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
                "returning a final response."
            )

        except Exception as error:

            last_error = error

            if not _is_retryable_error(error):
                raise

            if attempt >= max_retries:
                break

            delay = INITIAL_RETRY_DELAY * (
                2 ** attempt
            )

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
    """
    Safely extract a JSON object from an LLM response.

    Handles common Markdown fenced JSON responses while still
    requiring the final payload to be a JSON object.
    """

    if not result or not result.strip():
        raise ValueError(
            "Producer Agent returned an empty response."
        )

    cleaned = result.strip()

    if cleaned.startswith("```json"):
        cleaned = cleaned[len("```json"):]

    elif cleaned.startswith("```"):
        cleaned = cleaned[len("```"):]

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

def _normalize_string_list(
    value: Any,
) -> list[str]:
    """
    Convert an arbitrary LLM list into a clean list of strings.
    Handles both plain strings and structured dict items using
    any of the field-name variants the Producer Agent has used
    (resource/impact, category/impact, type/description), and
    appends the source when present.
    """

    if not isinstance(value, list):
        return []

    normalized: list[str] = []

    for item in value:

        if item is None:
            continue

        if isinstance(item, dict):
            label = (
                item.get("resource")
                or item.get("category")
                or item.get("type")
            )

            body = (
                item.get("impact")
                or item.get("description")
                or ""
            )

            source = item.get("source")

            text = str(body).strip()

            if label:
                text = f"{str(label).strip()}: {text}"

            if source:
                text = f"{text} (Source: {str(source).strip()})"

        else:
            text = str(item).strip()

        text = text.strip()

        if text:
            normalized.append(text)

    return normalized


def _normalize_confidence(
    value: Any,
) -> str:
    """
    Normalize confidence values to the application's allowed set.
    """

    confidence = str(
        value or "medium"
    ).strip().lower()

    if confidence not in VALID_CONFIDENCE_LEVELS:
        return "medium"

    return confidence


def _normalize_validation_status(
    value: Any,
) -> ValidationStatus:
    """
    Normalize validation status while preserving the richer model
    semantics introduced in models.py.
    """

    if isinstance(value, ValidationStatus):
        return value

    normalized = str(
        value or ValidationStatus.UNVERIFIED.value
    ).strip().lower()

    try:
        return ValidationStatus(normalized)

    except ValueError:
        return ValidationStatus.UNVERIFIED


def _normalize_location(
    value: Any,
) -> dict[str, Any] | None:
    """
    Normalize a recommended location without treating it as
    confirmed merely because an LLM mentioned it.
    """

    if value is None:
        return None

    if not isinstance(value, dict):
        return None

    name = str(
        value.get("name", "")
    ).strip()

    if not name:
        return None

    reason = str(
        value.get("reason", "")
    ).strip()

    confidence = _normalize_confidence(
        value.get("confidence")
    )

    status = str(
        value.get(
            "status",
            "candidate",
        )
    ).strip().lower()

    availability_verified = bool(
        value.get(
            "availability_verified",
            False,
        )
    )

    permit_verified = bool(
        value.get(
            "permit_verified",
            False,
        )
    )

    weather_verified = bool(
        value.get(
            "weather_verified",
            False,
        )
    )

    verification_required = bool(
        value.get(
            "verification_required",
            True,
        )
    )

    availability_status = str(
        value.get(
            "availability_status",
            "unknown",
        )
    ).strip().lower()

    return {
        "name": name,
        "reason": (
            reason
            or
            "Suitability based on available production analysis."
        ),
        "confidence": confidence,
        "status": status or "candidate",
        "availability_verified": availability_verified,
        "permit_verified": permit_verified,
        "weather_verified": weather_verified,
        "verification_required": verification_required,
        "availability_status": (
            availability_status
            or "unknown"
        ),
        "validation_status": _normalize_validation_status(
            value.get("validation_status")
        ),
    }


def _normalize_alternatives(
    value: Any,
) -> list[dict[str, Any]]:
    """
    Normalize alternative recovery options while preserving evidence.
    """

    if not isinstance(value, list):
        return []

    normalized: list[dict[str, Any]] = []

    for item in value:

        if not isinstance(item, dict):
            continue

        option = str(
            item.get("option", "")
        ).strip()

        if not option:
            continue

        reason = str(
            item.get(
                "reason_not_selected",
                "",
            )
        ).strip()

        evidence = _normalize_evidence(
            item.get("evidence")
        )

        normalized.append(
            {
                "option": option,
                "reason_not_selected": (
                    reason
                    or
                    "Not selected based on the current production analysis."
                ),
                "evidence": evidence,
            }
        )

    return normalized


def _normalize_schedule(
    value: Any,
) -> list[dict[str, Any]]:
    """
    Normalize schedule changes.

    Crucially, recommended_date may be None because the system must
    not invent a future date.
    """

    if not isinstance(value, list):
        return []

    normalized: list[dict[str, Any]] = []

    for item in value:

        if not isinstance(item, dict):
            continue

        scene_id = str(
            item.get("scene_id", "")
        ).strip()

        if not scene_id:
            continue

        original_date = item.get(
            "original_date"
        )

        recommended_date = item.get(
            "recommended_date"
        )

        if original_date is not None:
            original_date = str(
                original_date
            ).strip()

        if recommended_date is not None:
            recommended_date = str(
                recommended_date
            ).strip()

            if not recommended_date:
                recommended_date = None

        action = str(
            item.get(
                "action",
                "Review",
            )
        ).strip()

        confidence = _normalize_confidence(
            item.get("confidence")
        )

        verification_required = bool(
            item.get(
                "verification_required",
                True,
            )
        )

        verification_reason = item.get(
            "verification_reason"
        )

        reason = item.get(
            "reason"
        )

        validation_status = _normalize_validation_status(
            item.get("validation_status")
        )

        normalized.append(
            {
                "scene_id": scene_id,
                "original_date": (
                    original_date
                    or "Unknown"
                ),
                "recommended_date": (
                    recommended_date
                ),
                "action": (
                    action
                    or "Review"
                ),
                "confidence": confidence,
                "verification_required": (
                    verification_required
                ),
                "verification_reason": (
                    str(
                        verification_reason
                    ).strip()
                    if verification_reason
                    else None
                ),
                "reason": (
                    str(reason).strip()
                    if reason
                    else None
                ),
                "validation_status": validation_status,
            }
        )

    return normalized


def _normalize_evidence(
    value: Any,
) -> list[dict[str, Any]]:
    """
    Normalize evidence and preserve validation metadata.
    """

    if not isinstance(value, list):
        return []

    normalized: list[dict[str, Any]] = []

    for item in value:

        if not isinstance(item, dict):
            continue

        claim = str(
            item.get("claim", "")
        ).strip()

        if not claim:
            continue

        source = item.get(
            "source"
        )

        source_type = str(
            item.get(
                "source_type",
                "unknown",
            )
        ).strip().lower()

        if source_type not in VALID_EVIDENCE_TYPES:
            source_type = "unknown"

        confidence = _normalize_confidence(
            item.get("confidence")
        )

        validation_status = _normalize_validation_status(
            item.get("validation_status")
        )

        normalized.append(
            {
                "claim": claim,
                "source": (
                    str(source).strip()
                    if source is not None
                    and str(source).strip()
                    else None
                ),
                "source_type": source_type,
                "confidence": confidence,
                "validation_status": validation_status,
            }
        )

    return normalized


def _normalize_score(
    value: Any,
) -> dict[str, Any] | None:
    """
    Normalize score fields.

    Overall is recalculated deterministically rather than trusting
    an LLM-generated average.
    """

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

    normalized: dict[str, Any] = {}

    try:

        for field in score_fields:

            score_value = int(
                value.get(
                    field,
                    5,
                )
            )

            normalized[field] = max(
                1,
                min(
                    10,
                    score_value,
                ),
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

    except (
        TypeError,
        ValueError,
    ):
        return None

def _normalize_plan(
    data: dict[str, Any],
) -> dict[str, Any]:
    """
    Convert raw Producer output into the canonical RecoveryPlan
    schema defined in models.py.
    """

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

        "approval": (
            str(
                data.get(
                    "approval",
                    ApprovalStatus.PENDING.value,
                )
            ).strip()
            or ApprovalStatus.PENDING.value
        ),

        "score": (
            _normalize_score(
                data.get("score")
            )
        ),

        "evidence": (
            _normalize_evidence(
                data.get("evidence")
            )
        ),

        "candidate_strategies": [],

        "decision_evaluation": (
            data.get(
                "decision_evaluation"
            )
        ),

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

        "generated_at": (
            data.get(
                "generated_at"
            )
        ),
    }

    return RecoveryPlan.model_validate(
        normalized
    ).model_dump()


async def _run_specialist_agents(
    production_data: str,
) -> tuple[str, str, str]:
    """
    Run specialist agents concurrently.

    Each agent has a clearly separated responsibility.
    """

    scheduling_prompt = f"""
You are Cinevora's Scheduling Specialist.

Analyze the production disruption below.

Production data:
{production_data}

Focus on:

- affected scenes
- schedule impact
- scene priority
- scene dependencies
- production sequence
- possible recovery windows
- scheduling constraints
- schedule risks
- weather-sensitive scenes

IMPORTANT:

Do not invent:

- future dates
- scene dependencies
- crew availability
- equipment availability
- weather conditions
- confirmed production windows

If a future date is not explicitly available in the production data,
do NOT propose a fabricated date.

Clearly separate:

1. VERIFIED FACTS
2. REASONABLE INFERENCES
3. UNKNOWN INFORMATION
4. RECOMMENDED ACTIONS

Return concise production-focused findings.
"""

    resource_prompt = f"""
You are Cinevora's Resource & Logistics Specialist.

Analyze the production disruption below.

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
- potential incremental resource requirements

Do not invent:

- crew availability
- equipment availability
- transportation availability
- travel times
- exact prices
- confirmed resource reservations

Clearly separate:

1. VERIFIED FACTS
2. REASONABLE INFERENCES
3. UNKNOWN INFORMATION
4. RECOMMENDED ACTIONS

Return concise production-focused findings.
"""

    location_prompt = f"""
You are Cinevora's Location & Budget Specialist.

Analyze the production disruption below.

Production data:
{production_data}

Use the location search tool when current external information is
actually required.

Focus on:

- alternative filming locations
- visual similarity
- scene suitability
- indoor or weather-independent alternatives
- accessibility
- facilities
- travel implications
- permits
- logistics
- budget implications

Do not invent:

- location availability
- prices
- permit approval
- travel times
- weather conditions
- facilities that cannot be verified

A location discovered through research is a CANDIDATE unless
availability is explicitly verified.

When external information is used, preserve the source URL.

Clearly separate:

1. VERIFIED FACTS
2. WEB-VERIFIED INFORMATION
3. REASONABLE INFERENCES
4. UNKNOWN INFORMATION
5. RECOMMENDED ACTIONS

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
) -> str:

    return f"""
You are Cinevora's Producer Agent.

Your job is to synthesize specialist production intelligence into
ONE preliminary recovery recommendation.

You are a decision-support system.

You are NOT authorized to:

- fabricate facts
- fabricate dates
- claim approval
- claim location availability
- claim crew availability
- claim equipment availability
- claim permit approval
- claim prices
- claim weather conditions
- convert assumptions into verified facts

The final recommendation must prioritize:

1. CREW SAFETY
2. PRODUCTION FEASIBILITY
3. SCHEDULE CONTINUITY
4. CREATIVE INTENT
5. BUDGET CONTROL
6. WEATHER RESILIENCE

Production data:
{production_data}

Scheduling Specialist:
{scheduling_result}

Resource & Logistics Specialist:
{resource_result}

Location & Budget Specialist:
{location_result}

RULES FOR SCHEDULE:

For affected scenes, recommended_date MUST be null unless a
specific future date is explicitly supported by the supplied
information.

Never create a date simply because a date would make the plan
look more complete.

RULES FOR LOCATIONS:

If your decision_reasoning and situation name a specific location as
the recommended path forward (whether an alternative or an indoor
backup), you MUST populate recommended_location with that same
location - do not leave it null while naming the location elsewhere
in your response. The two must stay consistent.

recommended_location MUST be null only if you are NOT recommending
any specific named location (e.g. the recommendation is to wait for
a weather window at the original location, or no viable location
was identified).

Example of a populated recommended_location:
{{
  "name": "Riverside Studios",
  "reason": "Verified indoor backup location previously used for this production, offering full weather resilience",
  "confidence": "high",
  "status": "candidate",
  "availability_verified": false,
  "permit_verified": false,
  "weather_verified": true,
  "verification_required": true,
  "availability_status": "unknown",
  "validation_status": "unverified"
}}

A researched location is not automatically available - set
availability_verified to false unless explicitly confirmed, but
still populate the name and reason so the recommendation is visible.



RULES FOR SCHEDULE ACTIONS:

Even when recommended_date must be null, updated_schedule MUST still
contain one entry per affected scene from the production data. An
empty updated_schedule list is only acceptable when NO scenes are
affected by the disruption - do not return an empty list otherwise.

Example of a populated updated_schedule entry:
{{
  "scene_id": "SC23",
  "original_date": "2026-08-15",
  "recommended_date": null,
  "action": "Suspend and reschedule to earliest verified safe window",
  "confidence": "medium",
  "verification_required": true,
  "verification_reason": "Future date depends on confirmed weather clearance",
  "reason": "Preserves original creative location per selected strategy"
}}

The "action" field must be a specific, human-readable description of
the recovery decision for that scene. Never leave it empty, generic,
or set it to the placeholder word "Review".

RULES FOR RISKS AND ASSUMPTIONS:

risks_and_assumptions MUST NOT be empty when the disruption and
recovery decision involve any genuine uncertainty (e.g. unverified
weather timing, unconfirmed future availability, potential costs).
Include at least 2-3 specific risks or assumptions relevant to this
scenario. An empty list is only acceptable when there is truly zero
residual uncertainty, which is rare.
Each risks_and_assumptions entry, if structured, MUST include both a
"category" (e.g. "creative", "financial", "scheduling", "logistical")
AND a non-empty "description" containing the actual risk or
assumption text. Never return a category label with an empty or
missing description - if you cannot write a specific description,
omit that entry entirely rather than including a label with no
content.


RULES FOR EVIDENCE:

Every claim you place in resource_impact, budget_impact, or
risks_and_assumptions that has an identifiable source (e.g. a named
specialist, "production_data", or a web search result) MUST ALSO
have a corresponding entry in the top-level "evidence" list. Do not
report a sourced finding only inside resource_impact/budget_impact/
risks_and_assumptions and omit it from "evidence" - populate both.
Every entry in resource_impact, budget_impact, and risks_and_assumptions
MUST include actual descriptive text (an "impact" or "description" field
with real content), not just a label and a source. If you have written
a detailed evidence claim about a topic, the corresponding
resource_impact/budget_impact/risks_and_assumptions entry must contain
that same substantive description - do not leave the descriptive text
empty while relying solely on the evidence list to carry the content.



Each evidence entry:
{{
  "claim": "the specific factual claim",
  "source": "the named specialist or origin, e.g. 'Resource & Logistics Specialist'",
  "source_type": "agent_analysis" (specialist reasoning) or "web_research"
    (from the Location & Budget Specialist's search tool) or
    "production_data" (directly from the Production input) or "unknown",
  "confidence": "high", "medium", or "low" based on how well-supported
    the claim is,
  "validation_status": "unverified" unless explicitly confirmed
}}

evidence must not be empty when resource_impact, budget_impact, or
risks_and_assumptions contain sourced findings.

RULES FOR APPROVAL:

The Producer Agent cannot approve or execute a recovery plan.

approval MUST remain:

"pending"

unless the supplied production information explicitly contains
another application-level approval state.

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

  "approval": "pending",

  "score": {{
    "schedule_continuity": 5,
    "location_suitability": 5,
    "resource_impact": 5,
    "budget_impact": 5,
    "operational_risk": 5,
    "weather_resilience": 5,
    "overall": 5.0
  }},

  "evidence": [],

  "candidate_strategies": [],

  "decision_evaluation": null,

  "decision_critique": null,

  "verification_requirements": [],

  "next_actions": [],

  "generated_at": null
}}

Do not fabricate future dates.

Do not claim approval.

Do not claim availability.

Do not treat assumptions as verified facts.

Fields set to null or [] in the structure below (recommended_location,
candidate_strategies, decision_evaluation, decision_critique) MUST
remain null or [] in your response. Do not populate them with your
own content - they are filled in by a separate deterministic system
after your response.

"""


async def _synthesize_recovery_plan(
    production_data: str,
    scheduling_result: str,
    resource_result: str,
    location_result: str,
) -> dict[str, Any]:

    producer_agent = Agent(
        name="producer_synthesis_agent",
        model="gemini-2.5-flash",

        description=(
            "Synthesizes specialist production intelligence into "
            "a grounded recovery recommendation."
        ),
        instruction=(
            "Return only valid JSON. "
            "Never invent production facts, dates, availability, "
            "prices, permits, or weather."
        ),
    )

    prompt = _build_synthesis_prompt(
        production_data,
        scheduling_result,
        resource_result,
        location_result,
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

    except (
        ValueError,
        TypeError,
    ) as error:

        repair_prompt = f"""
The previous Producer Agent response failed validation.

Validation error:
{error}

Previous response:
{result}

Repair the response without changing the underlying decision.

Do NOT invent information.

Future dates that are not explicitly supported MUST be null.

Locations that are not sufficiently supported MUST be null.

Approval MUST remain "pending".

Return ONLY valid JSON using the required Cinevora
RecoveryPlan structure.
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


def _validate_recovery_plan_integrity(
    production: Production,
    recovery_plan: dict[str, Any],
) -> None:
    """
    Deterministic validation before the decision engine.

    This prevents the LLM layer from introducing structurally
    invalid or contradictory production changes.
    """

    scene_ids = {
        scene.scene_id
        for scene in production.scenes
    }

    scheduled_scene_ids = {
        item.scene_id
        for item in production.schedule
    }

    for change in recovery_plan.get(
        "updated_schedule",
        [],
    ):

        scene_id = change.get(
            "scene_id"
        )

        if not scene_id:
            raise ValueError(
                "Recovery plan contains a schedule change "
                "without a scene ID."
            )

        if scene_id not in scene_ids:
            raise ValueError(
                f"Recovery plan references unknown scene "
                f"'{scene_id}'."
            )

        if scene_id not in scheduled_scene_ids:
            raise ValueError(
                f"Recovery plan references scene "
                f"'{scene_id}' which is not scheduled."
            )

        recommended_date = change.get(
            "recommended_date"
        )

        if recommended_date:

            try:
                parsed_date = date.fromisoformat(
                    recommended_date
                )

            except ValueError as error:

                raise ValueError(
                    f"Invalid recommended date "
                    f"'{recommended_date}' for scene "
                    f"'{scene_id}'."
                ) from error

            if parsed_date < date.today():

                raise ValueError(
                    f"Recommended date "
                    f"{recommended_date} for scene "
                    f"'{scene_id}' is in the past."
                )

    location = recovery_plan.get(
        "recommended_location"
    )

    if location:

        if not location.get("name"):
            recovery_plan[
                "recommended_location"
            ] = None


def _merge_decision_engine(
    production: Production,
    recovery_plan: dict[str, Any],
    specialist_results: tuple[str, str, str],
) -> dict[str, Any]:

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

    engine_result = run_decision_engine(
        production.model_dump(),
        specialist_analysis=specialist_analysis,
        evidence=recovery_plan.get(
            "evidence",
            [],
        ),
    )

    strategies = engine_result.get(
        "strategies",
        [],
    )

    selected_strategy = engine_result.get(
        "selected_strategy"
    )

    decision_evaluation = engine_result.get(
        "decision_evaluation"
    )

    decision_critique = engine_result.get(
        "decision_critique"
    )

    verification_requirements = (
        engine_result.get(
            "verification_requirements",
            [],
        )
    )

    next_actions = engine_result.get(
        "next_actions",
        [],
    )

    recovery_plan[
        "candidate_strategies"
    ] = strategies

    recovery_plan[
        "decision_evaluation"
    ] = decision_evaluation

    recovery_plan[
        "decision_critique"
    ] = decision_critique

    recovery_plan[
        "verification_requirements"
    ] = _normalize_string_list(
        verification_requirements
    )

    recovery_plan[
        "next_actions"
    ] = _normalize_string_list(
        next_actions
    )


    if selected_strategy:

        selected_score = selected_strategy.get(
            "score"
        )

        if selected_score:

            score_data = {
                "schedule_continuity": selected_score.get(
                    "schedule_continuity",
                    5,
                ),
                "location_suitability": selected_score.get(
                    "location_suitability",
                    5,
                ),
                "resource_impact": selected_score.get(
                    "resource_feasibility",
                    5,
                ),
                "budget_impact": selected_score.get(
                    "budget_efficiency",
                    5,
                ),
                "operational_risk": selected_score.get(
                    "operational_risk",
                    5,
                ),
                "weather_resilience": selected_score.get(
                    "weather_resilience",
                    5,
                ),
            }


            recovery_plan["score"] = (
                _normalize_score(
                    score_data
                )
            )

        strategy_action = selected_strategy.get(
            "recommended_action"
        )

        if strategy_action:

            recovery_plan[
                "recommended_recovery"
            ] = str(
                strategy_action
            ).strip()

        strategy_description = selected_strategy.get(
            "description"
        )

        if strategy_description:

            existing_reasoning = recovery_plan.get(
                "decision_reasoning",
                "",
            )

            recovery_plan[
                "decision_reasoning"
            ] = (
                f"{strategy_description} "
                f"{existing_reasoning}"
            ).strip()

    return recovery_plan


def _finalize_plan(
    production: Production,
    recovery_plan: dict[str, Any],
) -> dict[str, Any]:
    """
    Final deterministic safety pass.

    This stage ensures the output presented to the UI cannot
    accidentally claim that an unverified action is already executed.
    """

    recovery_plan["approval"] = (
        ApprovalStatus.PENDING.value
    )

    recovery_plan["generated_at"] = (
        datetime.now()
        .astimezone()
        .isoformat()
    )
    verification_requirements = recovery_plan.get(
        "verification_requirements",
        [],
    )

    if recovery_plan.get(
        "updated_schedule"
    ):

        verification_requirements.extend(
            [
                "Confirm crew availability for affected scenes.",
                "Confirm equipment availability for affected scenes.",
                "Confirm production logistics for any schedule changes.",
            ]
        )

    if recovery_plan.get(
        "recommended_location"
    ):

        verification_requirements.extend(
            [
                "Confirm alternative location availability.",
                "Confirm filming permissions and permit requirements.",
                "Confirm location suitability for affected scenes.",
            ]
        )

    recovery_plan[
        "verification_requirements"
    ] = _deduplicate_strings(
        verification_requirements
    )

    next_actions = recovery_plan.get(
        "next_actions",
        [],
    )

    next_actions.extend(
        [
            "Review the selected recovery strategy.",
            "Verify all unresolved operational dependencies.",
            "Obtain explicit production manager approval before execution.",
        ]
    )

    recovery_plan[
        "next_actions"
    ] = _deduplicate_strings(
        next_actions
    )

    return RecoveryPlan.model_validate(
        recovery_plan
    ).model_dump()


def _deduplicate_strings(
    values: list[str],
) -> list[str]:

    result: list[str] = []

    seen: set[str] = set()

    for value in values:

        normalized = str(
            value
        ).strip()

        if not normalized:
            continue

        key = normalized.lower()

        if key in seen:
            continue

        seen.add(key)
        result.append(normalized)

    return result



async def generate_recovery_plan(
    production: Production,
) -> dict[str, Any]:
    """
    Main Cinevora recovery workflow.

    Pipeline:

        Production Input
              ↓
        Specialist Agents
              ↓
        Producer Synthesis
              ↓
        Deterministic Validation
              ↓
        Decision Engine
              ↓
        Final Safety / Verification Layer
              ↓
        RecoveryPlan
    """

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


    recovery_plan = (
        await _synthesize_recovery_plan(
            production_data,
            scheduling_result,
            resource_result,
            location_result,
        )
    )


    _validate_recovery_plan_integrity(
        production,
        recovery_plan,
    )

    recovery_plan = _merge_decision_engine(
        production,
        recovery_plan,
        specialist_results,
    )


    recovery_plan = _finalize_plan(
        production,
        recovery_plan,
    )

    return {
        "plan": recovery_plan,

        "analysis": {
            "scheduling": scheduling_result,

            "resources": resource_result,

            "location_budget": location_result,

            "decision_engine": {
                "candidate_strategies": (
                    recovery_plan.get(
                        "candidate_strategies",
                        [],
                    )
                ),

                "decision_evaluation": (
                    recovery_plan.get(
                        "decision_evaluation"
                    )
                ),

                "decision_critique": (
                    recovery_plan.get(
                        "decision_critique"
                    )
                ),

                "verification_requirements": (
                    recovery_plan.get(
                        "verification_requirements",
                        [],
                    )
                ),

                "next_actions": (
                    recovery_plan.get(
                        "next_actions",
                        [],
                    )
                ),
            },
        },
    }

async def execute_recovery_plan(
    production: Production,
    recovery_plan: RecoveryPlan,
    approved_by: str,
) -> dict[str, Any]:
    """
    Execute a recovery plan that a production manager has approved.

    This does NOT re-run the agent pipeline. It deterministically
    applies the already-approved schedule changes to the Production
    state and returns an audit record. Nothing here invents new
    facts - it only commits what was already reviewed and approved
    by a human.
    """

    if not recovery_plan.updated_schedule:
        raise ValueError(
            "Recovery plan contains no schedule changes to execute."
        )

    scene_ids = {
        scene.scene_id
        for scene in production.scenes
    }

    scheduled_by_scene_id = {
        item.scene_id: item
        for item in production.schedule
    }

    scenes_changed: list[str] = []

    for change in recovery_plan.updated_schedule:

        scene_id = change.scene_id

        if scene_id not in scene_ids:
            raise ValueError(
                f"Cannot execute recovery plan: unknown scene "
                f"'{scene_id}'."
            )

        schedule_item = scheduled_by_scene_id.get(
            scene_id
        )

        if schedule_item is None:
            raise ValueError(
                f"Cannot execute recovery plan: scene "
                f"'{scene_id}' is not currently scheduled."
            )

        recommended_date = change.recommended_date

        if not recommended_date:
  
            raise ValueError(
                f"Cannot execute recovery plan: scene "
                f"'{scene_id}' has no verified recommended date. "
                f"Verification must be completed before execution."
            )

        try:
            parsed_date = date.fromisoformat(
                recommended_date
            )

        except ValueError as error:
            raise ValueError(
                f"Invalid recommended date '{recommended_date}' "
                f"for scene '{scene_id}'."
            ) from error

        schedule_item.date = parsed_date

        scenes_changed.append(scene_id)

    location_committed = False

    if (
        recovery_plan.recommended_location
        and recovery_plan.recommended_location.name
    ):
        production.original_location = Location(
            name=recovery_plan.recommended_location.name,
            indoor=False,
        )

        location_committed = True

    audit = {
        "action": "RECOVERY_EXECUTED",
        "timestamp": datetime.now()
        .astimezone()
        .isoformat(),
        "approved_by": approved_by,
        "scenes_changed": scenes_changed,
        "original_location_preserved": not location_committed,
        "location_change_committed": location_committed,
    }

    return {
        "audit": audit,
        "production_state": production.model_dump(),
    }