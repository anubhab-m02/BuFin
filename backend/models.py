from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True)
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
    name = Column(String)
    amount = Column(Float)
    type = Column(String)
    frequency = Column(String)
    expectedDate = Column(String)

class Debt(Base):
    __tablename__ = "debts"

    id = Column(String, primary_key=True, index=True)
    personName = Column(String)
    amount = Column(Float)
    direction = Column(String) # 'payable' or 'receivable'
    dueDate = Column(String, nullable=True)
    status = Column(String, default='active')

class WishlistItem(Base):
    __tablename__ = "wishlist"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    cost = Column(Float)
    addedAt = Column(String)
