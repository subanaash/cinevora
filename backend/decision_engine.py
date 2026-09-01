from __future__ import annotations

from datetime import date
from typing import Any


WEIGHTS = {
    "safety": 0.25,
    "schedule_continuity": 0.20,
    "location_suitability": 0.15,
    "resource_feasibility": 0.10,
    "budget_efficiency": 0.10,
    "operational_risk": 0.10,
    "weather_resilience": 0.10,
}


CRITICAL_UNKNOWN_TERMS = {
    "unknown",
    "tbd",
    "not confirmed",
    "not verified",
    "unverified",
    "unknown based on available information",
}


def _clamp(
    value: float,
    minimum: float = 1.0,
    maximum: float = 10.0,
) -> float:
    return max(minimum, min(maximum, value))


def _parse_date(value: Any) -> date | None:
    if not isinstance(value, str):
        return None

    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return None


def _is_unknown(value: Any) -> bool:
    if value is None:
        return True

    text = str(value).strip().lower()

    if not text:
        return True

    return text in CRITICAL_UNKNOWN_TERMS


def _contains_any(text: str, markers: list[str]) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in markers)


def _contains_unsafe_language(text: str) -> bool:
    return _contains_any(
        text,
        [
            "continue filming during severe weather",
            "film during severe weather",
            "film despite severe weather",
            "ignore weather warning",
            "proceed despite unsafe",
            "proceed in unsafe conditions",
            "continue despite unsafe",
            "unsafe conditions",
            "dangerous conditions",
            "without safety verification",
            "without weather verification",
        ],
    )


def _contains_unverified_commitment(text: str) -> bool:
    return _contains_any(
        text,
        [
            "confirmed location",
            "confirmed availability",
            "guaranteed availability",
            "guaranteed date",
            "available tomorrow",
            "crew is available",
            "equipment is available",
            "permits are approved",
            "permit is approved",
            "location is secured",
            "location has been secured",
        ],
    )


def _calculate_overall(score: dict[str, float]) -> float:
    weighted_total = sum(
        score[field] * weight
        for field, weight in WEIGHTS.items()
    )

    return round(
        _clamp(weighted_total),
        1,
    )


def _normalize_score(
    score: dict[str, Any],
) -> dict[str, Any]:
    normalized: dict[str, Any] = {}

    for field in WEIGHTS:
        try:
            value = float(score.get(field, 5))
        except (TypeError, ValueError):
            value = 5

        normalized[field] = int(
            round(_clamp(value))
        )

    normalized["overall"] = _calculate_overall(
        normalized
    )

    return normalized


def _extract_affected_scenes(
    production: dict[str, Any],
) -> list[dict[str, Any]]:
    disruption = production.get("disruption") or {}
    affected_date = disruption.get("affected_date")

    schedule = production.get("schedule") or []
    scenes = production.get("scenes") or []

    scene_map = {
        str(scene.get("scene_id")): scene
        for scene in scenes
        if isinstance(scene, dict)
    }

    affected: list[dict[str, Any]] = []

    for item in schedule:
        if not isinstance(item, dict):
            continue

        if item.get("date") != affected_date:
            continue

        scene = scene_map.get(
            str(item.get("scene_id"))
        )

        if scene:
            affected.append(
                {
                    "scene_id": scene.get("scene_id"),
                    "description": scene.get("description"),
                    "location": scene.get("location"),
                    "priority": scene.get(
                        "priority",
                        "normal",
                    ),
                    "indoor": scene.get(
                        "indoor",
                        False,
                    ),
                    "date": item.get("date"),
                    "start_time": item.get("start_time"),
                    "end_time": item.get("end_time"),
                }
            )

    return affected


def _has_high_priority_scene(
    scenes: list[dict[str, Any]],
) -> bool:
    return any(
        str(
            scene.get(
                "priority",
                "",
            )
        ).lower()
        == "high"
        for scene in scenes
    )


def _is_outdoor_scene(
    scene: dict[str, Any],
) -> bool:
    return not bool(
        scene.get(
            "indoor",
            False,
        )
    )


