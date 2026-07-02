import sqlite3

conn = sqlite3.connect('bufin.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE recurring_plans ADD COLUMN endDate VARCHAR")
    print("Successfully added endDate column.")
except Exception as e:
    print(f"Error (might already exist): {e}")

try:
    cursor.execute("ALTER TABLE transactions ADD COLUMN linked_debt_id VARCHAR")
    print("Successfully added linked_debt_id column.")
except Exception as e:
    print(f"Error (might already exist): {e}")

conn.commit()
conn.close()
