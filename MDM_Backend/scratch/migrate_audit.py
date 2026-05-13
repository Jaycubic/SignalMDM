from sqlalchemy import create_all, text
from signalmdm.database import engine

def migrate():
    with engine.connect() as conn:
        print("Altering audit_log.tenant_id to nullable...")
        conn.execute(text("ALTER TABLE audit_log ALTER COLUMN tenant_id DROP NOT NULL;"))
        conn.commit()
        print("Done!")

if __name__ == "__main__":
    migrate()
