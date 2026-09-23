import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.database import Base


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    constraints: Mapped[str] = mapped_column(Text, nullable=False, default="")
    input_format: Mapped[str] = mapped_column(Text, nullable=False, default="")
    output_format: Mapped[str] = mapped_column(Text, nullable=False, default="")
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    hints: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    examples: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    time_complexity: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    space_complexity: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    starter_code: Mapped[str] = mapped_column(Text, nullable=False, default="")
    function_signature: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    reference_solution: Mapped[str] = mapped_column(Text, nullable=False, default="")
    time_limit_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)
    memory_limit_kb: Mapped[int] = mapped_column(Integer, nullable=False, default=262144)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    tags = relationship("Tag", secondary="problem_tags", back_populates="problems")
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="problem")
    progress = relationship("UserProblemProgress", back_populates="problem")
    solution = relationship("ProblemSolution", back_populates="problem", uselist=False, cascade="all, delete-orphan")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)

    problems = relationship("Problem", secondary="problem_tags", back_populates="tags")


class ProblemTag(Base):
    __tablename__ = "problem_tags"
    __table_args__ = (UniqueConstraint("problem_id", "tag_id", name="uq_problem_tag"),)

    problem_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )


class TestCase(Base):
    __test__ = False
    __tablename__ = "test_cases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), index=True, nullable=False
    )
    input: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    execution_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    problem = relationship("Problem", back_populates="test_cases")
    results = relationship("SubmissionTestResult", back_populates="test_case")


class ProblemSolution(Base):
    """The written reference for a problem: what the Solution tab shows. One row per problem."""

    __tablename__ = "problem_solutions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    # The one or two sentences to remember. Same words as the Visual Story's card when there is one.
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    pattern: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    # How to recognise this kind of problem: "when you see ...".
    trigger: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # {"input": str, "columns": [str], "rows": [[str]], "result": str}
    walkthrough: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # [{"name": str, "wrong": str, "right": str}]
    mistakes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # [{"input": str, "expected": str, "why": str}]
    edge_cases: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # What to say out loud, one short line per step.
    interview_script: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # [{"question": str, "answer": str}]
    follow_ups: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    related_slugs: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    problem = relationship("Problem", back_populates="solution")
    approaches = relationship(
        "ProblemSolutionApproach",
        back_populates="solution",
        cascade="all, delete-orphan",
        order_by="ProblemSolutionApproach.position",
    )


class ProblemSolutionApproach(Base):
    """One way to solve it, ordered from the obvious way to the best one."""

    __tablename__ = "problem_solution_approaches"
    __table_args__ = (UniqueConstraint("solution_id", "position", name="uq_solution_approach_position"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("problem_solutions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    idea: Mapped[str] = mapped_column(Text, nullable=False, default="")
    steps: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    language: Mapped[str] = mapped_column(String(20), nullable=False, default="JAVA")
    code: Mapped[str] = mapped_column(Text, nullable=False, default="")
    time_complexity: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    time_why: Mapped[str] = mapped_column(Text, nullable=False, default="")
    space_complexity: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    space_why: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # When you would mention this one in an interview.
    when_to_use: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_optimal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # A different algorithm that also solves the problem, shown after the best one for breadth.
    is_alternative: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    solution = relationship("ProblemSolution", back_populates="approaches")
