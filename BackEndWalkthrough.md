# SignalMDM Phase 1 Backend Walkthrough

## 1. Intro
SignalMDM is a Master Data Management platform that collects and organizes business data from multiple sources. Phase 1 focuses purely on the **Foundation Layer**: securely receiving files, storing the data exactly as it arrived, and preparing it for future processing, without modifying the original data.

## 2. What Exists
The system is built and operational with the following components:
- **APIs:** Endpoints to manage tenants, register data sources, and trigger data ingestion.
- **Models:** Database blueprints for tracking organizations, sources, and every piece of data uploaded.
- **Services:** The business logic connecting APIs to the database.
- **Workers:** Background task processors (Celery) to handle heavy data parsing asynchronously.
- **File Storage:** A local directory (`storage/uploads/`) to save uploaded CSV/JSON files.
- **Async Processing:** A system that processes files in the background while immediately returning a response to the user.

## 3. Project Structure
The codebase is organized into specific folders:

- `core/`: Contains central application settings (e.g., `config.py` for environment variables).
- `signalmdm/`: The heart of the application, containing all business logic.
  - `models/`: Database table definitions (how data is structured).
  - `routers/`: API endpoints (URLs users interact with).
  - `schemas/`: Rules for what data the APIs accept and return.
  - `services/`: The brains of the operation, executing logic for the routers.
  - `workers/`: Background jobs for processing files.
- `storage/uploads/`: The physical location where uploaded files are saved.
- `utils/`: Helper tools, like generating unique checksums for data integrity.

## 4. Key Files
- **DB Connection (`signalmdm/database.py`):** Connects the app to the PostgreSQL database.
- **Models (`signalmdm/models/*.py`):** Define tables like `source_systems` and `raw_records`.
- **Routers (`signalmdm/routers/*.py`):** Handle web requests (e.g., `POST /api/v1/ingestion/{run_id}/upload`).
- **Services (`signalmdm/services/*.py`):** Perform actions like saving files, checking rules, or updating database records.
- **Workers (`signalmdm/workers/*.py`):** Independent tasks that parse files and insert large amounts of data into the database.

## 5. Real Flow
Here is how data moves through the system when a user interacts with it:

1. **Register Source:** A user tells the system about a new data source (e.g., "Sales CRM").
2. **Start Ingestion:** A user creates an "Ingestion Run" to begin a specific data upload session.
3. **Upload File:** A user uploads a CSV or JSON file.

**The Internal Journey:**
Router (receives file) → Service (saves file & logs to DB) → Worker (parses file in background) → DB (stores raw data) → Router (sends success message to user).

## 6. Database
The system uses the following key tables:
- **`tenant`**: Represents the customer/organization using the system. All other tables link back to this for security (multi-tenancy).
- **`source_systems`**: Stores registered data origins (e.g., ERP, CRM).
- **`ingestion_runs`**: Tracks a specific upload session and its current state (CREATED, RUNNING, COMPLETED).
- **`file_uploads`**: Stores metadata about uploaded files (name, size, disk location).
- **`raw_records`**: Stores the exact, unmodified data from the files, row by row as JSON.
- **`staging_entities`**: A copy of the raw data, prepared and waiting for Phase 2 processing.
- **`audit_log`**: An immutable history of every action taken in the system.

## 7. Async (Workers)
Background tasks handle the heavy lifting to keep the API fast and responsive:
- **`raw_worker.py`**: Triggered when a file is uploaded. It reads the file, parses the data, and saves every row into the `raw_records` table.
- **`staging_worker.py`**: Triggered automatically after the `raw_worker` finishes. It copies data from `raw_records` into `staging_entities` so it is ready for future mapping.

## 8. Connection
The system's layers work in a strict chain of command:
**Routers** receive user requests and pass them to **Services**.
**Services** apply business rules, interact with **Models** to save basic info to the **DB**, and then trigger **Workers**.
**Workers** perform heavy processing and use **Models** to save large amounts of data to the **DB**.

## 9. Final Result
When an upload is complete, the system has produced:
- The physical file stored securely on disk.
- Unmodified, verifiable data stored in `raw_records`.
- Prepared data waiting in `staging_entities` (marked as `READY_FOR_MAPPING`).
- An updated ingestion run status of `COMPLETED`.

## 10. Simple Summary
SignalMDM Phase 1 is a secure data-receiving pipeline. You register a data source, start a session, and upload a file. The system quickly saves your file to disk, replies "got it," and then secretly goes to work in the background. It carefully unpacks your file, saves a perfect, untouched copy of every single row of data, and lines it all up in a staging area so it's completely ready for whatever processing you want to do next.
