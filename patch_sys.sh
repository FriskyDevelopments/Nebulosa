#!/bin/bash
sed -i 's/### D. The Zoom Integration (The Extension)/### D. The Chrome Extension (Zoom Integration)/g' SYSTEM_ARCHITECTURE_AND_SETUP.md
sed -i '/### D. The Chrome Extension (Zoom Integration)/a - **What it is:** A Manifest V3 Chrome Extension located in `apps/extension-nebulosa-control/`.\n- **Role:** Enables real-time management of Zoom meetings directly linked to Nebulosa commands by injecting scripts into the Zoom web client.\n- **Features:** Auto-pinning users, monitoring cameras, and reading chat.' SYSTEM_ARCHITECTURE_AND_SETUP.md
sed -i 's/- \*\*Role:\*\* Enables real-time management of Zoom meetings (e.g., auto-pinning users, monitoring cameras) directly linked to Nebulosa commands.//g' SYSTEM_ARCHITECTURE_AND_SETUP.md
