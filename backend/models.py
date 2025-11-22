from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    date = Column(String)
    amount = Column(Float)
    category = Column(String)
    description = Column(String)
    merchant = Column(String)
    type = Column(String) # 'income' or 'expense'
    necessity = Column(String) # 'fixed' or 'variable'
    remarks = Column(String, nullable=True)

class RecurringPlan(Base):
    __tablename__ = "recurring_plans"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    amount = Column(Float)
    type = Column(String)
    frequency = Column(String)
    expectedDate = Column(String)
    endDate = Column(String, nullable=True)

class Debt(Base):
    __tablename__ = "debts"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    personName = Column(String)
    amount = Column(Float)
    direction = Column(String) # 'payable' or 'receivable'
    dueDate = Column(String, nullable=True)
    status = Column(String, default='active')

class WishlistItem(Base):
    __tablename__ = "wishlist"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    cost = Column(Float)
    addedAt = Column(String)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    
    # Profile Data
    currency = Column(String, default="INR")
    monthly_income = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    savings_goal = Column(Float, default=0.0)
    financial_literacy = Column(String, default="beginner") # beginner, intermediate, advanced
    risk_tolerance = Column(String, default="low") # low, medium, high
    goals = Column(String, default="[]") # JSON string of goals

