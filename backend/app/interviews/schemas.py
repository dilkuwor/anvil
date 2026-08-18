from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InterviewMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: str
    content: str
    created_at: datetime


class InterviewScoresOut(BaseModel):
    understanding: float
    approach: float
    coding: float
    correctness: float
    complexity: float
    communication: float
    reasoning: float
    follow_up: float
    overall: float


class InterviewObjectiveOut(BaseModel):
    tests_passed: int
    tests_total: int
    submission_accepted: bool
    submissions: int
    wrong_attempts: int
    hints_used: int
    time_taken_seconds: int
    runtime_ms: int | None
    memory_kb: int | None


class InterviewFeedbackOut(BaseModel):
    overall: float
    scores: InterviewScoresOut
    objective: InterviewObjectiveOut
    strengths: list[str]
    improvements: list[str]
    summary: str


class InterviewSessionOut(BaseModel):
    id: UUID
    problem_id: UUID | None
    problem_title: str
    problem_slug: str
    difficulty: str
    kind: str = "CODING"
    scenario_slug: str | None = None
    scenario: dict | None = None
    architecture: dict | None = None
    phase: str
    phase_label: str
    duration_seconds: int
    remaining_seconds: int
    hints_used: int
    run_count: int
    submit_count: int
    accepted: bool
    wrong_attempts: int
    last_run_passed: int
    last_run_total: int
    last_runtime_ms: int | None
    last_memory_kb: int | None
    last_status: str | None
    started_at: datetime
    ended_at: datetime | None
    completed: bool
    messages: list[InterviewMessageOut]
    feedback: InterviewFeedbackOut | None = None


class ActiveInterviewResponse(BaseModel):
    session: InterviewSessionOut | None = None


class StartInterviewRequest(BaseModel):
    problem_id: UUID


class StartSystemDesignRequest(BaseModel):
    scenario_slug: str = Field(min_length=1, max_length=80)


class ArchitectureUpdateRequest(BaseModel):
    architecture: dict


class ScenarioWorkloadOut(BaseModel):
    dau: int
    requests_per_user_day: float
    read_ratio: float
    peak_multiplier: float


class SimulatorSampleNodeOut(BaseModel):
    id: str
    type: str
    label: str
    x: float
    y: float
    config: dict = {}


class SimulatorSampleEdgeOut(BaseModel):
    id: str
    source: str
    target: str
    label: str | None = None


class SimulatorSampleWorkloadOut(BaseModel):
    dau: int
    concurrent_users: int
    requests_per_user_day: float
    read_ratio: float
    avg_request_bytes: int
    avg_response_bytes: int
    peak_multiplier: float
    traffic_growth: float


class SimulatorSampleSloOut(BaseModel):
    availability: float
    p95_ms: float
    p99_ms: float
    error_rate: float
    rpo_seconds: int
    rto_seconds: int


class SimulatorSampleOut(BaseModel):
    slug: str
    name: str
    summary: str
    difficulty: str
    workload: SimulatorSampleWorkloadOut
    slo: SimulatorSampleSloOut
    nodes: list[SimulatorSampleNodeOut]
    edges: list[SimulatorSampleEdgeOut]


class SystemDesignScenarioOut(BaseModel):
    slug: str
    title: str
    difficulty: str
    summary: str
    prompt: str
    functional_requirements: list[str]
    non_functional_requirements: list[str]
    constraints: list[str]
    assumptions: list[str]
    learn_slug: str | None = None
    sample_slug: str | None = None
    workload: ScenarioWorkloadOut | None = None
    sample: SimulatorSampleOut | None = None


class InterviewMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class InterviewEventRequest(BaseModel):
    type: str = Field(pattern="^(RUN|SUBMIT)$")
    status: str
    passed: int = 0
    total: int = 0
    runtime_ms: int | None = None
    memory_kb: int | None = None
