# CBSE Class 9 & 10 Study Tracker

A static, offline-first Progressive Web Application (PWA) designed for CBSE Class 9 and Class 10 students to track chapter-wise preparation across Science, Mathematics, and Social Science, calculated backwards from their official exam datesheets and midterm syllabi.

Built by **Sunil Bhaiya**.

---

## Features

- **Exam Syllabus Scoping**: Select which chapters are included in your current midterm/exam so daily preparation pace is calculated only against your actual exam scope.
- **Backward Exam Planning**: Calculates required daily preparation pace (stages/day) based on exam dates and remaining stages in your active syllabus.
- **5-Stage Chapter Tracking**:
  1. Theory Read
  2. NCERT Questions
  3. NCERT Exemplar
  4. Competency Based Questions (CBQ)
  5. Previous Year Questions (PYQ)
- **3-State Stage Control**: Tap to cycle between *Not Started* (grey outline) ➔ *In Progress* (half-filled amber) ➔ *Done* (solid green tick).
- **Social Science Sub-Subject Headers**: Clear group sub-headers (`History`, `Geography`, `Political Science (Civics)`, `Economics`) paired with chapter numbers across all screens.
- **Streak Tracker**: Subtle activity counter tracking consecutive preparation days.
- **Today's Focus**: Automatically surfaces the top 3 pending stages for the subject with the nearest exam date.
- **Multi-Profile Support**: Support multiple students/siblings on a single device with isolated progress and typed-confirmation deletion.
- **Zero External Runtime Dependencies**: 100% offline-capable PWA with local assets and offline service worker (`sw.js`).
- **Backup & Restore**: Export complete progress as JSON (`cbse-tracker-<name>-<date>.json`) and restore across devices with validation & diff summaries.
- **Offline PDF Viewer**: Integrated inline PDF viewer overlay for CBQ & PYQ papers without third-party plugins.

---

## Repo Structure

```
/index.html                     # SPA Entry Point
/css/styles.css                 # Responsive, Mobile-First Design System
/js/app.js                      # Screen Controller, Router & UI Renderer
/js/storage.js                  # localStorage Manager & Backup/Restore Logic
/js/planner.js                  # Scoped Pace Math & Today's Focus Algorithm
/js/data/chapters-class9.js     # Class 9 NCERT 2025-26 Chapter Data
/js/data/chapters-class10.js    # Class 10 NCERT 2025-26 Chapter Data
/assets/icons/                  # App SVG Icons (logo.svg)
/assets/pdfs/                   # Local PDF Storage
  └── class10/
      └── science/
          ├── cbq-ch1.pdf       # Sample CBQ PDF for Ch 1
          └── pyq-ch1.pdf       # Sample PYQ PDF for Ch 1
/manifest.json                  # PWA Web App Manifest
/sw.js                          # Service Worker (App Shell Precaching)
/tests/offline-check.js         # Automated "Go Offline" PWA check (Node, no deps)
/start_offline_check.bat        # Windows launcher for the offline check
/README.md                      # Documentation
```

---

## How to Add or Replace a PDF

1. **Naming Convention & Folder Path**:
   Place PDF files in the `/assets/pdfs/` directory following this path structure:
   `assets/pdfs/class{9|10}/{subjectId}/{cbq|pyq}-{chapterId}.pdf`

   *Example for Class 10 Science Chapter 1 CBQ:*
   `assets/pdfs/class10/science/cbq-ch1.pdf`

2. **Update Chapter Data Schema**:
   In `js/data/chapters-class10.js` (or `chapters-class9.js`), locate the chapter object and set the relative PDF path:
   ```javascript
   {
     id: "ch1",
     no: 1,
     name: "Chemical Reactions and Equations",
     pdfs: {
       cbq: "assets/pdfs/class10/science/cbq-ch1.pdf",
       pyq: "assets/pdfs/class10/science/pyq-ch1.pdf"
     }
   }
   ```
   If a chapter has no PDF yet, keep `pdfs: null`. The UI gracefully hides missing PDF buttons.

3. **PDF Compression & Storage Note**:
   Compress PDFs before committing. Keep individual PDFs under 5MB. Service worker explicitly skips precaching `.pdf` files to prevent blowing device storage quotas.

---

## How to Edit Chapter Lists When NCERT Updates

Chapter lists are stored in clean JS arrays in `js/data/chapters-class9.js` and `js/data/chapters-class10.js`.

To add, remove, or rename a chapter:
1. Open `js/data/chapters-class9.js` or `js/data/chapters-class10.js`.
2. Locate the subject and group (e.g. Science or Social Science history/geography).
3. Modify the `chapters` array:
   ```javascript
   { id: "ch14", no: 14, name: "New NCERT Chapter Name", pdfs: null }
   ```
4. Save the file. The app automatically updates chapter counts and pace math without breaking existing user progress.

---

## How to Deploy to GitHub Pages

1. Commit all files to your GitHub repository main branch.
2. Go to **Settings ➔ Pages** in your GitHub repository.
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`
   - **Branch**: Select `main` (or `master`) and folder `/ (root)`
4. Click **Save**. GitHub Pages will deploy the static site in ~1-2 minutes.

---

## How a Student Restores Progress on a New Phone

1. On the old phone: Go to **Settings ➔ Export Backup JSON**. This downloads a file named `cbse-tracker-<name>-YYYYMMDD.json`.
2. Transfer or email the `.json` file to the new phone.
3. Open the PWA on the new phone.
4. Go to **Settings ➔ Import Backup JSON**.
5. Select the downloaded `.json` file.
6. Review the summary confirmation dialog showing profile and chapter counts.
7. Tap **OK** to restore all progress, streak history, datesheets, and syllabus selections onto the new phone.

---

## Automated Offline Check (QA)

The service worker promises the app keeps working with no internet connection. `tests/offline-check.js` verifies this automatically — it is the same as opening DevTools ➔ **Network** ➔ **Go Offline** and reloading, but scripted:

1. Starts a local static server and loads the app in a fresh headless Chrome profile.
2. Waits for the service worker to activate, take control of the page, and finish precaching the app shell.
3. Emulates an offline network **for both the page and the service worker contexts** (SW fetches happen in the worker context, so the page session alone would not block them).
4. Proves offline is real: an uncached fetch must return the SW's 503 fallback, and the local server must log **zero** requests during the offline phase.
5. Reloads the page offline and asserts the app shell still renders from cache.
6. Navigates to a brand-new URL offline and asserts the SPA shell loads (exercises the `sw.js` offline-navigation fallback).
7. Fails if any uncaught exception or console error appears.

**Run it (Windows):** double-click `start_offline_check.bat`, or:

```bash
node tests/offline-check.js
```

Requires Node 22+ (built-in WebSocket) and Chrome or Edge. Optional: `node tests/offline-check.js --chrome "C:\path\to\chrome.exe"` or `CHROME_PATH=...`. Exits with code `0` when all checks pass, `1` when any fail — so it can be wired into CI.
