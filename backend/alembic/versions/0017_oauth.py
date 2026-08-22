"""OAuth 2.1 PKCE clients and codes for MCP connectors

Revision ID: 0017_oauth
Revises: 0016_mcp
Create Date: 2026-08-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0017_oauth"
down_revision: Union[str, Sequence[str], None] = "0016_mcp"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "oauth_clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("client_id", sa.String(80), nullable=False),
        sa.Column("name", sa.String(80), nullable=False, server_default="MCP connector"),
        sa.Column("token_endpoint_auth_method", sa.String(40), nullable=False, server_default="none"),
        sa.Column("allow_any_https_redirect", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("redirect_uris", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("scopes", sa.String(80), nullable=False, server_default="mcp:read"),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_oauth_clients_client_id", "oauth_clients", ["client_id"], unique=True)
    op.create_index("ix_oauth_clients_user_id", "oauth_clients", ["user_id"])

    op.create_table(
        "oauth_authorization_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("client_id", sa.String(80), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("redirect_uri", sa.String(500), nullable=False),
        sa.Column("code_challenge", sa.String(128), nullable=False),
        sa.Column("code_challenge_method", sa.String(16), nullable=False, server_default="S256"),
        sa.Column("scope", sa.String(80), nullable=False, server_default="mcp:read"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_oauth_authorization_codes_code_hash", "oauth_authorization_codes", ["code_hash"], unique=True)
    op.create_index("ix_oauth_authorization_codes_client_id", "oauth_authorization_codes", ["client_id"])
    op.create_index("ix_oauth_authorization_codes_user_id", "oauth_authorization_codes", ["user_id"])

    op.create_table(
        "oauth_refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("client_id", sa.String(80), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("scope", sa.String(80), nullable=False, server_default="mcp:read"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_oauth_refresh_tokens_token_hash", "oauth_refresh_tokens", ["token_hash"], unique=True)
    op.create_index("ix_oauth_refresh_tokens_client_id", "oauth_refresh_tokens", ["client_id"])
    op.create_index("ix_oauth_refresh_tokens_user_id", "oauth_refresh_tokens", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_oauth_refresh_tokens_user_id", table_name="oauth_refresh_tokens")
    op.drop_index("ix_oauth_refresh_tokens_client_id", table_name="oauth_refresh_tokens")
    op.drop_index("ix_oauth_refresh_tokens_token_hash", table_name="oauth_refresh_tokens")
    op.drop_table("oauth_refresh_tokens")
    op.drop_index("ix_oauth_authorization_codes_user_id", table_name="oauth_authorization_codes")
    op.drop_index("ix_oauth_authorization_codes_client_id", table_name="oauth_authorization_codes")
    op.drop_index("ix_oauth_authorization_codes_code_hash", table_name="oauth_authorization_codes")
    op.drop_table("oauth_authorization_codes")
    op.drop_index("ix_oauth_clients_user_id", table_name="oauth_clients")
    op.drop_index("ix_oauth_clients_client_id", table_name="oauth_clients")
    op.drop_table("oauth_clients")