def _weather_is_severe(
    production: dict[str, Any],
) -> bool:
    disruption = production.get("disruption") or {}

    disruption_type = str(
        disruption.get(
            "type",
            "",
        )
    ).lower()

    severity = str(
        disruption.get(
            "severity",
            "medium",
        )
    ).lower()

    severe_markers = [
        "severe",
        "storm",
        "hurricane",
        "tornado",
        "blizzard",
        "extreme",
        "unsafe",
    ]

    return (
        any(
            marker in disruption_type
            for marker in severe_markers
        )
        or severity in {
            "high",
            "critical",
            "severe",
        }
    )


def _build_strategy(
    strategy_id: str,
    name: str,
    description: str,
    action: str,
    score: dict[str, Any],
    benefits: list[str],
    risks: list[str],
    assumptions: list[str],
    status: str,
    reason: str,
) -> dict[str, Any]:
    return {
        "strategy_id": strategy_id,
        "name": name,
        "description": description,
        "recommended_action": action,
        "status": status,
        "schedule_impact": action,
        "budget_impact": (
            "Requires budget validation before commitment."
        ),
        "resource_impact": (
            "Requires resource validation before commitment."
        ),
        "location_impact": (
            "Requires location validation before commitment."
        ),
        "benefits": benefits,
        "risks": risks,
        "assumptions": assumptions,
        "score": _normalize_score(score),
        "reason": reason,
        "safety_gate": "PENDING",
        "evidence_gate": "PENDING",
        "evidence_confidence": 0.0,
        "execution_readiness": "VERIFICATION_REQUIRED",
    }


