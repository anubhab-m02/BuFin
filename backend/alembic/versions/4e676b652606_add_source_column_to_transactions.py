"""add source column to transactions

Revision ID: 4e676b652606
Revises: 3d52f3495e78
Create Date: 2026-07-03 17:54:14.695102

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e676b652606'
down_revision: Union[str, Sequence[str], None] = '3d52f3495e78'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.add_column(sa.Column('source', sa.String(), nullable=True, server_default='manual'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.drop_column('source')
