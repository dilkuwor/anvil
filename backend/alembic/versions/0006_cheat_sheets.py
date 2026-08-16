"""cheat sheets catalog

Revision ID: 0006_cheat_sheets
Revises: 0005_user_display_avatar
Create Date: 2026-08-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_cheat_sheets"
down_revision: Union[str, Sequence[str], None] = "0005_user_display_avatar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cheat_sheets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False, server_default="12"),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_cheat_sheets_slug", "cheat_sheets", ["slug"], unique=True)

    op.create_table(
        "cheat_sheet_sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "cheat_sheet_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cheat_sheets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_cheat_sheet_sections_cheat_sheet_id", "cheat_sheet_sections", ["cheat_sheet_id"])
    op.create_unique_constraint("uq_cheat_sheet_section_slug", "cheat_sheet_sections", ["cheat_sheet_id", "slug"])

    op.create_table(
        "cheat_sheet_section_contents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "section_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cheat_sheet_sections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("title", sa.String(160), nullable=False, server_default=""),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("items", postgresql.JSONB(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_cheat_sheet_section_contents_section_id", "cheat_sheet_section_contents", ["section_id"])


def downgrade() -> None:
    op.drop_table("cheat_sheet_section_contents")
    op.drop_table("cheat_sheet_sections")
    op.drop_table("cheat_sheets")
