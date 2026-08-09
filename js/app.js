/**
 * CBSE Class 9 & 10 Study Tracker - Main Application Controller
 * UI Rendering, Screen Router, Modals & Event Listeners — Sunil Bhaiya Edition
 * Hardened against extension interference, CORS restrictions, and file:// protocol caveats.
 */

(function () {
  "use strict";

  let state = null;
  let currentScreen = "dashboard";
  let activeSubjectId = null;
  let chapterFilter = "all";
  let openChapterId = null;
  let onboardingDraft = { name: "", grade: 10, datesheet: {}, examSyllabus: null };
  let wasOnboardingScreen = false;

  function getAppContainer() {
    return document.getElementById("app");
  }

  function init() {
    try {
      state = window.TrackerStorage.loadState();
      initTheme();

      if (!state || !state.profiles || state.profiles.length === 0) {
        currentScreen = "onboarding";
      }

      render();
      setupGlobalListeners();
      registerServiceWorker();
    } catch (err) {
      console.error("Initialization error:", err);
      renderCrashFallbackScreen(err);
    }
  }

  function renderCrashFallbackScreen(err) {
    const appEl = getAppContainer();
    if (!appEl) return;

    appEl.innerHTML = `
      <div style="padding:2rem; max-width:540px; margin:3rem auto; font-family:system-ui,-apple-system,sans-serif; background:var(--bg-card,#1e293b); color:var(--text-primary,#f8fafc); border-radius:12px; border:1px solid #ef4444; box-shadow:0 10px 25px rgba(0,0,0,0.3);">
        <h2 style="color:#ef4444; margin-top:0; display:flex; align-items:center; gap:0.5rem;">
          ⚠️ App Couldn't Load
        </h2>
        <p style="color:var(--text-secondary,#94a3b8); line-height:1.5;">
          Something prevented the application from starting on this browser profile.
        </p>

        <div style="background:#0f172a; padding:1rem; border-radius:8px; margin:1rem 0; font-size:0.875rem; border-left:4px solid #ef4444;">
          <strong>Error details:</strong> ${escapeHtml(err ? err.message || String(err) : "Unknown Exception")}
        </div>

        <h3 style="font-size:1rem; margin-top:1.5rem;">Suggested Fixes:</h3>
        <ol style="padding-left:1.25rem; line-height:1.7; color:var(--text-primary,#f8fafc);">
          <li><strong>Open in Incognito/Private Mode:</strong> Press <code>Ctrl + Shift + N</code> and open this file there.</li>
          <li><strong>Disable Browser Extensions:</strong> Temporarily turn off ad-blockers, privacy tools, or script blockers.</li>
          <li><strong>Use a Different Browser:</strong> Open in Chrome, Microsoft Edge, or Firefox.</li>
        </ol>

        <div style="display:flex; gap:0.75rem; margin-top:1.5rem; flex-wrap:wrap;">
          <button type="button" onclick="location.reload();" style="padding:0.6rem 1.2rem; background:#2563eb; color:#fff; border:none; border-radius:6px; font-weight:600; cursor:pointer;">
            🔄 Reload Page
          </button>
          <button type="button" onclick="try{localStorage.clear();}catch(e){} location.reload();" style="padding:0.6rem 1.2rem; background:#334155; color:#f8fafc; border:none; border-radius:6px; font-weight:600; cursor:pointer;">
            🧹 Clear App Cache & Retry
          </button>
        </div>
      </div>
    `;
  }

  function registerServiceWorker() {
    try {
      // Only register PWA manifest & ServiceWorker over HTTP/HTTPS to prevent CORS origin 'null' errors on file://
      if (typeof navigator !== "undefined" && (location.protocol === "http:" || location.protocol === "https:")) {
        if (!document.querySelector('link[rel="manifest"]')) {
          const manifestLink = document.createElement("link");
          manifestLink.rel = "manifest";
          manifestLink.href = "manifest.json";
          document.head.appendChild(manifestLink);
        }

        if ("serviceWorker" in navigator) {
          window.addEventListener("load", () => {
            navigator.serviceWorker.register("./sw.js").catch(err => {
              console.warn("ServiceWorker registration failed:", err);
            });
          });
        }
      }
    } catch (err) {
      console.warn("PWA registration guarded exception:", err);
    }
  }

  function initTheme() {
    try {
      let savedTheme = null;
      try {
        savedTheme = localStorage.getItem("cbse_tracker_theme");
      } catch (e) {
        console.warn("localStorage theme read blocked");
      }

      let prefersDark = false;
      try {
        prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      } catch (e) {
        console.warn("matchMedia check blocked");
      }

      if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      syncThemeColorMeta();
    } catch (err) {
      console.warn("initTheme error guarded:", err);
    }
  }

  function toggleTheme() {
    try {
      const isDark = document.documentElement.classList.toggle("dark");
      try {
        localStorage.setItem("cbse_tracker_theme", isDark ? "dark" : "light");
      } catch (e) {
        console.warn("localStorage theme write blocked");
      }
      syncThemeColorMeta();
    } catch (err) {
      console.warn("toggleTheme error guarded:", err);
    }
  }

  function syncThemeColorMeta() {
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", document.documentElement.classList.contains("dark") ? "#0f172a" : "#f8fafc");
      }
    } catch (e) {
      // non-critical cosmetic update
    }
  }

  function resetOnboardingDraft() {
    onboardingDraft = { name: "", grade: 10, datesheet: {}, examSyllabus: null };
  }

  function getSubjectsData() {
    const profile = window.TrackerStorage.getActiveProfile(state);
    if (!profile) return window.CLASS_10 || [];
    return profile.grade === 9 ? (window.CLASS_9 || []) : (window.CLASS_10 || []);
  }

  function render() {
    const appEl = getAppContainer();
    if (!appEl) return;

    const activeProfile = window.TrackerStorage.getActiveProfile(state);

    if (!activeProfile && currentScreen !== "onboarding") {
      currentScreen = "onboarding";
    }

    if (activeProfile && activeProfile.grade === 9 && currentScreen === "resources") {
      currentScreen = "dashboard";
    }

    // Entering onboarding fresh? Start with a clean draft. Re-renders that happen
    // while already on onboarding (e.g. theme toggle) must preserve in-progress input.
    if (currentScreen === "onboarding" && !wasOnboardingScreen) {
      resetOnboardingDraft();
    }
    wasOnboardingScreen = currentScreen === "onboarding";

    let html = "";
    html += renderHeader(activeProfile);

    html += `<main class="app-main">`;

    if (window.TrackerStorage && window.TrackerStorage.isStorageBlocked) {
      html += `
        <div class="banner" style="background-color:var(--status-red-bg,#fef2f2); border-color:var(--status-red-border,#fca5a5); color:var(--status-red,#dc2626);">
          <div class="banner-text">
            ⚠️ <strong>Storage Access Blocked:</strong> A browser extension or privacy setting is blocking <code>localStorage</code>. Your progress can be tracked for this session, but will NOT be saved when you close the tab. Try opening in an Incognito window or disabling extensions.
          </div>
        </div>
      `;
    }

    if (currentScreen === "onboarding") {
      html += renderOnboardingScreen();
    } else if (currentScreen === "dashboard") {
      html += renderDashboardScreen(activeProfile);
    } else if (currentScreen === "subject") {
      html += renderSubjectScreen(activeProfile);
    } else if (currentScreen === "insights") {
      html += renderInsightsScreen(activeProfile);
    } else if (currentScreen === "resources") {
      html += renderResourcesScreen(activeProfile);
    } else if (currentScreen === "settings") {
      html += renderSettingsScreen(activeProfile);
    }

    html += `</main>`;

    if (currentScreen !== "onboarding") {
      html += renderBottomNav(activeProfile);
    }

    html += renderFooter();
    html += renderModalContainer();

    appEl.innerHTML = html;
    bindScreenEvents();
  }

  function renderHeader(profile) {
    const isDark = document.documentElement.classList.contains("dark");
    const profiles = state.profiles || [];

    return `
      <header class="app-header">
        <a href="#" class="brand" data-action="nav-dashboard">
          <img src="assets/icons/logo.svg" alt="Sunil Bhaiya Logo" class="brand-icon" />
          <span>Sunil Bhaiya</span>
        </a>

        <div class="header-actions">
          <button type="button" id="themeToggleBtn" class="btn btn-sm btn-secondary" title="Toggle Dark/Light Mode">
            ${isDark ? "☀️ Light" : "🌙 Dark"}
          </button>

          ${profile ? `
            <div class="profile-select-wrapper">
              <select id="profileSelectHeader">
                ${profiles.map(p => `
                  <option value="${p.id}" ${p.id === profile.id ? "selected" : ""}>
                    ${escapeHtml(p.name)} (Class ${p.grade})
                  </option>
                `).join("")}
                <option value="new">+ Add Profile</option>
              </select>
            </div>
          ` : ""}
        </div>
      </header>
    `;
  }

  function renderBottomNav(profile) {
    const isClass9 = profile && profile.grade === 9;

    return `
      <nav class="bottom-nav">
        <button type="button" class="nav-item ${currentScreen === "dashboard" ? "active" : ""}" data-action="nav-dashboard">
          <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"/></svg>
          Home
        </button>
        <button type="button" class="nav-item ${currentScreen === "subject" ? "active" : ""}" data-action="nav-subject">
          <svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
          Chapters
        </button>
        <button type="button" class="nav-item ${currentScreen === "insights" ? "active" : ""}" data-action="nav-insights">
          <svg viewBox="0 0 24 24"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zM16.2 13H19v6h-2.8z"/></svg>
          Insights
        </button>
        ${!isClass9 ? `
          <button type="button" class="nav-item ${currentScreen === "resources" ? "active" : ""}" data-action="nav-resources">
            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            Resources
          </button>
        ` : ""}
        <button type="button" class="nav-item ${currentScreen === "settings" ? "active" : ""}" data-action="nav-settings">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>
          Settings
        </button>
      </nav>
    `;
  }

  function renderFooter() {
    return `
      <footer class="app-footer">
        <div>Built by Sunil Bhaiya</div>
      </footer>
    `;
  }

  function renderModalContainer() {
    return `<div id="modalOverlay" class="modal-overlay" role="dialog" aria-modal="true"></div>`;
  }

  function renderDashboardScreen(profile) {
    const subjectsData = getSubjectsData();
    const orderedPaces = window.TrackerPlanner.getOrderedSubjectPaces(profile, subjectsData);
    const focusItems = window.TrackerPlanner.getTodaysFocus(profile, subjectsData);
    const showBackupNudge = window.TrackerStorage.shouldShowBackupNudge(state);

    const streakCount = profile.streak ? profile.streak.count || 0 : 0;

    let html = ``;

    if (profile.v6PreResourceNoticeNeeded) {
      html += `
        <div class="banner" style="background-color:var(--accent-light); border-color:var(--accent-primary);">
          <div class="banner-text">
            ℹ️ <strong>Class 9 Stage Model Update:</strong> CBQ/PYQ/Exemplar tracking was removed for Class 9 since no official material exists yet for the new NCERT edition. Your prior progress on these was archived.
          </div>
          <button type="button" id="dismissV6NoticeBtn" class="btn btn-sm btn-primary">Got it!</button>
        </div>
      `;
    } else if (profile.v5NoticeNeeded) {
      html += `
        <div class="banner" style="background-color:var(--accent-light); border-color:var(--accent-primary);">
          <div class="banner-text">
            📖 <strong>New Class 9 NCERT Edition Update:</strong> Your Class 9 NCERT books were updated to the new edition. Your old chapter tracking has been archived. Please select your exam syllabus and mark your progress.
          </div>
          <button type="button" id="dismissV5NoticeBtn" class="btn btn-sm btn-primary">Got it!</button>
        </div>
      `;
    } else if (profile.needsSyllabusConfirmation) {
      html += `
        <div class="banner" style="background-color:var(--accent-light); border-color:var(--accent-primary);">
          <div class="banner-text">
            📌 <strong>Confirm your exam syllabus</strong> to get accurate pace tracking.
          </div>
          <button type="button" id="confirmSyllabusBannerBtn" class="btn btn-sm btn-primary">Edit Syllabus</button>
        </div>
      `;
    } else if (showBackupNudge) {
      html += `
        <div class="banner">
          <div class="banner-text">
            💾 Your progress is saved only on this device. Save your progress to a file.
          </div>
          <button type="button" id="downloadBackupNudgeBtn" class="btn btn-sm btn-primary">Save Progress</button>
        </div>
      `;
    }

    html += `
      <div class="dashboard-top">
        <div>
          <h2>Hi, ${escapeHtml(profile.name)}!</h2>
          <p style="margin:0;">Class ${profile.grade} Exam Preparation (${profile.grade === 9 ? "3 Preparation Stages" : "5 Preparation Stages"})</p>
        </div>

        <div class="streak-badge">
          🔥 ${streakCount} Day${streakCount === 1 ? "" : "s"} Streak
        </div>
      </div>

      <h2>Subject Preparation Status</h2>
      <div class="subject-cards-grid">
    `;

    orderedPaces.forEach(pace => {
      const radius = 24;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (pace.completionPercentage / 100) * circumference;

      html += `
        <div class="subject-card" role="button" tabindex="0" data-status="${pace.statusColor}" data-action="open-subject" data-subject-id="${pace.subjectId}">
          <div class="subject-card-header">
            <span class="subject-name">${escapeHtml(pace.subjectName)}</span>
            <span class="status-tag ${pace.statusColor}">${escapeHtml(pace.statusLabel)}</span>
          </div>

          <div class="subject-card-body">
            <div class="progress-ring-wrapper">
              <svg class="progress-ring" width="60" height="60">
                <circle class="progress-ring-bg" stroke-width="5" fill="transparent" r="${radius}" cx="30" cy="30" />
                <circle class="progress-ring-circle" stroke-width="5" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" fill="transparent" r="${radius}" cx="30" cy="30" />
              </svg>
              <div class="progress-ring-text">${pace.completionPercentage}%</div>
            </div>

            <div class="pace-info">
              ${pace.totalStages === 0 ? `
                <strong>No chapters in exam</strong>
              ` : pace.remainingStages === 0 ? `
                <strong>All 100% Completed!</strong>
              ` : pace.isPastExam ? `
                <strong>Exam Passed</strong><br/>Update datesheet in Settings
              ` : pace.daysLeft !== null ? `
                <strong>${pace.daysLeft} days left</strong><br/>
                ${pace.remainingStages} stages pending (${pace.scopedChapterCount}/${pace.bookChapterCount} ch).<br/>
                Pace: <strong>${pace.requiredPace} stages/day</strong>
              ` : `
                No exam date set
              `}
            </div>
          </div>

          ${pace.advice ? `
            <div class="subject-advice">⚠️ ${escapeHtml(pace.advice)}</div>
          ` : ""}
        </div>
      `;
    });

    html += `</div>`;

    html += `
      <div class="todays-focus">
        <h3>🎯 Today's Focus (Next 3 Pending Stages)</h3>
        ${focusItems.length === 0 ? `
          <p style="margin:0;">🎉 Great job! No pending stages for your exam syllabus.</p>
        ` : `
          <div class="focus-list">
            ${focusItems.map(item => `
              <div class="focus-item" data-action="quick-toggle-stage" data-subject-id="${item.subjectId}" data-chapter-id="${item.chapterId}" data-stage-key="${item.stageKey}">
                <div class="focus-item-info">
                  <span class="focus-item-sub">
                    ${escapeHtml(item.subjectName)} ${item.groupName ? `└─ ${escapeHtml(item.groupName)}` : ""}
                  </span>
                  <span class="focus-item-ch">Ch ${item.chapterNo}: ${escapeHtml(item.chapterName)}</span>
                  <span class="focus-item-stage">${escapeHtml(window.getStageLabel(item.subjectId, item.stageKey))}</span>
                </div>
                <button type="button" class="stage-dot" data-state="${item.currentState}" title="Tap to update stage state" aria-label="Update ${escapeHtml(window.getStageLabel(item.subjectId, item.stageKey))} stage"></button>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;

    return html;
  }

  function renderSubjectScreen(profile) {
    const subjectsData = getSubjectsData();
    if (!subjectsData || subjectsData.length === 0) {
      return `<div class="card"><h2>No chapter data available</h2><p style="margin:0; color:var(--text-secondary);">The chapter data files could not be loaded. Reload the page or reinstall the app.</p></div>`;
    }

    if (!activeSubjectId) {
      activeSubjectId = subjectsData[0].id;
    }

    const currentSubData = subjectsData.find(s => s.id === activeSubjectId) || subjectsData[0];
    const paceInfo = window.TrackerPlanner.calculateSubjectPace(profile, currentSubData);
    const stageKeys = window.TrackerStorage.getStageKeysForGrade(profile.grade);

    const activeSyllabus = (profile.examSyllabus && profile.examSyllabus[currentSubData.id])
      ? profile.examSyllabus[currentSubData.id]
      : [];

    let html = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <h2>${escapeHtml(currentSubData.name)} Chapters</h2>

          <div style="display:flex; gap:0.4rem;">
            ${subjectsData.map(sub => `
              <button type="button" class="btn btn-sm ${sub.id === activeSubjectId ? "btn-primary" : "btn-secondary"}" data-action="switch-subject-tab" data-subject-id="${sub.id}">
                ${escapeHtml(sub.name)}
              </button>
            `).join("")}
          </div>
        </div>

        <p style="margin-top:0.5rem; margin-bottom:0;">
          ${paceInfo.totalStages === 0 ? `
            ⚠️ <strong>No chapters selected for this exam.</strong> Edit syllabus in Settings.
          ` : paceInfo.remainingStages === 0 ? `
            🎉 <strong>All 100% completed for this exam!</strong>
          ` : paceInfo.isPastExam ? `
            ⚠️ Exam date passed. Update datesheet in Settings.
          ` : paceInfo.daysLeft !== null ? `
            📅 <strong>${paceInfo.daysLeft} days left</strong>. ${paceInfo.remainingStages} stages pending across ${paceInfo.scopedChapterCount} chapters. Pace: <strong>${paceInfo.requiredPace} stages/day</strong>.
          ` : "No exam date set."}
        </p>
      </div>

      <div class="filter-bar">
        <button type="button" class="filter-btn ${chapterFilter === "all" ? "active" : ""}" data-action="filter-chapters" data-filter="all">All Chapters</button>
        <button type="button" class="filter-btn ${chapterFilter === "incomplete" ? "active" : ""}" data-action="filter-chapters" data-filter="incomplete">Incomplete</button>
        <button type="button" class="filter-btn ${chapterFilter === "completed" ? "active" : ""}" data-action="filter-chapters" data-filter="completed">Completed</button>
      </div>
    `;

    if (chapterFilter === "all") {
      currentSubData.groups.forEach(group => {
        if (group.name) {
          html += `<div class="group-header">└─ ${escapeHtml(group.name)}</div>`;
        }

        group.chapters.forEach(ch => {
          const scopedId = window.TrackerStorage.getScopedChapterId(currentSubData.id, group.id, ch.id, profile.grade);
          const inExam = activeSyllabus.includes(scopedId);

          const key = `${currentSubData.id}.${ch.id}`;
          const chProgress = profile.progress ? profile.progress[key] || {} : {};

          const isOpen = openChapterId === `${currentSubData.id}:${ch.id}`;

          html += `
            <div class="chapter-row ${inExam ? "" : "out-of-syllabus"}">
              <div class="chapter-row-header">
                <button type="button" class="chapter-name-btn" data-action="toggle-chapter-panel" data-chapter-id="${ch.id}">
                  <span>${isOpen ? "▼" : "►"}</span>
                  <span>
                    ${group.name ? `${escapeHtml(group.name)} — ` : ""}Ch ${ch.no}: ${escapeHtml(ch.name)}
                  </span>
                  ${!inExam ? `<span class="tag-out-of-syllabus">Not in this exam</span>` : ""}
                </button>

                <div class="chapter-stage-dots">
                  ${stageKeys.map(sk => {
                    const stateVal = chProgress[sk] || "none";
                    const label = window.getStageLabel(currentSubData.id, sk);
                    return `
                      <button type="button" class="stage-dot ${inExam ? "" : "disabled"}" 
                              data-state="${stateVal}" 
                              ${inExam ? `data-action="cycle-stage-dot"` : `data-action="disabled-stage-dot"`}
                              data-subject-id="${currentSubData.id}" 
                              data-chapter-id="${ch.id}" 
                              data-stage-key="${sk}" 
                              title="${inExam ? label : "Chapter not in exam syllabus"}" aria-label="${inExam ? label : "Chapter not in exam syllabus"}"></button>
                    `;
                  }).join("")}
                </div>
              </div>

              <div class="chapter-detail-panel ${isOpen ? "open" : ""}">
                ${group.name ? `<div style="font-weight:700; color:var(--accent-primary); margin-bottom:0.5rem;">Section: ${escapeHtml(group.name)}</div>` : ""}
                <h4>${stageKeys.length} Preparation Stages</h4>

                <div class="stage-buttons-grid">
                  ${stageKeys.map(sk => {
                    const stateVal = chProgress[sk] || "none";
                    const label = window.getStageLabel(currentSubData.id, sk);
                    return `
                      <div class="stage-button-item" ${inExam ? `data-action="cycle-stage-dot"` : `data-action="disabled-stage-dot"`} data-subject-id="${currentSubData.id}" data-chapter-id="${ch.id}" data-stage-key="${sk}">
                        <span class="stage-button-label">${escapeHtml(label)}</span>
                        <button type="button" class="stage-dot ${inExam ? "" : "disabled"}" data-state="${stateVal}" aria-label="${inExam ? label : "Chapter not in exam syllabus"}"></button>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>
          `;
        });
      });
    } else {
      let flatItems = [];
      currentSubData.groups.forEach(group => {
        group.chapters.forEach(ch => {
          const scopedId = window.TrackerStorage.getScopedChapterId(currentSubData.id, group.id, ch.id, profile.grade);
          const inExam = activeSyllabus.includes(scopedId);
          if (!inExam) return;

          const key = `${currentSubData.id}.${ch.id}`;
          const chProgress = profile.progress ? profile.progress[key] || {} : {};

          stageKeys.forEach(sk => {
            const stateVal = chProgress[sk] || "none";
            const isMatch = (chapterFilter === "completed" && stateVal === "done") ||
                            (chapterFilter === "incomplete" && (stateVal === "progress" || stateVal === "none"));
            if (isMatch) {
              flatItems.push({ group, ch, sk, stateVal });
            }
          });
        });
      });

      if (flatItems.length === 0) {
        html += `
          <div class="card text-center" style="padding: 2rem; color: var(--text-secondary);">
            ${chapterFilter === "completed" ? "No completed stages in this subject yet. Keep studying!" : "All stages in this subject are completed! 🎉"}
          </div>
        `;
      } else {
        flatItems.forEach(item => {
          const { group, ch, sk, stateVal } = item;
          const label = window.getStageLabel(currentSubData.id, sk);
          html += `
            <div class="chapter-row flat-stage-row" style="padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; min-height: var(--touch-min); gap: 1rem;">
              <div style="font-size: var(--font-size-base); font-weight: 600; color: var(--text-primary); display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;">
                <span>${group.name ? `${escapeHtml(group.name)} — ` : ""}Ch ${ch.no}: ${escapeHtml(ch.name)}</span>
                <span style="color: var(--text-muted); font-weight: normal;">&rarr;</span>
                <span style="color: var(--accent-primary); font-weight: 700;">${escapeHtml(label)}</span>
              </div>
              <button type="button" class="stage-dot" 
                      data-state="${stateVal}" 
                      data-action="cycle-stage-dot"
                      data-subject-id="${currentSubData.id}" 
                      data-chapter-id="${ch.id}" 
                      data-stage-key="${sk}" 
                      title="Tap to update: ${escapeHtml(label)}" aria-label="${escapeHtml(label)} (current state: ${stateVal})"></button>
            </div>
          `;
        });
      }
    }

    return html;
  }

  function renderInsightsScreen(profile) {
    const subjectsData = getSubjectsData();
    const orderedPaces = window.TrackerPlanner.getOrderedSubjectPaces(profile, subjectsData);
    const streakCount = profile.streak ? profile.streak.count || 0 : 0;

    let html = `
      <h2>Study Insights & Analytics</h2>
      <p style="color:var(--text-secondary); margin-bottom:1rem;">Visual analytics and preparation progress for Class ${profile.grade}.</p>

      <div class="card insights-top-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:0.5rem;">
          <h3 style="margin:0;">📊 7-Day Activity Trend</h3>
          <div class="streak-badge">🔥 ${streakCount} Day${streakCount === 1 ? "" : "s"} Streak</div>
        </div>
        <p style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-bottom:0.5rem;">Stages marked per day across all subjects.</p>
        ${window.TrackerInsights.render7DayTrendSvg(profile)}
      </div>

      <h2>Subject Analytics</h2>
    `;

    orderedPaces.forEach(subPace => {
      const subData = subjectsData.find(s => s.id === subPace.subjectId);
      const analytics = window.TrackerInsights.calculateSubjectAnalytics(profile, subData);

      html += `
        <div class="card insights-subject-card">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
            <h3 style="margin:0;">${escapeHtml(subPace.subjectName)}</h3>
            <span class="status-tag ${subPace.statusColor}">${escapeHtml(subPace.statusLabel)}</span>
          </div>

          <div style="display:flex; gap:1.5rem; align-items:center; flex-wrap:wrap;">
            ${window.TrackerInsights.renderDonutChartSvg(analytics.completionPercentage)}

            <div style="flex:1; min-width:200px;">
              <div style="font-weight:700; font-size:var(--font-size-base); margin-bottom:0.25rem;">
                ${analytics.completionPercentage}% Overall Complete
              </div>
              <div style="font-size:var(--font-size-sm); color:var(--text-secondary);">
                ${analytics.completedStages} / ${analytics.totalStages} stages done across ${analytics.scopedChapterCount} chapters in exam.
              </div>

              ${analytics.focusCallout ? `
                <div class="focus-callout">${analytics.focusCallout}</div>
              ` : ""}
            </div>
          </div>

          ${window.TrackerInsights.renderPaceComparisonSvg(analytics.actualPace, analytics.requiredPace)}

          <div class="stage-breakdown-container">
            <h4 style="margin-top:1rem; margin-bottom:0.5rem; font-size:var(--font-size-sm); color:var(--text-secondary);">Stage Breakdown</h4>
            ${window.TrackerInsights.renderStageBreakdownHtml(analytics.stageBreakdown)}
          </div>
        </div>
      `;
    });

    return html;
  }

  function renderResourcesScreen(profile) {
    if (profile.grade === 9) {
      return `<h2>Resources</h2><p>No resources needed for Class 9.</p>`;
    }

    const resources = window.CLASS_10_RESOURCES || {};
    const subjectNames = { science: "Science", maths: "Mathematics", sst: "Social Science" };

    let html = `
      <h2>Class ${profile.grade} Question Papers & Resources</h2>
      <p>Competency Focused Practice Question PDFs, by subject.</p>
    `;

    Object.keys(subjectNames).forEach(subId => {
      const items = resources[subId] || [];

      html += `
        <div class="group-header" style="font-size:var(--font-size-lg); border-bottom:3px solid var(--accent-primary); margin-top:1.5rem;">${subjectNames[subId]}</div>
      `;

      if (items.length === 0) {
        html += `<p class="text-muted">No CBQ PDFs available for this subject yet.</p>`;
      } else {
        items.forEach((item, idx) => {
          html += `
            <div class="pdf-buttons-group" style="margin-top:0.75rem; padding-bottom:0.75rem; ${idx < items.length - 1 ? 'border-bottom:1px solid var(--border-color);' : ''}">
              <div style="font-weight:600; margin-bottom:0.4rem;">${escapeHtml(item.title)}</div>
              <button type="button" class="btn btn-sm btn-secondary" data-action="view-pdf" data-title="${escapeHtml(item.title)}" data-pdf-path="${item.path}">👁️ View PDF</button>
              <a href="${item.path}" download target="_blank" rel="noopener" class="btn btn-sm btn-secondary">📥 Download</a>
            </div>
          `;
        });
      }

      // NEW: Previous Year Questions external link section
      html += `
        <div class="pyq-external-box">
          <div class="pyq-title">📄 Previous Year Question Papers</div>
          <p class="pyq-note">
            🌐 Official CBSE portal — requires an internet connection, opens outside the app.
          </p>
          <a href="${window.CBSE_PYQ_PORTAL_URL}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">
            Open CBSE PYQ Portal ↗
          </a>
        </div>
      `;
    });

    return html;
  }

  function renderSettingsScreen(profile) {
    const isDark = document.documentElement.classList.contains("dark");
    const archivedPreRes = profile ? (profile.archivedProgress ? profile.archivedProgress.class9_preResourceRemoval : null) : null;
    const archivedOldEd = profile ? (profile.archivedProgress ? profile.archivedProgress.class9_old_edition : null) : null;

    return `
      <h2>Settings & Profile Management</h2>

      ${archivedPreRes ? `
        <div class="card" style="border-color:var(--status-amber-border); background-color:var(--status-amber-bg);">
          <h3 style="color:var(--status-amber);">📁 Archived Class 9 CBQ/PYQ/Exemplar Progress</h3>
          <p style="font-size:var(--font-size-sm);">CBQ/PYQ/Exemplar tracking was removed for Class 9 since no official material exists yet for the new edition. Your prior progress on these was archived, not lost.</p>
          <details style="font-size:var(--font-size-sm); margin-bottom:0.75rem;">
            <summary style="cursor:pointer; font-weight:600;">View Archived Progress Data</summary>
            <pre style="background:var(--bg-card); padding:0.5rem; border-radius:var(--radius-sm); margin-top:0.4rem; max-height:150px; overflow:auto;">${escapeHtml(JSON.stringify(archivedPreRes, null, 2))}</pre>
          </details>
        </div>
      ` : ""}

      ${archivedOldEd ? `
        <div class="card" style="border-color:var(--status-amber-border); background-color:var(--status-amber-bg);">
          <h3 style="color:var(--status-amber);">📁 Archived Class 9 Old Textbook Progress</h3>
          <p style="font-size:var(--font-size-sm);">Your previous Class 9 chapter progress was safely archived when NCERT updated to the new textbook edition.</p>
          <details style="font-size:var(--font-size-sm); margin-bottom:0.75rem;">
            <summary style="cursor:pointer; font-weight:600;">View Archived Progress Data</summary>
            <pre style="background:var(--bg-card); padding:0.5rem; border-radius:var(--radius-sm); margin-top:0.4rem; max-height:150px; overflow:auto;">${escapeHtml(JSON.stringify(archivedOldEd, null, 2))}</pre>
          </details>
        </div>
      ` : ""}

      <!-- Syllabus Editor Entry -->
      <div class="card">
        <h3>📚 Exam Syllabus Selection</h3>
        <p>Select which chapters are included in your current midterm/exam to calculate accurate daily pace.</p>
        <button type="button" id="editExamSyllabusBtn" class="btn btn-primary">Edit Exam Syllabus Checklist</button>
      </div>

      <!-- Datesheet Section -->
      ${profile ? `
        <div class="card">
          <h3>📅 Exam Datesheet (Class ${profile.grade})</h3>
          <form id="datesheetForm">
            <div class="form-group">
              <label for="dsScience">Science Exam Date</label>
              <input type="date" id="dsScience" class="form-input" value="${profile.datesheet ? profile.datesheet.science || "" : ""}" required />
            </div>
            <div class="form-group">
              <label for="dsMaths">Mathematics Exam Date</label>
              <input type="date" id="dsMaths" class="form-input" value="${profile.datesheet ? profile.datesheet.maths || "" : ""}" required />
            </div>
            <div class="form-group">
              <label for="dsSst">Social Science Exam Date</label>
              <input type="date" id="dsSst" class="form-input" value="${profile.datesheet ? profile.datesheet.sst || "" : ""}" required />
            </div>
            <button type="submit" class="btn btn-primary">Save Datesheet</button>
          </form>
        </div>
      ` : ""}

      <!-- Backup & Diagnostic Section -->
      <div class="card">
        <h3>💾 Device Transfer & Diagnostics</h3>
        <p style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-bottom:0.75rem;">
          Save progress to a file to move devices, or copy technical diagnostics if seeking help.
        </p>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button type="button" id="exportBackupBtn" class="btn btn-primary">Save My Progress to a File</button>
          <button type="button" id="importBackupBtn" class="btn btn-secondary">Load Progress from a File</button>
          <button type="button" id="copyDiagnosticsBtn" class="btn btn-secondary">📋 Copy Diagnostic Info</button>
          <input type="file" id="importFileInput" accept=".json" style="display:none;" />
        </div>
      </div>

      <!-- Theme & Display -->
      <div class="card">
        <h3>🎨 Appearance</h3>
        <button type="button" id="settingsThemeToggleBtn" class="btn btn-secondary">
          ${isDark ? "☀️ Switch to Light Mode" : "🌙 Switch to Dark Mode"}
        </button>
      </div>

      <!-- Profile Management -->
      <div class="card">
        <h3>👤 Profiles</h3>
        <div style="margin-bottom: 1rem;">
          ${state.profiles.map(p => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid var(--border-color);">
              <div>
                <strong>${escapeHtml(p.name)}</strong> (Class ${p.grade}) ${profile && p.id === profile.id ? "<em>[Active]</em>" : ""}
              </div>
              <div>
                ${!profile || p.id !== profile.id ? `
                  <button type="button" class="btn btn-sm btn-secondary" data-action="switch-profile-id" data-profile-id="${p.id}">Switch</button>
                ` : ""}
                <button type="button" class="btn btn-sm btn-danger" data-action="delete-profile-id" data-profile-id="${p.id}" data-profile-name="${escapeHtml(p.name)}">Delete</button>
              </div>
            </div>
          `).join("")}
        </div>
        <button type="button" id="addNewProfileSettingsBtn" class="btn btn-secondary">+ Add New Profile</button>
      </div>

      <!-- Danger Zone -->
      <div class="card" style="border-color: var(--status-red-border);">
        <h3 style="color: var(--status-red);">⚠️ Danger Zone</h3>
        <p>Clear all local data and reset app state.</p>
        <button type="button" id="resetAllDataBtn" class="btn btn-danger">Reset All App Data</button>
      </div>
    `;
  }

  function renderOnboardingScreen() {
    return `
      <div class="card onboarding-card">
        <h2 class="text-center">Welcome to Sunil Bhaiya Study Tracker</h2>

        <div id="onboardingStep1" class="onboarding-step active">
          <h3>Step 1 of 4: Student Details</h3>
          <form id="onboardingFormStep1">
            <div class="form-group">
              <label for="obName">Student Name</label>
              <input type="text" id="obName" class="form-input" placeholder="e.g. Aarav" value="${escapeHtml(onboardingDraft.name)}" required />
            </div>
            <div class="form-group">
              <label for="obGrade">Class / Grade</label>
              <select id="obGrade" class="form-input" required>
                <option value="10">Class 10 (5 Stages)</option>
                <option value="9" ${onboardingDraft.grade === 9 ? "selected" : ""}>Class 9 (3 Stages)</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Next: Set Datesheet →</button>
          </form>
        </div>

        <div id="onboardingStep2" class="onboarding-step">
          <h3>Step 2 of 4: Exam Datesheet</h3>
          <p>Set your upcoming exam dates to calculate preparation pace.</p>
          <form id="onboardingFormStep2">
            <div class="form-group">
              <label for="obScienceDate">Science Exam Date</label>
              <input type="date" id="obScienceDate" class="form-input" value="${(onboardingDraft.datesheet && onboardingDraft.datesheet.science) || ""}" required />
            </div>
            <div class="form-group">
              <label for="obMathsDate">Mathematics Exam Date</label>
              <input type="date" id="obMathsDate" class="form-input" value="${(onboardingDraft.datesheet && onboardingDraft.datesheet.maths) || ""}" required />
            </div>
            <div class="form-group">
              <label for="obSstDate">Social Science Exam Date</label>
              <input type="date" id="obSstDate" class="form-input" value="${(onboardingDraft.datesheet && onboardingDraft.datesheet.sst) || ""}" required />
            </div>
            <div id="dateWarningMsg" style="color:var(--status-amber); font-size:var(--font-size-sm); margin-bottom:0.5rem; display:none;"></div>
            <button type="submit" class="btn btn-primary btn-block">Next: Select Exam Syllabus →</button>
          </form>
        </div>

        <div id="onboardingStep3" class="onboarding-step">
          <h3>Step 3 of 4: Exam Syllabus Selection</h3>
          <p style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-bottom:0.75rem;">
            💡 Uncheck any chapter NOT included in your midterm. This makes your daily pace accurate.
          </p>

          <div id="syllabusChecklistContainer"></div>

          <button type="button" data-action="save-onboarding-syllabus" class="btn btn-primary btn-block mt-4">Next: Record Finished Work →</button>
        </div>

        <div id="onboardingStep4" class="onboarding-step">
          <h3>Step 4 of 4: Record Finished Work</h3>
          <p>Quickly mark chapters in your syllabus you have already completed. You can skip this step.</p>
          
          <div id="backfillChapterList" style="max-height:300px; overflow-y:auto; margin-bottom:1rem; padding-right:0.5rem;"></div>

          <div style="display:flex; gap:0.5rem;">
            <button type="button" data-action="finish-onboarding" class="btn btn-secondary btn-block">Skip & Finish</button>
            <button type="button" data-action="finish-onboarding" class="btn btn-primary btn-block">Start Tracking 🚀</button>
          </div>
        </div>
      </div>
    `;
  }

  function setupGlobalListeners() {
    document.addEventListener("click", e => {
      const targetAction = e.target.closest("[data-action]");
      if (!targetAction) return;

      const action = targetAction.dataset.action;

      if (action === "finish-onboarding") {
        currentScreen = "dashboard";
        render();
      } else if (action === "save-onboarding-syllabus") {
        onboardingDraft.examSyllabus = readSyllabusChecklistFromDom();
        const created = window.TrackerStorage.createProfile(state, onboardingDraft);
        populateBackfillStep(created);

        const s3 = document.getElementById("onboardingStep3");
        const s4 = document.getElementById("onboardingStep4");
        if (s3) s3.classList.remove("active");
        if (s4) s4.classList.add("active");
      } else if (action === "toggle-backfill-item") {
        const profile = window.TrackerStorage.getActiveProfile(state);
        if (!profile) return;
        const { subjectId, chapterId } = targetAction.dataset;
        const isDone = targetAction.classList.contains("btn-primary");
        window.TrackerStorage.backfillChapters(state, profile.id, subjectId, [chapterId], !isDone);

        if (!isDone) {
          targetAction.classList.remove("btn-secondary");
          targetAction.classList.add("btn-primary");
          targetAction.innerText = "✓ Done";
        } else {
          targetAction.classList.remove("btn-primary");
          targetAction.classList.add("btn-secondary");
          targetAction.innerText = "Mark Done";
        }
      } else if (action === "nav-dashboard") {
        currentScreen = "dashboard";
        render();
      } else if (action === "nav-subject") {
        currentScreen = "subject";
        render();
      } else if (action === "nav-insights") {
        currentScreen = "insights";
        render();
      } else if (action === "nav-resources") {
        currentScreen = "resources";
        render();
      } else if (action === "nav-settings") {
        currentScreen = "settings";
        render();
      } else if (action === "open-subject") {
        activeSubjectId = targetAction.dataset.subjectId;
        currentScreen = "subject";
        render();
      } else if (action === "switch-subject-tab") {
        activeSubjectId = targetAction.dataset.subjectId;
        render();
      } else if (action === "filter-chapters") {
        chapterFilter = targetAction.dataset.filter;
        render();
      } else if (action === "toggle-chapter-panel") {
        const chId = targetAction.dataset.chapterId;
        // Chapter ids repeat across subjects (ch1..ch14), so namespace the open-panel state
        const panelKey = `${activeSubjectId || ""}:${chId}`;
        openChapterId = openChapterId === panelKey ? null : panelKey;
        render();
      } else if (action === "cycle-stage-dot") {
        e.stopPropagation();
        const profile = window.TrackerStorage.getActiveProfile(state);
        const { subjectId, chapterId, stageKey } = targetAction.dataset;
        window.TrackerStorage.updateChapterStage(state, profile.id, subjectId, chapterId, stageKey);
        render();
      } else if (action === "disabled-stage-dot") {
        e.stopPropagation();
        showCustomAlertModal("Chapter Out of Syllabus", "This chapter isn't in your current midterm syllabus. Edit in Settings → Exam Syllabus.");
      } else if (action === "quick-toggle-stage") {
        const profile = window.TrackerStorage.getActiveProfile(state);
        const { subjectId, chapterId, stageKey } = targetAction.dataset;
        window.TrackerStorage.updateChapterStage(state, profile.id, subjectId, chapterId, stageKey);
        render();
      } else if (action === "view-pdf") {
        const { title, pdfPath } = targetAction.dataset;
        openPdfModal(title, pdfPath);
      } else if (action === "switch-profile-id") {
        window.TrackerStorage.setActiveProfile(state, targetAction.dataset.profileId);
        render();
      } else if (action === "delete-profile-id") {
        const pid = targetAction.dataset.profileId;
        const pname = targetAction.dataset.profileName;
        promptDeleteProfile(pid, pname);
      }
    });

    // Keyboard support: Enter/Space activate div-based controls (subject cards),
    // Escape closes any open modal.
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        const overlay = document.getElementById("modalOverlay");
        if (overlay && overlay.classList.contains("open")) {
          overlay.classList.remove("open");
          // Don't leave keyboard focus stranded on the now-hidden modal
          const activeEl = document.activeElement;
          if (activeEl && overlay.contains(activeEl)) activeEl.blur();
        }
        return;
      }

      if (e.key !== "Enter" && e.key !== " ") return;
      const el = e.target;
      if (!el || !el.hasAttribute || !el.hasAttribute("data-action")) return;
      const tag = el.tagName;
      if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      e.preventDefault();
      el.click();
    });
  }

  function bindScreenEvents() {
    const themeBtn = document.getElementById("themeToggleBtn");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        toggleTheme();
        render();
      });
    }

    const profileSelect = document.getElementById("profileSelectHeader");
    if (profileSelect) {
      profileSelect.addEventListener("change", e => {
        const val = e.target.value;
        if (val === "new") {
          currentScreen = "onboarding";
          render();
        } else {
          window.TrackerStorage.setActiveProfile(state, val);
          render();
        }
      });
    }

    const dismissV6NoticeBtn = document.getElementById("dismissV6NoticeBtn");
    if (dismissV6NoticeBtn) {
      dismissV6NoticeBtn.addEventListener("click", () => {
        const profile = window.TrackerStorage.getActiveProfile(state);
        if (profile) {
          delete profile.v6PreResourceNoticeNeeded;
          window.TrackerStorage.saveState(state);
          render();
        }
      });
    }

    const dismissV5NoticeBtn = document.getElementById("dismissV5NoticeBtn");
    if (dismissV5NoticeBtn) {
      dismissV5NoticeBtn.addEventListener("click", () => {
        const profile = window.TrackerStorage.getActiveProfile(state);
        if (profile) {
          delete profile.v5NoticeNeeded;
          window.TrackerStorage.saveState(state);
          render();
        }
      });
    }

    const confirmSyllabusBannerBtn = document.getElementById("confirmSyllabusBannerBtn");
    if (confirmSyllabusBannerBtn) {
      confirmSyllabusBannerBtn.addEventListener("click", () => {
        openSyllabusEditorModal();
      });
    }

    const backupBannerBtn = document.getElementById("downloadBackupNudgeBtn");
    if (backupBannerBtn) {
      backupBannerBtn.addEventListener("click", openExportModal);
    }

    if (currentScreen === "settings") {
      const editSyllabusBtn = document.getElementById("editExamSyllabusBtn");
      if (editSyllabusBtn) {
        editSyllabusBtn.addEventListener("click", openSyllabusEditorModal);
      }

      const datesheetForm = document.getElementById("datesheetForm");
      if (datesheetForm) {
        datesheetForm.addEventListener("submit", e => {
          e.preventDefault();
          const profile = window.TrackerStorage.getActiveProfile(state);
          const sc = document.getElementById("dsScience").value;
          const ma = document.getElementById("dsMaths").value;
          const ss = document.getElementById("dsSst").value;

          window.TrackerStorage.updateProfileDetails(state, profile.id, {
            datesheet: { science: sc, maths: ma, sst: ss }
          });
          showCustomAlertModal("Saved", "Datesheet saved successfully!", () => {
            render();
          });
        });
      }

      const exportBtn = document.getElementById("exportBackupBtn");
      if (exportBtn) exportBtn.addEventListener("click", openExportModal);

      const importBtn = document.getElementById("importBackupBtn");
      const importInput = document.getElementById("importFileInput");
      if (importBtn && importInput) {
        importBtn.addEventListener("click", () => importInput.click());
        importInput.addEventListener("change", handleImportFile);
      }

      const copyDiagBtn = document.getElementById("copyDiagnosticsBtn");
      if (copyDiagBtn) {
        copyDiagBtn.addEventListener("click", copyDiagnosticInformation);
      }

      const settingsThemeBtn = document.getElementById("settingsThemeToggleBtn");
      if (settingsThemeBtn) {
        settingsThemeBtn.addEventListener("click", () => {
          toggleTheme();
          render();
        });
      }

      const addProfileBtn = document.getElementById("addNewProfileSettingsBtn");
      if (addProfileBtn) {
        addProfileBtn.addEventListener("click", () => {
          currentScreen = "onboarding";
          render();
        });
      }

      const resetBtn = document.getElementById("resetAllDataBtn");
      if (resetBtn) {
        resetBtn.addEventListener("click", promptResetAllData);
      }
    }

    if (currentScreen === "onboarding") {
      // Draft lifecycle is managed in render(): reset on entry, preserved on re-render.
      // Keep the draft in sync with typed input so re-renders (e.g. theme toggle)
      // can restore the values from the bound attributes above.
      const obNameInput = document.getElementById("obName");
      if (obNameInput) {
        obNameInput.addEventListener("input", () => { onboardingDraft.name = obNameInput.value; });
      }
      const obGradeSel = document.getElementById("obGrade");
      if (obGradeSel) {
        obGradeSel.addEventListener("change", () => { onboardingDraft.grade = Number(obGradeSel.value); });
      }
      [["obScienceDate", "science"], ["obMathsDate", "maths"], ["obSstDate", "sst"]].forEach(([id, key]) => {
        const dateEl = document.getElementById(id);
        if (dateEl) {
          dateEl.addEventListener("input", () => { onboardingDraft.datesheet[key] = dateEl.value; });
        }
      });

      const obForm1 = document.getElementById("onboardingFormStep1");
      if (obForm1) {
        obForm1.addEventListener("submit", e => {
          e.preventDefault();
          onboardingDraft.name = document.getElementById("obName").value.trim();
          onboardingDraft.grade = Number(document.getElementById("obGrade").value);

          const s1 = document.getElementById("onboardingStep1");
          const s2 = document.getElementById("onboardingStep2");
          if (s1) s1.classList.remove("active");
          if (s2) s2.classList.add("active");
        });
      }

      const obForm2 = document.getElementById("onboardingFormStep2");
      if (obForm2) {
        obForm2.addEventListener("submit", e => {
          e.preventDefault();
          const scDate = document.getElementById("obScienceDate").value;
          const maDate = document.getElementById("obMathsDate").value;
          const ssDate = document.getElementById("obSstDate").value;

          const today = new Date(window.TrackerStorage.getTodayString());
          const maxDate = new Date();
          maxDate.setMonth(maxDate.getMonth() + 12);

          let warning = "";
          [scDate, maDate, ssDate].forEach(dStr => {
            const d = new Date(dStr);
            if (d < today) warning = "Warning: One or more dates are in the past.";
            else if (d > maxDate) warning = "Warning: One or more dates are more than 12 months out.";
          });

          const warnEl = document.getElementById("dateWarningMsg");
          if (warning && warnEl) {
            warnEl.innerText = warning;
            warnEl.style.display = "block";
          }

          onboardingDraft.datesheet = { science: scDate, maths: maDate, sst: ssDate };
          // Preserve already-selected syllabus when re-walking the steps after a re-render
          onboardingDraft.examSyllabus = onboardingDraft.examSyllabus || window.TrackerStorage.getDefaultExamSyllabus(onboardingDraft.grade);

          populateSyllabusChecklistStep(onboardingDraft);

          const s2 = document.getElementById("onboardingStep2");
          const s3 = document.getElementById("onboardingStep3");
          if (s2) s2.classList.remove("active");
          if (s3) s3.classList.add("active");
        });
      }
    }
  }

  function copyDiagnosticInformation() {
    const activeProf = window.TrackerStorage.getActiveProfile(state);
    const storageDiag = window.TrackerStorage.testStorageDiagnostics();
    const swAvailable = typeof navigator !== "undefined" && "serviceWorker" in navigator;

    let trackedChCount = 0;
    if (activeProf && activeProf.progress) {
      trackedChCount = Object.keys(activeProf.progress).length;
    }

    const diagText = [
      "=== SUNIL BHAIYA CBSE TRACKER DIAGNOSTICS ===",
      `App Branding: Sunil Bhaiya Edition`,
      `Protocol: ${location.protocol}`,
      `User Agent: ${navigator.userAgent || "Unknown"}`,
      `Storage Status: ${storageDiag}`,
      `ServiceWorker Supported: ${swAvailable}`,
      `Schema Version: ${state ? state.schemaVersion : "N/A"}`,
      `Total Profiles: ${state && state.profiles ? state.profiles.length : 0}`,
      `Active Profile: ${activeProf ? `${activeProf.name} (Class ${activeProf.grade})` : "None"}`,
      `Tracked Chapters: ${trackedChCount}`,
      "============================================="
    ].join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(diagText).then(() => {
        showCustomAlertModal("Copied", "Diagnostic info copied to clipboard! You can paste this in a support chat.");
      }).catch(() => {
        fallbackCopyText(diagText);
      });
    } else {
      fallbackCopyText(diagText);
    }
  }

  function fallbackCopyText(text) {
    let copied = false;
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      copied = document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) {
      copied = false;
    }
    showDiagnosticModal(text, copied);
  }

  function populateSyllabusChecklistStep(draftProfile) {
    const container = document.getElementById("syllabusChecklistContainer");
    if (!container) return;

    const dataset = draftProfile.grade === 9 ? window.CLASS_9 : window.CLASS_10;
    let html = renderSyllabusChecklistHtml(dataset, draftProfile.examSyllabus, draftProfile.grade);

    container.innerHTML = html;
    bindSyllabusChecklistEvents(container);

    // Keep the draft in sync with live checkbox changes so re-renders
    // (e.g. theme toggle) preserve the user's step-3 selections.
    container.addEventListener("change", e => {
      if (e.target && e.target.classList && e.target.classList.contains("syll-cb")) {
        onboardingDraft.examSyllabus = readSyllabusChecklistFromDom();
      }
    });
  }

  function renderSyllabusChecklistHtml(dataset, selectedSyllabus, grade = 10) {
    if (!dataset || dataset.length === 0) {
      return `<p style="color:var(--status-red);">Chapter data could not be loaded. Reload the page or reinstall the app.</p>`;
    }

    let html = `<div style="max-height:350px; overflow-y:auto; padding-right:0.5rem;">`;

    dataset.forEach(sub => {
      const activeList = selectedSyllabus[sub.id] || [];

      html += `
        <div style="margin-bottom:1.25rem; border:1px solid var(--border-color); padding:0.75rem; border-radius:var(--radius-md);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <strong style="color:var(--accent-primary); font-size:var(--font-size-base);">${escapeHtml(sub.name)}</strong>
            <div>
              <button type="button" class="btn btn-sm btn-secondary toggle-sub-all" data-subject-id="${sub.id}" data-mode="all">Select All</button>
              <button type="button" class="btn btn-sm btn-secondary toggle-sub-all" data-subject-id="${sub.id}" data-mode="none">Deselect All</button>
            </div>
          </div>
      `;

      sub.groups.forEach(g => {
        if (g.name) {
          html += `<div class="group-header" style="margin-top:0.75rem;">└─ ${escapeHtml(g.name)}</div>`;
        }

        g.chapters.forEach(ch => {
          const scopedId = window.TrackerStorage.getScopedChapterId(sub.id, g.id, ch.id, grade);
          const isChecked = activeList.includes(scopedId);

          html += `
            <label class="syllabus-checkbox-item">
              <input type="checkbox" class="syll-cb" data-subject-id="${sub.id}" data-scoped-id="${scopedId}" ${isChecked ? "checked" : ""} />
              <span style="font-size:var(--font-size-sm);">
                ${g.name ? `${escapeHtml(g.name)} — ` : ""}Ch ${ch.no}: ${escapeHtml(ch.name)}
              </span>
            </label>
          `;
        });
      });

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }

  function bindSyllabusChecklistEvents(container) {
    container.querySelectorAll(".toggle-sub-all").forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        const subId = btn.dataset.subjectId;
        const mode = btn.dataset.mode;
        const cbs = container.querySelectorAll(`input.syll-cb[data-subject-id="${subId}"]`);
        cbs.forEach(cb => {
          cb.checked = (mode === "all");
          // bubble a change so the onboarding checklist syncs the draft
          cb.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
    });
  }

  function readSyllabusChecklistFromDom() {
    const result = { science: [], maths: [], sst: [] };
    const checkboxes = document.querySelectorAll("input.syll-cb");
    checkboxes.forEach(cb => {
      if (cb.checked) {
        const subId = cb.dataset.subjectId;
        const scopedId = cb.dataset.scopedId;
        if (result[subId]) {
          result[subId].push(scopedId);
        }
      }
    });
    return result;
  }

  function openSyllabusEditorModal() {
    const profile = window.TrackerStorage.getActiveProfile(state);
    if (!profile) return;

    const overlay = document.getElementById("modalOverlay");
    if (!overlay) return;

    const dataset = profile.grade === 9 ? window.CLASS_9 : window.CLASS_10;
    const checklistHtml = renderSyllabusChecklistHtml(dataset, profile.examSyllabus, profile.grade);

    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 style="margin:0;">📚 Edit Exam Syllabus Checklist</h3>
          <button type="button" id="closeSyllabusModalBtn" class="btn btn-sm btn-secondary">✕ Close</button>
        </div>
        <div class="modal-body">
          <p style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-bottom:1rem;">
            Uncheck any chapter NOT included in your midterm. Daily preparation pace will recalculate immediately.
          </p>

          <div id="modalSyllabusContainer">
            ${checklistHtml}
          </div>

          <div style="margin-top:1rem; text-align:right;">
            <button type="button" id="saveSyllabusModalBtn" class="btn btn-primary btn-block">Save Syllabus & Recalculate Pace</button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("open");

    const modalContainer = document.getElementById("modalSyllabusContainer");
    bindSyllabusChecklistEvents(modalContainer);

    document.getElementById("closeSyllabusModalBtn").addEventListener("click", () => {
      overlay.classList.remove("open");
    });

    document.getElementById("saveSyllabusModalBtn").addEventListener("click", () => {
      const updatedSyllabus = readSyllabusChecklistFromDom();
      window.TrackerStorage.updateExamSyllabus(state, profile.id, updatedSyllabus);
      overlay.classList.remove("open");
      showCustomAlertModal("Syllabus Updated", "Exam syllabus updated! Pace math recalculated.", () => {
        render();
      });
    });
  }

  function populateBackfillStep(profile) {
    const listEl = document.getElementById("backfillChapterList");
    if (!listEl) return;

    const subjectsData = profile.grade === 9 ? window.CLASS_9 : window.CLASS_10;
    if (!subjectsData || subjectsData.length === 0) {
      listEl.innerHTML = `<p style="color:var(--text-secondary);">Chapter data could not be loaded, so finished-work marking is unavailable.</p>`;
      return;
    }

    let html = "";

    subjectsData.forEach(sub => {
      const activeSyllabus = (profile.examSyllabus && profile.examSyllabus[sub.id])
        ? profile.examSyllabus[sub.id]
        : [];

      html += `<div style="font-weight:700; margin-top:0.75rem; color:var(--accent-primary); border-bottom:1px solid var(--border-color);">${escapeHtml(sub.name)}</div>`;

      sub.groups.forEach(g => {
        if (g.name) {
          html += `<div class="group-header" style="margin-top:0.5rem;">└─ ${escapeHtml(g.name)}</div>`;
        }

        g.chapters.forEach(ch => {
          const scopedId = window.TrackerStorage.getScopedChapterId(sub.id, g.id, ch.id, profile.grade);
          if (!activeSyllabus.includes(scopedId)) return;

          html += `
            <div class="backfill-chapter-item">
              <span style="font-size:var(--font-size-sm);">
                ${g.name ? `${escapeHtml(g.name)} — ` : ""}Ch ${ch.no}: ${escapeHtml(ch.name)}
              </span>
              <button type="button" class="btn btn-sm btn-secondary" data-action="toggle-backfill-item" data-subject-id="${sub.id}" data-chapter-id="${ch.id}">Mark Done</button>
            </div>
          `;
        });
      });
    });

    listEl.innerHTML = html;
  }

  function openPdfModal(title, pdfPath) {
    const overlay = document.getElementById("modalOverlay");
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="modal-content pdf-modal">
        <div class="modal-header">
          <h3 style="margin:0;">📄 ${escapeHtml(title)}</h3>
          <button type="button" id="closePdfModalBtn" class="btn btn-sm btn-secondary">✕ Close</button>
        </div>
        <div class="modal-body">
          <div class="pdf-embed-wrapper">
            <iframe src="${pdfPath}#toolbar=0" title="${escapeHtml(title)}">
              <p>Your browser cannot render PDFs inline.</p>
              <a href="${pdfPath}" target="_blank" rel="noopener">Open PDF in New Tab</a>
            </iframe>
          </div>
          <div style="text-align:center; margin-top:0.75rem; display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;">
            <a href="${pdfPath}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary">🌐 Open PDF in New Tab</a>
            <a href="${pdfPath}" download target="_blank" rel="noopener" class="btn btn-sm btn-primary">⬇️ Download File</a>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("open");

    document.getElementById("closePdfModalBtn").addEventListener("click", () => {
      overlay.classList.remove("open");
    });
  }

  function openExportModal() {
    const activeProfile = window.TrackerStorage.getActiveProfile(state);
    const overlay = document.getElementById("modalOverlay");
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 style="margin:0;">💾 Save Progress to a File</h3>
          <button type="button" id="closeExportModalBtn" class="btn btn-sm btn-secondary">✕ Close</button>
        </div>
        <div class="modal-body">
          <p style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-bottom:1rem;">
            Choose whether to export only the current active profile or all student profiles on this device.
          </p>

          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${activeProfile ? `
              <button type="button" id="exportActiveProfileBtn" class="btn btn-primary btn-block">
                Export Current Profile ("${escapeHtml(activeProfile.name)}") Only
              </button>
            ` : ""}
            <button type="button" id="exportAllProfilesBtn" class="btn btn-secondary btn-block">
              Export All Profiles (${state.profiles.length} profiles)
            </button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("open");

    document.getElementById("closeExportModalBtn").addEventListener("click", () => overlay.classList.remove("open"));

    if (activeProfile) {
      document.getElementById("exportActiveProfileBtn").addEventListener("click", () => {
        triggerExportBackup(activeProfile.id);
        overlay.classList.remove("open");
      });
    }

    document.getElementById("exportAllProfilesBtn").addEventListener("click", () => {
      triggerExportBackup("all");
      overlay.classList.remove("open");
    });
  }

  function triggerExportBackup(profileId = "all") {
    const profile = window.TrackerStorage.getActiveProfile(state);
    const dateStr = window.TrackerStorage.getTodayString().replace(/-/g, "");

    let filename = `cbse-tracker-backup-${dateStr}.json`;
    if (profileId !== "all" && profile) {
      const safeName = profile.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      filename = `cbse-tracker-${safeName}-${dateStr}.json`;
    }

    const jsonText = window.TrackerStorage.exportBackup(state, profileId);
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    // Defer revocation so the download isn't aborted mid-flight in some browsers
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showCustomAlertModal("Backup Saved", `Progress saved to file: ${filename}`, () => render());
  }

  function processImportDuplicates(duplicates, index, actionMap, onComplete) {
    if (index >= duplicates.length) {
      onComplete();
      return;
    }

    const dup = duplicates[index];
    const msg = `A profile named "${dup.imported.name}" (Class ${dup.imported.grade}) already exists on this device.\n\nChoose 'Replace Existing' to replace it, or 'Import as New' to create a copy ("${dup.imported.name} (Imported)").`;

    showCustomConfirmModal(
      "Duplicate Profile Found",
      msg,
      () => {
        actionMap[dup.imported.id] = "replace";
        actionMap[dup.imported.name] = "replace";
        processImportDuplicates(duplicates, index + 1, actionMap, onComplete);
      },
      () => {
        actionMap[dup.imported.id] = "copy_new";
        actionMap[dup.imported.name] = "copy_new";
        processImportDuplicates(duplicates, index + 1, actionMap, onComplete);
      }
    );
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      const content = evt.target.result;
      const res = window.TrackerStorage.parseAndValidateBackup(content, state);

      if (!res.valid) {
        showCustomAlertModal("Import Failed", "Import Failed:\n\n" + res.error);
        return;
      }

      const actionMap = {};

      const proceedWithFinalConfirmation = () => {
        const confirmMsg = `This operation will add/restore ${res.summary.profileCount} profile(s) with ${res.summary.trackedChapterCount} total chapter progress entries.\n\nContinue?`;
        showCustomConfirmModal("Confirm Import", confirmMsg, () => {
          window.TrackerStorage.applyImportData(state, res.data, actionMap);
          showCustomAlertModal("Import Successful", "Progress loaded successfully!", () => {
            currentScreen = "dashboard";
            render();
          });
        });
      };

      if (res.summary.duplicates && res.summary.duplicates.length > 0) {
        processImportDuplicates(res.summary.duplicates, 0, actionMap, proceedWithFinalConfirmation);
      } else {
        proceedWithFinalConfirmation();
      }
    };
    reader.readAsText(file);

    e.target.value = "";
  }

  function promptDeleteProfile(profileId, profileName) {
    const overlay = document.getElementById("modalOverlay");
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <h3 style="margin:0; color:var(--status-red);">🗑️ Delete Profile</h3>
          <button type="button" id="closeDeleteModalBtn" class="btn btn-sm btn-secondary">✕ Close</button>
        </div>
        <div class="modal-body">
          <div class="modal-danger-icon">⚠️</div>
          <p style="text-align:center; font-weight:600; margin-bottom:0.75rem;">
            Are you sure you want to delete profile "<strong>${escapeHtml(profileName)}</strong>"?
          </p>
          <p class="confirm-input-instruction text-center">
            To confirm, type <strong>${escapeHtml(profileName)}</strong> below:
          </p>
          <input type="text" id="confirmDeleteInput" class="form-input" placeholder="${escapeHtml(profileName)}" autocomplete="off" style="text-align:center;" />
          <div id="deleteErrorMsg" class="confirm-error-msg text-center">Profile name did not match.</div>

          <div class="modal-footer-actions">
            <button type="button" id="cancelDeleteBtn" class="btn btn-secondary">Cancel</button>
            <button type="button" id="confirmDeleteBtn" class="btn btn-danger">Delete Profile</button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("open");

    const inputEl = document.getElementById("confirmDeleteInput");
    const errorEl = document.getElementById("deleteErrorMsg");
    if (inputEl) setTimeout(() => inputEl.focus(), 50);

    const closeModal = () => overlay.classList.remove("open");
    document.getElementById("closeDeleteModalBtn")?.addEventListener("click", closeModal);
    document.getElementById("cancelDeleteBtn")?.addEventListener("click", closeModal);

    document.getElementById("confirmDeleteBtn")?.addEventListener("click", () => {
      const val = inputEl ? inputEl.value.trim() : "";
      if (val === profileName) {
        closeModal();
        window.TrackerStorage.deleteProfile(state, profileId);
        showCustomAlertModal("Profile Deleted", `Profile "${profileName}" has been deleted.`, () => {
          render();
        });
      } else {
        if (errorEl) errorEl.classList.add("visible");
      }
    });

    if (inputEl) {
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          document.getElementById("confirmDeleteBtn")?.click();
        }
      });
    }
  }

  function promptResetAllData() {
    const overlay = document.getElementById("modalOverlay");
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <h3 style="margin:0; color:var(--status-red);">🚨 Reset All App Data</h3>
          <button type="button" id="closeResetModalBtn" class="btn btn-sm btn-secondary">✕ Close</button>
        </div>
        <div class="modal-body">
          <div class="modal-danger-icon">💣</div>
          <p style="text-align:center; font-weight:600; margin-bottom:0.5rem; color:var(--status-red);">
            WARNING: This will delete ALL profiles and progress on this device!
          </p>
          <p class="confirm-input-instruction text-center">
            To confirm, type <strong>DELETE</strong> in the box below:
          </p>
          <input type="text" id="confirmResetInput" class="form-input" placeholder="DELETE" autocomplete="off" style="text-align:center;" />
          <div id="resetErrorMsg" class="confirm-error-msg text-center">Confirmation failed. You must type "DELETE".</div>

          <div class="modal-footer-actions">
            <button type="button" id="cancelResetBtn" class="btn btn-secondary">Cancel</button>
            <button type="button" id="confirmResetBtn" class="btn btn-danger">Reset Everything</button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("open");

    const inputEl = document.getElementById("confirmResetInput");
    const errorEl = document.getElementById("resetErrorMsg");
    if (inputEl) setTimeout(() => inputEl.focus(), 50);

    const closeModal = () => overlay.classList.remove("open");
    document.getElementById("closeResetModalBtn")?.addEventListener("click", closeModal);
    document.getElementById("cancelResetBtn")?.addEventListener("click", closeModal);

    document.getElementById("confirmResetBtn")?.addEventListener("click", () => {
      const val = inputEl ? inputEl.value.trim() : "";
      if (val === "DELETE") {
        closeModal();
        state = window.TrackerStorage.resetAllData();
        showCustomAlertModal("Reset Complete", "All app data has been reset.", () => {
          currentScreen = "onboarding";
          render();
        });
      } else {
        if (errorEl) errorEl.classList.add("visible");
      }
    });

    if (inputEl) {
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          document.getElementById("confirmResetBtn")?.click();
        }
      });
    }
  }

  function showDiagnosticModal(text, isCopied) {
    const overlay = document.getElementById("modalOverlay");
    if (!overlay) return;

    const statusText = isCopied
      ? "✅ Diagnostic info copied to clipboard!"
      : "📋 Select and copy the diagnostic info below:";

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 480px;">
        <div class="modal-header">
          <h3 style="margin:0;">📋 Diagnostic Information</h3>
          <button type="button" id="closeDiagModalBtn" class="btn btn-sm btn-secondary">✕ Close</button>
        </div>
        <div class="modal-body">
          <p style="font-size:var(--font-size-sm); margin-bottom:0.75rem;">${statusText}</p>
          <textarea id="diagTextArea" readonly class="form-input" style="height:160px; font-family:monospace; font-size:12px; resize:none;">${escapeHtml(text)}</textarea>
          <div class="modal-footer-actions">
            <button type="button" id="copyDiagBtn" class="btn btn-primary">📋 Copy Text</button>
            <button type="button" id="closeDiagFooterBtn" class="btn btn-secondary">Close</button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("open");

    const ta = document.getElementById("diagTextArea");
    if (ta) {
      ta.focus();
      ta.select();
    }

    const closeModal = () => overlay.classList.remove("open");
    document.getElementById("closeDiagModalBtn")?.addEventListener("click", closeModal);
    document.getElementById("closeDiagFooterBtn")?.addEventListener("click", closeModal);

    document.getElementById("copyDiagBtn")?.addEventListener("click", () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showCustomAlertModal("Success", "Diagnostic info copied to clipboard!");
        }).catch(() => {
          if (ta) { ta.select(); document.execCommand("copy"); }
          showCustomAlertModal("Success", "Diagnostic info copied to clipboard!");
        });
      } else {
        if (ta) { ta.select(); document.execCommand("copy"); }
        showCustomAlertModal("Success", "Diagnostic info copied to clipboard!");
      }
    });
  }

  function showCustomAlertModal(title, message, onOk) {
    const overlay = document.getElementById("modalOverlay");
    if (!overlay) {
      if (onOk) onOk();
      return;
    }

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3 style="margin:0;">${escapeHtml(title)}</h3>
          <button type="button" id="closeAlertHeaderBtn" class="btn btn-sm btn-secondary">✕</button>
        </div>
        <div class="modal-body" style="text-align:center;">
          <p style="margin: 0.5rem 0 1.25rem 0; font-size: var(--font-size-base); white-space: pre-line;">${escapeHtml(message)}</p>
          <div class="modal-footer-actions" style="justify-content:center;">
            <button type="button" id="alertOkBtn" class="btn btn-primary" style="min-width:100px;">OK</button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("open");

    const closeAlert = () => {
      overlay.classList.remove("open");
      if (onOk) onOk();
    };

    document.getElementById("closeAlertHeaderBtn")?.addEventListener("click", closeAlert);
    document.getElementById("alertOkBtn")?.addEventListener("click", closeAlert);
  }

  function showCustomConfirmModal(title, message, onConfirm, onCancel) {
    const overlay = document.getElementById("modalOverlay");
    if (!overlay) {
      if (onCancel) onCancel();
      return;
    }

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <h3 style="margin:0;">${escapeHtml(title)}</h3>
          <button type="button" id="closeConfirmHeaderBtn" class="btn btn-sm btn-secondary">✕</button>
        </div>
        <div class="modal-body">
          <p style="margin: 0.5rem 0 1.25rem 0; font-size: var(--font-size-base); white-space: pre-line;">${escapeHtml(message)}</p>
          <div class="modal-footer-actions">
            <button type="button" id="confirmCancelBtn" class="btn btn-secondary">Cancel</button>
            <button type="button" id="confirmOkBtn" class="btn btn-primary">Continue</button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add("open");

    const handleCancel = () => {
      overlay.classList.remove("open");
      if (onCancel) onCancel();
    };

    const handleOk = () => {
      overlay.classList.remove("open");
      if (onConfirm) onConfirm();
    };

    document.getElementById("closeConfirmHeaderBtn")?.addEventListener("click", handleCancel);
    document.getElementById("confirmCancelBtn")?.addEventListener("click", handleCancel);
    document.getElementById("confirmOkBtn")?.addEventListener("click", handleOk);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(init, 1);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }

})();
