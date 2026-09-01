from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Priority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REVISION_REQUESTED = "revision_requested"
    REJECTED = "rejected"
    EXECUTED = "executed"


class ValidationStatus(str, Enum):
    VERIFIED = "verified"
    PARTIALLY_VERIFIED = "partially_verified"
    UNVERIFIED = "unverified"
    NOT_APPLICABLE = "not_applicable"


class Scene(BaseModel):
    scene_id: str
    description: str
    location: str
    duration_hours: float = Field(gt=0)
    indoor: bool = False
    priority: Priority = Priority.NORMAL


class ScheduleItem(BaseModel):
    scene_id: str
    date: date
    start_time: str
    end_time: str


class Location(BaseModel):
    name: str
    address: Optional[str] = None
    indoor: bool = False


class CrewMember(BaseModel):
    name: str
    role: str


class Equipment(BaseModel):
    name: str
    quantity: int = Field(default=1, ge=1)


class Budget(BaseModel):
    total: float = Field(default=0, ge=0)
    spent: float = Field(default=0, ge=0)
    remaining: float = Field(default=0, ge=0)
    committed: float = Field(default=0, ge=0)


class Disruption(BaseModel):
    type: str
    description: str
    affected_date: date
    severity: str = "medium"


class Production(BaseModel):
    project_name: str

    scenes: list[Scene] = Field(default_factory=list)
    schedule: list[ScheduleItem] = Field(default_factory=list)

    original_location: Optional[Location] = None

    crew: list[CrewMember] = Field(default_factory=list)
    equipment: list[Equipment] = Field(default_factory=list)

    budget: Optional[Budget] = None

    disruption: Optional[Disruption] = None


class Evidence(BaseModel):
    claim: str
    source: Optional[str] = None
    source_type: str = "unknown"
    confidence: str = "medium"
    validation_status: ValidationStatus = ValidationStatus.UNVERIFIED


class RecoveryScore(BaseModel):
    schedule_continuity: int = Field(ge=1, le=10)
    location_suitability: int = Field(ge=1, le=10)
    resource_impact: int = Field(ge=1, le=10)
    budget_impact: int = Field(ge=1, le=10)
    operational_risk: int = Field(ge=1, le=10)
    weather_resilience: int = Field(ge=1, le=10)
    overall: float = Field(ge=1, le=10)


class StrategyScore(BaseModel):
    safety: int = Field(ge=1, le=10)
    schedule_continuity: int = Field(ge=1, le=10)
    location_suitability: int = Field(ge=1, le=10)
    resource_feasibility: int = Field(ge=1, le=10)
    budget_efficiency: int = Field(ge=1, le=10)
    weather_resilience: int = Field(ge=1, le=10)
    overall: float = Field(ge=1, le=10)


class DecisionWeights(BaseModel):
    safety: float = Field(default=0.25, ge=0, le=1)
    schedule_continuity: float = Field(default=0.20, ge=0, le=1)
    location_suitability: float = Field(default=0.10, ge=0, le=1)
    resource_feasibility: float = Field(default=0.10, ge=0, le=1)
    budget_efficiency: float = Field(default=0.15, ge=0, le=1)
    weather_resilience: float = Field(default=0.20, ge=0, le=1)

    def total(self) -> float:
        return (
            self.safety
            + self.schedule_continuity
            + self.location_suitability
            + self.resource_feasibility
            + self.budget_efficiency
            + self.weather_resilience
        )


class RecoveryDateCandidate(BaseModel):
    date: date
    scene_ids: list[str] = Field(default_factory=list)

    weather_status: str = "unknown"
    location_status: str = "unknown"
    crew_status: str = "unknown"
    equipment_status: str = "unknown"

    estimated_incremental_cost: Optional[float] = Field(
        default=None,
        ge=0,
    )

    feasibility: str = "unknown"
    confidence: str = "medium"

    advantages: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)

    score: Optional[float] = Field(
        default=None,
        ge=1,
        le=10,
    )


class CandidateStrategy(BaseModel):
    strategy_id: str
    name: str
    description: str
    recommended_action: str

    schedule_impact: str
    budget_impact: str
    resource_impact: str
    location_impact: str

    status: str = "CONDITIONALLY_VIABLE"

    benefits: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)

    score: Optional[StrategyScore] = None

    evidence: list[Evidence] = Field(default_factory=list)

    validation_status: ValidationStatus = (
        ValidationStatus.UNVERIFIED
    )

class DecisionComparison(BaseModel):
    strategy_id: str
    rank: int = Field(ge=1)
    overall_score: float = Field(ge=1, le=10)
    selected: bool = False
    reason: str


class DecisionEvaluation(BaseModel):
    strategies: list[DecisionComparison] = Field(
        default_factory=list
    )

    selected_strategy_id: str

    decision_summary: str

    tradeoffs: list[str] = Field(default_factory=list)

    weights: Optional[DecisionWeights] = None


class DecisionCritique(BaseModel):
    concerns: list[str] = Field(default_factory=list)

    unsupported_claims: list[str] = Field(
        default_factory=list
    )

    missing_information: list[str] = Field(
        default_factory=list
    )

    recommendation_valid: bool

    suggested_revision: Optional[str] = None


class RecommendedLocation(BaseModel):
    name: str
    reason: str
    confidence: str
    status: str = "candidate"
    availability_verified: bool = False
    permit_verified: bool = False
    weather_verified: bool = False
    verification_required: bool = True
    availability_status: str = "unknown"
    validation_status: ValidationStatus = (
        ValidationStatus.UNVERIFIED
    )


class AlternativeOption(BaseModel):
    option: str
    reason_not_selected: str
    evidence: list[Evidence] = Field(default_factory=list)


class ScheduleChange(BaseModel):
    scene_id: str
    original_date: str
    recommended_date: Optional[str] = None
    action: str
    confidence: str = "medium"
    verification_required: bool = True
    verification_reason: Optional[str] = None
    reason: Optional[str] = None
    validation_status: ValidationStatus = (
        ValidationStatus.UNVERIFIED
    )


class RecoveryAudit(BaseModel):
    action: str
    timestamp: datetime
    approved_by: Optional[str] = None
    scenes_changed: list[str] = Field(default_factory=list)
    original_location_preserved: bool = True
    location_change_committed: bool = False


class RecoveryPlan(BaseModel):
    situation: str
    recommended_recovery: str
    recommended_location: Optional[RecommendedLocation] = None
    alternatives_considered: list[AlternativeOption] = Field(
        default_factory=list
    )
    updated_schedule: list[ScheduleChange] = Field(
        default_factory=list
    )
    resource_impact: list[str] = Field(
        default_factory=list
    )
    budget_impact: list[str] = Field(
        default_factory=list
    )
    decision_reasoning: str
    risks_and_assumptions: list[str] = Field(
        default_factory=list
    )
    approval: str = "PENDING_APPROVAL"
    score: Optional[RecoveryScore] = None
    evidence: list[Evidence] = Field(
        default_factory=list
    )
    candidate_strategies: list[CandidateStrategy] = Field(
        default_factory=list
    )
    decision_evaluation: Optional[DecisionEvaluation] = None
    decision_critique: Optional[DecisionCritique] = None
    verification_requirements: list[str] = Field(
        default_factory=list
    )
    next_actions: list[str] = Field(
        default_factory=list
    )
    generated_at: Optional[str] = None