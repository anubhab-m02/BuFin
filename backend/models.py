from sqlalchemy import (
    CheckConstraint, Column, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, text,
)
from database import Base

# Money is stored as exact NUMERIC(15,2) (up to 999,999,999,999.99) but handed to Python as a
# float (asdecimal=False): the money maths in the routers is float arithmetic and stays that
# way, while the database can no longer hold 0.1+0.2-style drift or an amount with 3 decimals.
Money = Numeric(15, 2, asdecimal=False)
Rate = Numeric(7, 4, asdecimal=False)
Timestamp = DateTime(timezone=True)

# ondelete rules mirror what routers/auth.py delete_account and routers/households.py do by hand,
# so a missed code path cannot orphan rows: personal data CASCADEs with the account, rows shared
# with other people are anonymised (SET NULL) so a household's ledger does not change when one
# member leaves, and pointers from a row that must survive are cleared (SET NULL).


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint("type IN ('income', 'expense')", name="type_valid"),
        CheckConstraint("necessity IN ('fixed', 'variable', 'essential')", name="necessity_valid"),
        # Personal ledger and paging: WHERE user_id = ? [AND household_id IS NULL] ORDER BY date DESC.
        Index("ix_transactions_user_date", "user_id", text("date DESC"), text("id DESC")),
        Index("ix_transactions_household_date", "household_id", text("date DESC"), text("id DESC"), postgresql_where=text("household_id IS NOT NULL")),
        Index("ix_transactions_linked_debt_id", "linked_debt_id", postgresql_where=text("linked_debt_id IS NOT NULL")),
        # One materialized occurrence per recurring plan and day; NULL plan ids (manual entries) are unconstrained.
        Index("uq_transactions_recurring_plan_date", "recurring_plan_id", "date", unique=True, postgresql_where=text("recurring_plan_id IS NOT NULL")),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"))  # NULL = member deleted their account (household rows only)
    date = Column(Date, nullable=False)
    amount = Column(Money, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=False)
    merchant = Column(String)
    type = Column(String, nullable=False)  # 'income' or 'expense'
    necessity = Column(String, nullable=False, default="variable", server_default="variable")  # 'fixed', 'variable' or 'essential'
    remarks = Column(String, nullable=True)
    linked_debt_id = Column(String, ForeignKey("debts.id", ondelete="SET NULL"), nullable=True)  # set for auto-created debt repayment transactions
    household_id = Column(String, ForeignKey("households.id", ondelete="SET NULL"), nullable=True)  # null = personal transaction
    recurring_plan_id = Column(String, ForeignKey("recurring_plans.id", ondelete="SET NULL"), nullable=True)  # set for auto-materialized recurring occurrences


class RecurringPlan(Base):
    __tablename__ = "recurring_plans"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint("type IN ('income', 'expense')", name="type_valid"),
        CheckConstraint("frequency IN ('monthly', 'weekly', 'yearly')", name="frequency_valid"),
        Index("ix_recurring_plans_user_id", "user_id"),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    amount = Column(Money, nullable=False)
    type = Column(String, nullable=False)
    frequency = Column(String, nullable=False)
    expectedDate = Column(String, nullable=False)  # day of month, or 'last' / 'last-working' - not a calendar date
    endDate = Column(Date, nullable=True)


class Debt(Base):
    __tablename__ = "debts"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint("direction IN ('payable', 'receivable')", name="direction_valid"),
        CheckConstraint("status IN ('active', 'repaid')", name="status_valid"),
        Index("ix_debts_user_id", "user_id"),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    personName = Column(String, nullable=False)
    amount = Column(Money, nullable=False)
    direction = Column(String, nullable=False)  # 'payable' or 'receivable'
    dueDate = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="active", server_default="active")


