"""per-provider model override on user LLM keys

Revision ID: 0012_user_llm_key_model
Revises: 0011_user_llm_keys
Create Date: 2026-08-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0012_user_llm_key_model"
down_revision: Union[str, Sequence[str], None] = "0011_user_llm_keys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_llm_keys", sa.Column("model", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("user_llm_keys", "model")