def generate_candidate_strategies(
    production: dict[str, Any],
    specialist_analysis: dict[str, str] | None = None,
) -> list[dict[str, Any]]:
    disruption = production.get("disruption") or {}
    affected_scenes = _extract_affected_scenes(
        production
    )

    disruption_type = str(
        disruption.get(
            "type",
            "",
        )
    ).lower()

    severe_weather = _weather_is_severe(
        production
    )

    is_weather_disruption = (
        "weather" in disruption_type
        or any(
            marker in disruption_type
            for marker in [
                "storm",
                "rain",
                "snow",
                "wind",
                "hurricane",
                "severe",
                "blizzard",
                "tornado",
            ]
        )
    )

    candidates: list[dict[str, Any]] = []

    if is_weather_disruption:
        candidates.append(
            _build_strategy(
                strategy_id="RESCHEDULE_ORIGINAL",
                name="Controlled Rescheduling",
                description=(
                    "Suspend affected production and preserve the "
                    "original creative plan by moving affected scenes "
                    "to the earliest verified safe production window."
                ),
                action=(
                    "Pause affected outdoor filming and identify the "
                    "earliest verified safe future production window."
                ),
                score={
                    "safety": 10,
                    "schedule_continuity": 8,
                    "location_suitability": 10,
                    "resource_feasibility": 9,
                    "budget_efficiency": 9,
                    "operational_risk": 9,
                    "weather_resilience": (
                        9 if severe_weather else 8
                    ),
                },
                benefits=[
                    "Preserves original locations.",
                    "Preserves creative intent.",
                    "Avoids unsafe production conditions.",
                    "Avoids unnecessary relocation costs.",
                    "Reduces logistical complexity.",
                ],
                risks=[
                    "Creates schedule delay.",
                    "Future location availability must be verified.",
                    "Crew and equipment availability must be reconfirmed.",
                    "A safe production window must be verified.",
                ],
                assumptions=[
                    "Original locations can be rebooked.",
                    "Crew can be rescheduled.",
                    "Equipment can be rescheduled.",
                ],
                status="CONDITIONALLY_VIABLE",
                reason=(
                    "Strong safety and creative-continuity profile with "
                    "lower logistical exposure than an unverified relocation."
                ),
            )
        )

        candidates.append(
            _build_strategy(
                strategy_id="ALTERNATIVE_OUTDOOR_LOCATION",
                name="Verified Outdoor Relocation",
                description=(
                    "Relocate affected exterior scenes to a suitable "
                    "alternative location only after availability, "
                    "permits, weather, resources, and cost are verified."
                ),
                action=(
                    "Identify and independently verify a suitable "
                    "alternative outdoor location before committing."
                ),
                score={
                    "safety": 8 if not severe_weather else 7,
                    "schedule_continuity": 9,
                    "location_suitability": 8,
                    "resource_feasibility": 7,
                    "budget_efficiency": 6,
                    "operational_risk": 6,
                    "weather_resilience": 6,
                },
                benefits=[
                    "May preserve production momentum.",
                    "Can preserve exterior visual requirements.",
                    "Can reduce schedule delay if fully verified.",
                ],
                risks=[
                    "Location availability may be unknown.",
                    "Permit requirements may be unknown.",
                    "Weather conditions may remain uncertain.",
                    "Relocation increases transportation complexity.",
                    "Additional location costs may reduce contingency.",
                ],
                assumptions=[
                    "A suitable location can be secured.",
                    "Required permits can be obtained.",
                    "Crew can travel to the location.",
                    "Equipment can be transported safely.",
                ],
                status="CONDITIONALLY_VIABLE",
                reason=(
                    "Potentially strong for schedule continuity, but only "
                    "becomes execution-ready after critical verification."
                ),
            )
        )

        candidates.append(
            _build_strategy(
                strategy_id="CONTROLLED_INDOOR",
                name="Controlled Indoor Recovery",
                description=(
                    "Move affected scenes into a controlled indoor "
                    "environment to minimize dependence on weather."
                ),
                action=(
                    "Identify and verify an indoor facility capable of "
                    "meeting the creative and technical requirements."
                ),
                score={
                    "safety": 10,
                    "schedule_continuity": 7,
                    "location_suitability": 7,
                    "resource_feasibility": 6,
                    "budget_efficiency": 5,
                    "operational_risk": 8,
                    "weather_resilience": 10,
                },
                benefits=[
                    "Strong weather independence.",
                    "Predictable shooting environment.",
                    "Reduced weather-related operational risk.",
                ],
                risks=[
                    "Facility availability may be unknown.",
                    "Studio costs may increase.",
                    "Set construction may be required.",
                    "Creative fidelity may be reduced.",
                ],
                assumptions=[
                    "Suitable indoor space can be secured.",
                    "Production design can reproduce required visuals.",
                    "Budget can absorb additional facility costs.",
                ],
                status="CONDITIONALLY_VIABLE",
                reason=(
                    "Excellent weather resilience and safety, but weaker "
                    "creative and budget efficiency."
                ),
            )
        )

        candidates.append(
            _build_strategy(
                strategy_id="CONTINUE_UNSAFE",
                name="Continue at Original Location",
                description=(
                    "Continue outdoor production despite the weather "
                    "disruption."
                ),
                action=(
                    "Continue filming at the original outdoor locations."
                ),
                score={
                    "safety": 1,
                    "schedule_continuity": 10,
                    "location_suitability": 10,
                    "resource_feasibility": 2,
                    "budget_efficiency": 8,
                    "operational_risk": 1,
                    "weather_resilience": 1,
                },
                benefits=[
                    "Preserves the original schedule."
                ],
                risks=[
                    "Can expose crew to unsafe conditions.",
                    "Can damage equipment.",
                    "Conflicts with safety-first decision making.",
                ],
                assumptions=[],
                status="REJECTED",
                reason=(
                    "Fails the mandatory crew-safety requirement."
                ),
            )
        )

    else:
        candidates.append(
            _build_strategy(
                strategy_id="CONTROLLED_RESCHEDULE",
                name="Controlled Rescheduling",
                description=(
                    "Move affected production activity to the earliest "
                    "verified feasible future production window."
                ),
                action=(
                    "Identify and verify the earliest feasible future "
                    "production window."
                ),
                score={
                    "safety": 9,
                    "schedule_continuity": 8,
                    "location_suitability": 9,
                    "resource_feasibility": 8,
                    "budget_efficiency": 8,
                    "operational_risk": 8,
                    "weather_resilience": 8,
                },
                benefits=[
                    "Reduces operational uncertainty.",
                    "Preserves production quality.",
                    "Avoids unnecessary relocation.",
                ],
                risks=[
                    "May introduce schedule delay.",
                    "Resources require revalidation.",
                ],
                assumptions=[
                    "Affected resources can be rescheduled."
                ],
                status="CONDITIONALLY_VIABLE",
                reason=(
                    "Strong general recovery path when no safer "
                    "evidence-supported alternative is available."
                ),
            )
        )

    return candidates


