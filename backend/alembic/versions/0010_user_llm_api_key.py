"""per-user LLM provider API key

Revision ID: 0010_user_llm_api_key
Revises: 0009_interview_signals
Create Date: 2026-08-17

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_user_llm_api_key"
down_revision: Union[str, Sequence[str], None] = "0009_interview_signals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("llm_provider", sa.String(40), nullable=True))
    op.add_column("users", sa.Column("llm_api_key_encrypted", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("llm_api_key_hint", sa.String(16), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "llm_api_key_hint")
    op.drop_column("users", "llm_api_key_encrypted")
    op.drop_column("users", "llm_provider")
