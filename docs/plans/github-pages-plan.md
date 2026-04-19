# Device Monitoring Implementation Plan (GitHub Pages & Git Sync)

## Objective
Build a simplified, serverless architecture to monitor a local device attached via `/dev/ttyUSB0` (reporting WiFi/BLE/Pax counts). This alternative replaces Firebase entirely by having a local Python script append data to a JSON
file and push it to a GitHub repository every 5 minutes. The frontend dashboard is hosted via GitHub Pages and dynamically aggregates this data into 15-minute intervals.

## Architecture
1. **Local Bridge (Python):** Listens to the serial port, parses the data, appends it to a local JSON file, and uses standard Git commands to push the updated file to GitHub every 5 minutes.
2. **Data Storage (GitHub Repository):** The repository acts as both the data store (a `data/device_counts.json` file) and the codebase for the frontend.
3. **Frontend (HTML/JS on GitHub Pages):** A static site that fetches the JSON data file, aggregates the 5-minute data points into 15-minute buckets, and displays the dashboard and historical graphs using Frappe Charts.

## Phase 1: Local Bridge Script (Python)
1. **Dependencies:** Install required packages (`pip install pyserial`). Ensure `git` is installed and configured on the local machine with SSH keys or a Personal Access Token (PAT) for passwordless pushing.
2. **Implementation (`bridge.py`):**
    * Initialize `pyserial` to connect to `/dev/ttyUSB0` at the correct baud rate.
    * Continuously read lines from the serial port.
    * Extract pax, wifi, and ble integer values from the string: `Sending count results: pax=X / wifi=Y / ble=Z`.
    * Accumulate the readings.
    * **Every 5 minutes:**
        * Append the new entry (with a timestamp) to `data/device_counts.json`.
        * Execute shell commands to commit and push the file:
  git add data/device_counts.json
  git commit -m "chore: update device data [skip ci]"
  git push origin main

## Phase 2: GitHub Repository & Pages Setup
1. **Repository Structure:**
    * `/data/device_counts.json`: The data file updated by the bridge script.
    * `/index.html`, `/app.js`, `/style.css`: The frontend dashboard files.
2. **GitHub Pages Configuration:**
    * In the repository settings, navigate to "Pages".
    * Set the source to deploy from the `main` branch.
    * The dashboard will be accessible at `https://<username>.github.io/<repo-name>/`.
3. **Data Fetching:**
    * Pushing to `main` updates the GitHub Pages site, making the updated `data/device_counts.json` accessible via relative path `/data/device_counts.json`.

## Phase 3: Dashboard Frontend (HTML/JS)
1. **Dependencies:** Include Frappe Charts via CDN directly in `index.html`. Include Luxon (or similar) for robust timezone and interval handling.
2. **Implementation (`index.html` & `app.js`):**
    * **UI Layout:** Create a clean dashboard layout with "Current Stats", "View Controls" (date picker/timezone), and a container for the Frappe Bar Chart.
    * **Data Fetching:** Fetch the data file via standard `fetch('./data/device_counts.json')`. Since it's hosted on GitHub pages, it will be served via their CDN.
    * **Data Aggregation:**
        * The fetched JSON contains data points every 5 minutes.
        * Filter the data based on the selected day and timezone (e.g., between 07:30 and 20:00).
        * Group the 5-minute data points into 15-minute buckets (e.g., 07:30, 07:45, ...).
        * Aggregate the counts for each 15-minute bucket (e.g., summing or averaging).
    * **Graphing:** Feed the 15-minute bucket labels and aggregated data into Frappe Charts.

## Phase 4: Lifecycle & Maintenance
1. **Data Pruning:** Over time, `data/device_counts.json` will grow. Implement a routine in `bridge.py` to rotate files (e.g., `device_counts_YYYY_MM.json`) or prune old data to keep Git operations fast.
2. **Git History:** Pushing every 5 minutes results in 288 commits per day. Using `[skip ci]` in the commit message is crucial to prevent triggering GitHub Actions unnecessarily.
