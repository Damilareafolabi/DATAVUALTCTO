# CMRG DataCore OS — Developer Architecture & Handoff Guide

## Welcome, Developer!
You have been handed the **CMRG DataCore OS**. This repository currently contains the **Web Administration Command Center** built with React 18, Vite, Tailwind CSS, and Firebase (Auth/Firestore).

The goal of this project is to create a fully independent, enterprise-grade data collection ecosystem to replace SurveyCTO. 

**DO NOT ATTEMPT TO BUILD A CUSTOM ANDROID APP FROM SCRATCH.**
To match the stability of SurveyCTO, you will integrate this modern React/Firebase dashboard with the battle-tested **ODK (Open Data Kit)** open-source ecosystem.

---

## 🏗️ SYSTEM ARCHITECTURE

Currently, this repo is a functioning Web Prototype (~40% of the total system). 
Your job is to build the remaining 60%: The Backend API and the Android Fork.

### 1. The Mobile App (The Hands)
*   **DO NOT BUILD THIS.** Clone the open-source `getodk/collect` repository.
*   It has 15+ years of offline-first, SQLite-backed stability.
*   **Your task:** Fork it, rebrand it with CMRG colors/logos, rename the package to `com.cmrg.datacollect`, and hardcode the default server URL to point to our new Firebase Cloud Functions API.

### 2. The Backend "OpenRosa" API (The Nervous System)
*   ODK Collect expects to talk to a server using the **OpenRosa XML API standard**.
*   **Your task:** Write Firebase Cloud Functions (Node.js) to act as this bridge.
*   **Required Endpoints:**
    *   `GET /formList`: Return an XML list of available forms (read from Firestore).
    *   `POST /submission`: Accept multipart/form-data XML submissions from the ODK Android app, parse the XML into JSON, and save it to the `submissions` collection in Firestore.

### 3. XLSForm Integration (The Brain)
*   SurveyCTO/ODK relies on standard Excel files (XLSForm) for complex survey logic.
*   **Your task:** Integrate an XLSForm-to-XML converter (e.g., the `pyxform` Python library, or a Node/WASM equivalent) into a Cloud Function.
*   **Workflow:** Admins upload `.xlsx` files in this React dashboard -> Backend converts to XML -> Saves to Firestore -> Android app downloads it.

### 4. Data Export & Security
*   Write Firebase Security Rules: Enumerators can ONLY write to `/submissions`. Admins can read all.
*   Create backend scripts to generate CSV and SPSS (`.sav` / `.dta`) files from Firestore JSON data when admins click "Export" in the React UI.

---

## 📂 CURRENT REPOSITORY STRUCTURE
*   `/src/App.tsx` - Main routing logic.
*   `/src/lib/firebase.ts` - Firebase initialization (Requires standard ENV variables).
*   `/src/components/dashboard/` - All Admin panels (Submissions, Reports, Users).
*   `/src/components/mobile/` - A web-based form prototype (Useful for testing/web-only collection, but the Android app will replace this for heavy offline use).

## 🚀 WHY THIS ARCHITECTURE? (Stability & Scale)
By using ODK Collect for the Android layer, we inherit offline caching, background syncing, complex form logic, and multimedia capture that has been tested by millions of users globally. We only maintain the custom React Dashboard and the Firebase bridging layer.

Good luck!
