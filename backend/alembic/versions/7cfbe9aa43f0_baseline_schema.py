"""baseline schema

Revision ID: 7cfbe9aa43f0
Revises: 
Create Date: 2026-07-02 20:50:23.566625

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7cfbe9aa43f0'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Batch mode is required for SQLite, which can't ALTER TABLE to add a
    # foreign key constraint directly - it rebuilds the table under the hood.
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.add_column(sa.Column('linked_debt_id', sa.String(), nullable=True))
        batch_op.create_foreign_key('fk_transactions_linked_debt_id', 'debts', ['linked_debt_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.drop_constraint('fk_transactions_linked_debt_id', type_='foreignkey')
        batch_op.drop_column('linked_debt_id')
