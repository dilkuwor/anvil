"""store OpenRouter reasoning_details on interview messages

Revision ID: 0014_interview_message_reasoning
Revises: 0013_system_design_interviews
Create Date: 2026-08-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014_interview_message_reasoning"
down_revision: Union[str, Sequence[str], None] = "0013_system_design_interviews"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("interview_messages", sa.Column("reasoning_details", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("interview_messages", "reasoning_details")
