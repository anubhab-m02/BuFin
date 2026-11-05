"""add token_version to users

Lets the server revoke every token issued to a user (password change) by bumping this number;
tokens carry the version they were issued under. Existing rows get 0, which is also what tokens
issued before this column existed are treated as, so nobody is signed out by the upgrade.

Revision ID: c155a7e0b4d1
Revises: dba4e9379fb6
Create Date: 2026-11-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c155a7e0b4d1'
down_revision: Union[str, Sequence[str], None] = 'dba4e9379fb6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('token_version')
