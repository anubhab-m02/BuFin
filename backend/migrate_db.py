import sqlite3

conn = sqlite3.connect('bufin.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE recurring_plans ADD COLUMN endDate VARCHAR")
    print("Successfully added endDate column.")
except Exception as e:
    print(f"Error (might already exist): {e}")

conn.commit()
conn.close()
