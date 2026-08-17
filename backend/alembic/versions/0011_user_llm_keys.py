"""store LLM API keys per provider

Revision ID: 0011_user_llm_keys
Revises: 0010_user_llm_api_key
Create Date: 2026-08-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011_user_llm_keys"
down_revision: Union[str, Sequence[str], None] = "0010_user_llm_api_key"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_llm_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("api_key_encrypted", sa.Text(), nullable=False),
        sa.Column("api_key_hint", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "provider", name="uq_user_llm_key_provider"),
    )
    op.create_index("ix_user_llm_keys_user_id", "user_llm_keys", ["user_id"])
    op.execute(
        """
        INSERT INTO user_llm_keys (id, user_id, provider, api_key_encrypted, api_key_hint)
        SELECT gen_random_uuid(), id, llm_provider, llm_api_key_encrypted, COALESCE(llm_api_key_hint, '••••')
        FROM users
        WHERE llm_provider IS NOT NULL
          AND llm_api_key_encrypted IS NOT NULL
          AND llm_api_key_encrypted <> ''
        """
    )


def downgrade() -> None:
    op.drop_index("ix_user_llm_keys_user_id", table_name="user_llm_keys")
    op.drop_table("user_llm_keys")