def apply_safety_gate(
    strategy: dict[str, Any],
    production: dict[str, Any],
) -> dict[str, Any]:
    text = " ".join(
        [
            str(strategy.get("name", "")),
            str(strategy.get("description", "")),
            str(strategy.get("recommended_action", "")),
        ]
    )

    if _contains_unsafe_language(text):
        strategy["status"] = "REJECTED"
        strategy["safety_gate"] = "FAIL"
        strategy["reason"] = (
            "Rejected because the strategy conflicts with "
            "mandatory crew-safety requirements."
        )
        return strategy

    score = strategy.get("score") or {}

    try:
        safety = float(
            score.get(
                "safety",
                5,
            )
        )
    except (TypeError, ValueError):
        safety = 5

    if safety < 5:
        strategy["status"] = "REJECTED"
        strategy["safety_gate"] = "FAIL"
        strategy["reason"] = (
            "Rejected because its safety score is below "
            "the minimum acceptable threshold."
        )
        return strategy

    strategy["safety_gate"] = "PASS"

    return strategy


def _strategy_critical_unknowns(
    strategy: dict[str, Any],
) -> list[str]:
    combined = " ".join(
        [
            str(strategy.get("description", "")),
            str(strategy.get("recommended_action", "")),
            *[
                str(item)
                for item in strategy.get(
                    "risks",
                    [],
                )
            ],
        ]
    ).lower()

    unknowns: list[str] = []

    categories = {
        "availability": [
            "availability",
            "available",
            "secured",
        ],
        "permit": [
            "permit",
            "permission",
        ],
        "weather": [
            "weather",
            "weather window",
        ],
        "crew": [
            "crew",
        ],
        "equipment": [
            "equipment",
        ],
        "budget": [
            "budget",
            "cost",
            "costs",
        ],
        "location": [
            "location",
            "facility",
        ],
    }

    for category, markers in categories.items():
        if any(
            marker in combined
            for marker in markers
        ):
            unknowns.append(category)

    return unknowns


def calculate_evidence_confidence(
    strategy: dict[str, Any],
    evidence: list[dict[str, Any]],
) -> float:
    if not evidence:
        return 0.0

    critical_categories = (
        _strategy_critical_unknowns(strategy)
    )

    if not critical_categories:
        return 100.0

    category_scores: list[float] = []

    for category in critical_categories:
        relevant = []

        for item in evidence:
            if not isinstance(item, dict):
                continue

            claim = str(
                item.get(
                    "claim",
                    "",
                )
            ).lower()

            source_type = str(
                item.get(
                    "source_type",
                    "unknown",
                )
            ).lower()

            confidence = str(
                item.get(
                    "confidence",
                    "medium",
                )
            ).lower()

            if category in claim:
                if confidence == "high":
                    value = 100.0
                elif confidence == "medium":
                    value = 70.0
                elif confidence == "low":
                    value = 35.0
                else:
                    value = 0.0

                if source_type == "unknown":
                    value *= 0.5

                relevant.append(value)

        category_scores.append(
            max(relevant)
            if relevant
            else 0.0
        )

    return round(
        sum(category_scores)
        / len(category_scores),
        1,
    )


