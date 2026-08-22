"""MCP personal access tokens and access log

Revision ID: 0016_mcp
Revises: 0015_notes
Create Date: 2026-08-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0016_mcp"
down_revision: Union[str, Sequence[str], None] = "0015_notes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mcp_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(80), nullable=False, server_default="MCP token"),
        sa.Column("token_prefix", sa.String(16), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("scopes", sa.String(80), nullable=False, server_default="mcp:read"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_mcp_tokens_user_id", "mcp_tokens", ["user_id"])
    op.create_index("ix_mcp_tokens_token_hash", "mcp_tokens", ["token_hash"], unique=True)

    op.create_table(
        "mcp_access_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "token_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mcp_tokens.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("method", sa.String(80), nullable=False),
        sa.Column("name", sa.String(200), nullable=False, server_default=""),
        sa.Column("status", sa.String(40), nullable=False, server_default="ok"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_mcp_access_logs_user_id", "mcp_access_logs", ["user_id"])
    op.create_index("ix_mcp_access_logs_token_id", "mcp_access_logs", ["token_id"])
    op.create_index("ix_mcp_access_logs_created_at", "mcp_access_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_mcp_access_logs_created_at", table_name="mcp_access_logs")
    op.drop_index("ix_mcp_access_logs_token_id", table_name="mcp_access_logs")
    op.drop_index("ix_mcp_access_logs_user_id", table_name="mcp_access_logs")
    op.drop_table("mcp_access_logs")
    op.drop_index("ix_mcp_tokens_token_hash", table_name="mcp_tokens")
    op.drop_index("ix_mcp_tokens_user_id", table_name="mcp_tokens")
    op.drop_table("mcp_tokens")
