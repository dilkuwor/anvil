"""user notes for lessons, problems, and system design

Revision ID: 0015_notes
Revises: 0014_interview_message_reasoning
Create Date: 2026-08-20

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0015_notes"
down_revision: Union[str, Sequence[str], None] = "0014_interview_message_reasoning"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_type", sa.String(32), nullable=False, server_default="LESSON"),
        sa.Column("source_id", sa.String(200), nullable=False),
        sa.Column("source_title", sa.String(200), nullable=False, server_default=""),
        sa.Column("source_href", sa.String(400), nullable=False, server_default=""),
        sa.Column("kind", sa.String(20), nullable=False, server_default="MANUAL"),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_notes_user_id", "notes", ["user_id"])
    op.create_index("ix_notes_source_type", "notes", ["source_type"])
    op.create_index("ix_notes_source_id", "notes", ["source_id"])
    op.create_index("ix_notes_user_source", "notes", ["user_id", "source_type", "source_id"])


def downgrade() -> None:
    op.drop_index("ix_notes_user_source", table_name="notes")
    op.drop_index("ix_notes_source_id", table_name="notes")
    op.drop_index("ix_notes_source_type", table_name="notes")
    op.drop_index("ix_notes_user_id", table_name="notes")
    op.drop_table("notes")