def _apply_evidence_adjustment(
    strategy: dict[str, Any],
) -> dict[str, Any]:
    score = strategy.get("score") or {}

    confidence = float(
        strategy.get(
            "evidence_confidence",
            0,
        )
    )

    status = strategy.get(
        "status",
        "CONDITIONALLY_VIABLE",
    )

    if status == "REJECTED":
        return strategy

    if confidence < 35:
        penalty = 1.5
    elif confidence < 60:
        penalty = 0.8
    elif confidence < 80:
        penalty = 0.3
    else:
        penalty = 0.0

    for field in WEIGHTS:
        score[field] = int(
            round(
                _clamp(
                    float(score.get(field, 5))
                    - penalty
                )
            )
        )

    score["overall"] = _calculate_overall(
        score
    )

    strategy["score"] = score

    if confidence >= 80:
        strategy["execution_readiness"] = (
            "HIGH_CONFIDENCE_PENDING_FINAL_VERIFICATION"
        )
    elif confidence >= 60:
        strategy["execution_readiness"] = (
            "MODERATE_CONFIDENCE_VERIFICATION_REQUIRED"
        )
    else:
        strategy["execution_readiness"] = (
            "LOW_CONFIDENCE_VERIFICATION_REQUIRED"
        )

    return strategy

def _apply_certainty_bonus(
    strategy: dict[str, Any],
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Reward strategies backed by strong, traceable evidence (high
    confidence AND a real source - production data or web research,
    not just agent reasoning) with a modest score bonus. This checks
    the evidence's actual source and confidence fields rather than
    scanning claim text for specific wording, so it fires consistently
    regardless of how the model happens to phrase a given fact.
    """

    if strategy.get("status") == "REJECTED":
        return strategy

    strong_evidence = [
        item for item in evidence
        if isinstance(item, dict)
        and str(item.get("confidence", "")).lower() == "high"
        and str(item.get("source_type", "")).lower() in {
            "production_data",
            "web_research",
        }
    ]

    if len(strong_evidence) < 3:
        return strategy

    score = strategy.get("score") or {}

    bonus_fields = [
        "schedule_continuity",
        "resource_feasibility",
        "budget_efficiency",
        "weather_resilience",
    ]

    for field in bonus_fields:
        current = float(score.get(field, 5))
        score[field] = int(round(_clamp(current + 1)))

    score["overall"] = _calculate_overall(score)
    strategy["score"] = score

    return strategy


def validate_strategy(
    strategy: dict[str, Any],
    production: dict[str, Any],
    evidence: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    evidence = evidence or []

    strategy = apply_safety_gate(
        strategy,
        production,
    )

    action_text = " ".join(
        [
            str(strategy.get("description", "")),
            str(strategy.get("recommended_action", "")),
        ]
    )

    if _contains_unverified_commitment(
        action_text
    ):
        strategy["evidence_gate"] = "FAIL"
        strategy["status"] = (
            "CONDITIONALLY_VIABLE"
            if strategy.get("status") != "REJECTED"
            else "REJECTED"
        )
        strategy["reason"] = (
            "Execution commitment requires independent "
            "verification before approval."
        )
    else:
        strategy["evidence_gate"] = "PASS"

    strategy["evidence_confidence"] = (
        calculate_evidence_confidence(
            strategy,
            evidence,
        )
    )

    strategy = _apply_evidence_adjustment(
        strategy
    )
    strategy = _apply_certainty_bonus(
        strategy,
        evidence,
    )    

    return strategy


def rank_strategies(
    strategies: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    def ranking_score(
        strategy: dict[str, Any],
    ) -> float:
        if (
            strategy.get("status")
            == "REJECTED"
        ):
            return -1.0

        score = strategy.get("score") or {}

        overall = float(
            score.get(
                "overall",
                0,
            )
        )

        confidence = float(
            strategy.get(
                "evidence_confidence",
                0,
            )
        )

        readiness_bonus = (
            0.25
            if confidence >= 80
            else 0.0
        )

        return (
            overall
            + readiness_bonus
        )

    ranked = sorted(
        strategies,
        key=ranking_score,
        reverse=True,
    )

    for index, strategy in enumerate(
        ranked,
        start=1,
    ):
        strategy["rank"] = index

    return ranked


def select_strategy(
    strategies: list[dict[str, Any]],
) -> dict[str, Any]:
    viable = [
        strategy
        for strategy in strategies
        if strategy.get("status")
        != "REJECTED"
        and strategy.get("safety_gate")
        != "FAIL"
    ]

    if not viable:
        return {
            "selected_strategy_id": None,
            "decision_status": "NO_SAFE_STRATEGY",
            "reason": (
                "No candidate strategy passed "
                "the mandatory safety gate."
            ),
        }

    viable.sort(
        key=lambda strategy: (
            float(
                (
                    strategy.get("score")
                    or {}
                ).get(
                    "overall",
                    0,
                )
            ),
            float(
                strategy.get(
                    "evidence_confidence",
                    0,
                )
            ),
        ),
        reverse=True,
    )

    selected = viable[0]

    selected["status"] = "RECOMMENDED"

    if (
        selected.get(
            "evidence_gate"
        )
        == "FAIL"
    ):
        decision_status = (
            "DECISION_READY_WITH_VERIFICATION"
        )
    else:
        decision_status = "DECISION_READY"

    return {
        "selected_strategy_id": selected.get(
            "strategy_id"
        ),
        "decision_status": decision_status,
        "reason": selected.get(
            "reason",
            "",
        ),
    }


def build_decision_evaluation(
    strategies: list[dict[str, Any]],
    selected_strategy_id: str | None,
) -> dict[str, Any]:
    comparisons: list[dict[str, Any]] = []

    for strategy in strategies:
        score = strategy.get("score") or {}

        selected = (
            strategy.get(
                "strategy_id"
            )
            == selected_strategy_id
        )

        comparisons.append(
            {
                "strategy_id": strategy.get(
                    "strategy_id"
                ),
                "rank": strategy.get(
                    "rank",
                    0,
                ),
                "overall_score": float(
                    score.get(
                        "overall",
                        0,
                    )
                ),
                "evidence_confidence": float(
                    strategy.get(
                        "evidence_confidence",
                        0,
                    )
                ),
                "selected": selected,
                "reason": strategy.get(
                    "reason",
                    "Evaluated against production constraints.",
                ),
                "status": strategy.get(
                    "status",
                    "CONDITIONALLY_VIABLE",
                ),
                "safety_gate": strategy.get(
                    "safety_gate",
                    "PENDING",
                ),
                "evidence_gate": strategy.get(
                    "evidence_gate",
                    "PENDING",
                ),
                "execution_readiness": strategy.get(
                    "execution_readiness",
                    "VERIFICATION_REQUIRED",
                ),
            }
        )

    selected_strategy = next(
        (
            strategy
            for strategy in strategies
            if strategy.get(
                "strategy_id"
            )
            == selected_strategy_id
        ),
        None,
    )

    tradeoffs = (
        selected_strategy.get(
            "risks",
            [],
        )
        if selected_strategy
        else []
    )

    return {
        "strategies": comparisons,
        "selected_strategy_id": selected_strategy_id,
        "decision_summary": (
            selected_strategy.get(
                "description",
                "",
            )
            if selected_strategy
            else (
                "No safe recovery strategy "
                "is currently available."
            )
        ),
        "tradeoffs": tradeoffs,
    }


def build_verification_requirements(
    production: dict[str, Any],
    selected_strategy: dict[str, Any] | None,
) -> list[str]:
    if selected_strategy is None:
        return [
            "Identify at least one recovery strategy that satisfies the safety gate."
        ]

    strategy_id = selected_strategy.get(
        "strategy_id"
    )

    if strategy_id in {
        "RESCHEDULE_ORIGINAL",
        "CONTROLLED_RESCHEDULE",
    }:
        return [
            "Confirm the earliest safe production window.",
            "Confirm original location availability.",
            "Confirm crew availability.",
            "Confirm equipment availability.",
            "Revalidate transportation and logistics.",
            "Recalculate the revised budget.",
            "Validate all affected scene dates before approval.",
        ]

    if strategy_id == "ALTERNATIVE_OUTDOOR_LOCATION":
        return [
            "Verify alternative location availability.",
            "Verify filming permits and access conditions.",
            "Verify safe weather conditions for the proposed date.",
            "Confirm crew availability.",
            "Confirm equipment availability.",
            "Obtain transportation and relocation estimates.",
            "Validate location suitability against each affected scene.",
            "Validate that the revised plan remains within contingency.",
        ]

    if strategy_id == "CONTROLLED_INDOOR":
        return [
            "Verify indoor facility availability.",
            "Confirm filming permissions.",
            "Confirm facility technical requirements.",
            "Obtain facility and production-design estimates.",
            "Confirm crew availability.",
            "Confirm equipment requirements.",
            "Validate the revised budget.",
        ]

    return [
        "Confirm resource availability.",
        "Confirm location feasibility.",
        "Validate schedule impact.",
        "Validate budget impact.",
    ]


def build_next_actions(
    production: dict[str, Any],
    selected_strategy: dict[str, Any] | None,
) -> list[str]:
    if selected_strategy is None:
        return [
            "Suspend unsafe production activity.",
            "Request missing production information.",
            "Re-run recovery analysis after verification.",
        ]

    strategy_id = selected_strategy.get(
        "strategy_id"
    )

    if strategy_id in {
        "RESCHEDULE_ORIGINAL",
        "CONTROLLED_RESCHEDULE",
    }:
        return [
            "Suspend affected outdoor filming on the disrupted date.",
            "Identify the earliest safe production window.",
            "Verify original location availability.",
            "Confirm crew and equipment availability.",
            "Update affected scene dates only after verification.",
            "Recalculate budget and schedule exposure.",
            "Submit the verified recovery plan for production-manager approval.",
        ]

    if strategy_id == "ALTERNATIVE_OUTDOOR_LOCATION":
        return [
            "Identify suitable alternative locations.",
            "Verify location availability and permits.",
            "Verify weather conditions for the proposed production window.",
            "Confirm crew and equipment availability.",
            "Obtain relocation and transportation estimates.",
            "Validate scene-to-location suitability.",
            "Recalculate budget exposure.",
            "Submit the verified relocation plan for approval.",
        ]

    if strategy_id == "CONTROLLED_INDOOR":
        return [
            "Identify suitable indoor facilities.",
            "Verify availability and permissions.",
            "Confirm technical and production-design requirements.",
            "Obtain facility cost estimates.",
            "Confirm crew and equipment requirements.",
            "Validate budget impact.",
            "Submit the verified indoor recovery plan for approval.",
        ]

    return [
        "Verify the proposed recovery conditions.",
        "Confirm schedule and resource availability.",
        "Validate budget impact.",
        "Submit the recovery plan for approval.",
    ]


def run_decision_engine(
    production: dict[str, Any],
    specialist_analysis: dict[str, str] | None = None,
    evidence: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    evidence = evidence or []

    strategies = generate_candidate_strategies(
        production,
        specialist_analysis,
    )

    validated = [
        validate_strategy(
            strategy,
            production,
            evidence,
        )
        for strategy in strategies
    ]

    ranked = rank_strategies(
        validated
    )

    selection = select_strategy(
        ranked
    )

    selected_strategy = next(
        (
            strategy
            for strategy in ranked
            if strategy.get(
                "strategy_id"
            )
            == selection.get(
                "selected_strategy_id"
            )
        ),
        None,
    )

    decision_evaluation = (
        build_decision_evaluation(
            ranked,
            selection.get(
                "selected_strategy_id"
            ),
        )
    )

    verification_requirements = (
        build_verification_requirements(
            production,
            selected_strategy,
        )
    )

    next_actions = build_next_actions(
        production,
        selected_strategy,
    )

    return {
        "strategies": ranked,
        "selected_strategy": selected_strategy,
        "decision_status": selection.get(
            "decision_status"
        ),
        "decision_reason": selection.get(
            "reason"
        ),
        "decision_evaluation": decision_evaluation,
        "verification_requirements": verification_requirements,
        "next_actions": next_actions,
    }