class WishlistItem(Base):
    __tablename__ = "wishlist"
    __table_args__ = (
        CheckConstraint("cost >= 0", name="cost_non_negative"),
        Index("ix_wishlist_user_id", "user_id"),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    cost = Column(Money, nullable=False)
    addedAt = Column(Timestamp, nullable=False)


class Goal(Base):
    __tablename__ = "goals"
    __table_args__ = (
        CheckConstraint("\"targetAmount\" > 0", name="target_positive"),
        CheckConstraint("\"currentAmount\" >= 0", name="current_non_negative"),
        CheckConstraint("type IN ('savings', 'investment')", name="type_valid"),
        Index("ix_goals_user_id", "user_id"),
        Index("ix_goals_household_id", "household_id", postgresql_where=text("household_id IS NOT NULL")),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"))  # NULL = creator deleted their account (household goals only)
    name = Column(String, nullable=False)
    targetAmount = Column(Money, nullable=False)
    currentAmount = Column(Money, nullable=False, default=0.0, server_default="0")
    targetDate = Column(Date, nullable=True)
    icon = Column(String, default="PiggyBank")
    fundingSource = Column(String, default="manual")
    type = Column(String, nullable=False, default="savings", server_default="savings")  # 'savings' or 'investment'
    projectedReturnRate = Column(Rate, default=0.0)  # For investment goals
    household_id = Column(String, ForeignKey("households.id", ondelete="SET NULL"), nullable=True)  # null = personal goal


class GoalContribution(Base):
    __tablename__ = "goal_contributions"
    __table_args__ = (
        CheckConstraint("amount <> 0", name="amount_nonzero"),
        Index("ix_goal_contributions_goal_id", "goal_id"),
        # user deletion sets user_id NULL here; without an index that is a scan of this growth table
        Index("ix_goal_contributions_user_id", "user_id", postgresql_where=text("user_id IS NOT NULL")),
    )

    id = Column(String, primary_key=True)
    goal_id = Column(String, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"))  # who made the deposit/withdrawal; NULL once they left
    amount = Column(Money, nullable=False)  # positive = deposit, negative = withdrawal
    created_at = Column(Timestamp, nullable=False)


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        CheckConstraint("\"monthlyLimit\" >= 0", name="limit_non_negative"),
        Index("ix_budgets_user_id", "user_id"),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)
    monthlyLimit = Column(Money, nullable=False)


class Household(Base):
    __tablename__ = "households"
    __table_args__ = (
        Index("ix_households_created_by", "created_by", postgresql_where=text("created_by IS NOT NULL")),
    )

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"))  # NULL once the creator deleted their account
    created_at = Column(Timestamp, nullable=False)


class HouseholdMember(Base):
    __tablename__ = "household_members"
    __table_args__ = (
        UniqueConstraint("household_id", "user_id", name="uq_household_members_household_user"),
        CheckConstraint("role IN ('owner', 'member')", name="role_valid"),
        Index("ix_household_members_user_id", "user_id"),
    )

    id = Column(String, primary_key=True)
    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False, default="member", server_default="member")  # 'owner' or 'member' - multiple owners allowed
    joined_at = Column(Timestamp, nullable=False)


class HouseholdInvite(Base):
    __tablename__ = "household_invites"
    __table_args__ = (
        Index("ix_household_invites_household_id", "household_id"),
        Index("ix_household_invites_created_by", "created_by"),
        Index("ix_household_invites_used_by", "used_by", postgresql_where=text("used_by IS NOT NULL")),
    )

    id = Column(String, primary_key=True)
    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    code = Column(String, nullable=False, unique=True)
    created_by = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(Timestamp, nullable=False)
    used_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(Timestamp, nullable=False)


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (
        CheckConstraint("current_value >= 0", name="value_non_negative"),
        Index("ix_assets_user_id", "user_id"),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # 'cash', 'investment', 'property', 'vehicle', 'other'
    current_value = Column(Money, nullable=False)
    created_at = Column(Timestamp, nullable=False)


class Liability(Base):
    __tablename__ = "liabilities"
    __table_args__ = (
        CheckConstraint("current_balance >= 0", name="balance_non_negative"),
        Index("ix_liabilities_user_id", "user_id"),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # 'loan', 'credit_card', 'mortgage', 'other'
    current_balance = Column(Money, nullable=False)
    created_at = Column(Timestamp, nullable=False)


class NetWorthSnapshot(Base):
    __tablename__ = "net_worth_snapshots"
    __table_args__ = (
        CheckConstraint("total_assets >= 0 AND total_liabilities >= 0", name="totals_non_negative"),
        Index("ix_net_worth_snapshots_user_recorded", "user_id", "recorded_at"),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    total_assets = Column(Money, nullable=False)
    total_liabilities = Column(Money, nullable=False)
    recorded_at = Column(Timestamp, nullable=False)


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    __table_args__ = (
        CheckConstraint("mode IN ('analyst', 'strategist', 'educator')", name="mode_valid"),
        Index("ix_chat_sessions_user_updated", "user_id", text("updated_at DESC")),
    )

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mode = Column(String, nullable=False)  # 'analyst', 'strategist', or 'educator'
    title = Column(String, nullable=True)  # derived from the first user message, null until then
    created_at = Column(Timestamp, nullable=False)
    updated_at = Column(Timestamp, nullable=False)  # bumped on every message; drives sidebar ordering


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant')", name="role_valid"),
        Index("ix_chat_messages_session_created", "session_id", "created_at"),
    )

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(Timestamp, nullable=False)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        # Emails are stored lowercase and looked up with lower(); this index enforces it and serves the lookup (#184).
        Index("uq_users_email_lower", text("lower(email)"), unique=True),
    )

    id = Column(String, primary_key=True)
    email = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    # Bumped to revoke every token issued before (e.g. on a password change); see auth.py.
    token_version = Column(Integer, nullable=False, default=0, server_default="0")

    # Profile Data (free-form on purpose: onboarding sends 'moderate' where the AI prompts expect 'medium')
    currency = Column(String, default="INR")
    monthly_income = Column(Money, default=0.0)
    current_balance = Column(Money, default=0.0)  # may be negative (overdraft)
    savings_goal = Column(Money, default=0.0)
    financial_literacy = Column(String, default="beginner")  # beginner, intermediate, advanced
    risk_tolerance = Column(String, default="low")  # low, medium/moderate, high
    goals = Column(String, default="[]")  # JSON string of goals
