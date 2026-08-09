/**
 * CBSE Class 9 & 10 Study Tracker - Storage Module
 * Manages localStorage key `cbse_tracker_v1` with schema versioning & migration.
 * Hardened against browser extension interference and storage access exceptions.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "cbse_tracker_v1";
  const CURRENT_SCHEMA_VERSION = 1;

  let isStorageBlocked = false;

  function toLocalDateStr(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getTodayString() {
    return toLocalDateStr(new Date());
  }

  function getScopedChapterId(subjectId, groupId, chapterId, grade = 10) {
    if (grade === 10 && subjectId === "sst" && groupId) {
      return `${groupId}.${chapterId}`;
    }
    return chapterId;
  }

  function getDefaultExamSyllabus(grade) {
    const dataset = grade === 9 ? window.CLASS_9 : window.CLASS_10;
    if (!dataset) return { science: [], maths: [], sst: [] };

    const syllabus = { science: [], maths: [], sst: [] };

    dataset.forEach(sub => {
      const ids = [];
      sub.groups.forEach(g => {
        g.chapters.forEach(ch => {
          ids.push(getScopedChapterId(sub.id, g.id, ch.id, grade));
        });
      });
      syllabus[sub.id] = ids;
    });

    return syllabus;
  }

  function createInitialState() {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      activeProfileId: null,
      lastBackupAt: null,
      profiles: []
    };
  }

  function migrateProfile(profile) {
    if (!profile.examSyllabus) {
      profile.examSyllabus = getDefaultExamSyllabus(profile.grade || 10);
      profile.needsSyllabusConfirmation = true;
    }

    if (profile.grade === 9 && !profile.v5Class9EditionMigrated) {
      migrateClass9ProfileV5(profile);
    }

    if (profile.grade === 9 && !profile.v6Class9StagesMigrated) {
      migrateClass9ProfileV6(profile);
    }

    return profile;
  }

  function migrateClass9ProfileV5(profile) {
    const hasOldProgress = profile.progress && Object.keys(profile.progress).length > 0;
    if (hasOldProgress) {
      if (!profile.archivedProgress) profile.archivedProgress = {};
      profile.archivedProgress.class9_old_edition = { ...profile.progress };
      profile.progress = {};
      profile.v5NoticeNeeded = true;
    }

    profile.examSyllabus = getDefaultExamSyllabus(9);
    profile.v5Class9EditionMigrated = true;
  }

  function migrateClass9ProfileV6(profile) {
    if (profile.progress) {
      let archivedPreResource = {};
      let hasArchivedData = false;

      Object.keys(profile.progress).forEach(key => {
        const pObj = profile.progress[key];
        if (!pObj) return;

        const hasExemplar = pObj.exemplar && pObj.exemplar !== "none";
        const hasCbq = pObj.cbq && pObj.cbq !== "none";
        const hasPyq = pObj.pyq && pObj.pyq !== "none";

        if (hasExemplar || hasCbq || hasPyq) {
          archivedPreResource[key] = {
            exemplar: pObj.exemplar || "none",
            cbq: pObj.cbq || "none",
            pyq: pObj.pyq || "none"
          };
          hasArchivedData = true;
        }

        profile.progress[key] = {
          theory: pObj.theory || "none",
          ncert: pObj.ncert || "none",
          revision: pObj.revision || "none",
          updatedAt: pObj.updatedAt || new Date().toISOString()
        };
      });

      if (hasArchivedData) {
        if (!profile.archivedProgress) profile.archivedProgress = {};
        profile.archivedProgress.class9_preResourceRemoval = archivedPreResource;
        profile.v6PreResourceNoticeNeeded = true;
      }
    }

    profile.v6Class9StagesMigrated = true;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialState();

      let data = JSON.parse(raw);
      if (!data.schemaVersion) data.schemaVersion = 1;
      if (!Array.isArray(data.profiles)) data.profiles = [];

      data.profiles.forEach(p => migrateProfile(p));
      return data;
    } catch (err) {
      console.warn("localStorage read blocked/failed:", err);
      isStorageBlocked = true;
      return createInitialState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("localStorage write blocked/failed:", err);
      isStorageBlocked = true;
    }
  }

  function getActiveProfile(state) {
    if (!state || !state.profiles || state.profiles.length === 0) return null;
    const profile = state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0];
    if (profile) migrateProfile(profile);
    return profile || null;
  }

  function generateId() {
    return "prof_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
  }

  function createProfile(state, { name, grade, datesheet, examSyllabus }) {
    const newProf = {
      id: generateId(),
      name: name || "Student",
      grade: Number(grade) || 10,
      datesheet: datesheet || { science: "", maths: "", sst: "" },
      examSyllabus: examSyllabus || getDefaultExamSyllabus(grade),
      progress: {},
      streak: { count: 1, lastActive: getTodayString() }
    };

    state.profiles.push(newProf);
    state.activeProfileId = newProf.id;
    saveState(state);
    return newProf;
  }

  function updateProfileDetails(state, profileId, updates) {
    const prof = state.profiles.find(p => p.id === profileId);
    if (!prof) return null;

    if (updates.name !== undefined) prof.name = updates.name;
    if (updates.datesheet !== undefined) prof.datesheet = { ...prof.datesheet, ...updates.datesheet };

    saveState(state);
    return prof;
  }

  function updateExamSyllabus(state, profileId, newSyllabus) {
    const prof = state.profiles.find(p => p.id === profileId);
    if (!prof) return null;

    prof.examSyllabus = newSyllabus;
    delete prof.needsSyllabusConfirmation;
    saveState(state);
    return prof;
  }

  function updateChapterStage(state, profileId, subjectId, chapterId, stageKey) {
    const prof = state.profiles.find(p => p.id === profileId);
    if (!prof) return null;

    if (!prof.progress) prof.progress = {};
    const key = `${subjectId}.${chapterId}`;

    if (!prof.progress[key]) {
      const stageKeys = window.getStageKeysForGrade(prof.grade);
      prof.progress[key] = {};
      stageKeys.forEach(sk => { prof.progress[key][sk] = "none"; });
    }

    const current = prof.progress[key][stageKey] || "none";
    let next = "none";
    if (current === "none") next = "progress";
    else if (current === "progress") next = "done";
    else if (current === "done") next = "none";

    prof.progress[key][stageKey] = next;
    prof.progress[key].updatedAt = new Date().toISOString();

    updateStreak(prof);
    saveState(state);
    return prof.progress[key];
  }

  function backfillChapters(state, profileId, subjectId, chapterIds, markDone = true) {
    const prof = state.profiles.find(p => p.id === profileId);
    if (!prof) return null;

    if (!prof.progress) prof.progress = {};
    const stageKeys = window.getStageKeysForGrade(prof.grade);

    chapterIds.forEach(chId => {
      const key = `${subjectId}.${chId}`;
      if (!prof.progress[key]) prof.progress[key] = {};

      stageKeys.forEach(sk => {
        prof.progress[key][sk] = markDone ? "done" : "none";
      });
      prof.progress[key].updatedAt = new Date().toISOString();
    });

    updateStreak(prof);
    saveState(state);
    return prof;
  }

  function updateStreak(profile) {
    const todayStr = getTodayString();
    if (!profile.streak) {
      profile.streak = { count: 1, lastActive: todayStr };
      return;
    }

    const last = profile.streak.lastActive;
    if (last === todayStr) return;

    // Compute "yesterday" in the SAME local timezone as getTodayString().
    // toISOString() is UTC, which can shift the date for UTC+ timezones
    // (e.g. IST early-morning marks would incorrectly reset the streak).
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = toLocalDateStr(yesterday);

    if (last === yStr) {
      profile.streak.count += 1;
    } else {
      profile.streak.count = 1;
    }

    profile.streak.lastActive = todayStr;
  }

  function setActiveProfile(state, profileId) {
    const exists = state.profiles.some(p => p.id === profileId);
    if (exists) {
      state.activeProfileId = profileId;
      saveState(state);
    }
  }

  function deleteProfile(state, profileId) {
    state.profiles = state.profiles.filter(p => p.id !== profileId);
    if (state.activeProfileId === profileId) {
      state.activeProfileId = state.profiles.length > 0 ? state.profiles[0].id : null;
    }
    saveState(state);
    return state;
  }

  function resetAllData() {
    const state = createInitialState();
    saveState(state);
    return state;
  }

  function shouldShowBackupNudge(state) {
    const activeProf = getActiveProfile(state);
    if (!activeProf || !activeProf.progress) return false;
    const entryCount = Object.keys(activeProf.progress).length;
    if (entryCount < 5) return false;
    if (state.lastBackupAt) return false;
    return true;
  }

  function exportBackup(state, profileId = "all") {
    state.lastBackupAt = new Date().toISOString();
    saveState(state);

    let exportProfiles = state.profiles;
    if (profileId !== "all") {
      exportProfiles = state.profiles.filter(p => p.id === profileId);
    }

    const payload = {
      appName: "Sunil Bhaiya CBSE Tracker",
      exportedAt: new Date().toISOString(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      activeProfileId: profileId !== "all" ? profileId : state.activeProfileId,
      profiles: exportProfiles
    };

    return JSON.stringify(payload, null, 2);
  }

  function parseAndValidateBackup(jsonString, currentState) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== "object") return { valid: false, error: "File does not contain a valid JSON object." };
      if (!Array.isArray(data.profiles)) return { valid: false, error: "Invalid backup: Missing 'profiles' array." };

      let totalTrackedChapters = 0;
      const duplicates = [];

      data.profiles.forEach(p => {
        if (p.progress) totalTrackedChapters += Object.keys(p.progress).length;
        if (currentState && currentState.profiles) {
          const dup = currentState.profiles.find(cp => String(cp.name || "").toLowerCase() === String(p.name || "").toLowerCase() && cp.grade === p.grade);
          if (dup) duplicates.push({ imported: p, existing: dup });
        }
      });

      return {
        valid: true,
        data,
        summary: {
          profileCount: data.profiles.length,
          trackedChapterCount: totalTrackedChapters,
          duplicates
        }
      };
    } catch (err) {
      return { valid: false, error: "JSON Syntax Error: " + err.message };
    }
  }

  function applyImportData(state, importedData, actionMap = {}) {
    importedData.profiles.forEach(impProf => {
      if (!impProf.name) impProf.name = "Student";
      migrateProfile(impProf);
      const existingIdx = state.profiles.findIndex(p =>
        p.id === impProf.id ||
        (String(p.name || "").toLowerCase() === String(impProf.name || "").toLowerCase() && p.grade === impProf.grade)
      );
      const action = actionMap[impProf.id] || actionMap[impProf.name] || "copy_new";

      if (existingIdx !== -1 && action === "replace") {
        state.profiles[existingIdx] = impProf;
      } else {
        if (existingIdx !== -1) {
          impProf.id = generateId();
          impProf.name = `${impProf.name} (Imported)`;
        }
        state.profiles.push(impProf);
      }
    });

    // Only adopt the imported active profile if it actually exists after import
    // (a duplicate imported as "copy_new" receives a brand-new id).
    if (importedData.activeProfileId && state.profiles.some(p => p.id === importedData.activeProfileId)) {
      state.activeProfileId = importedData.activeProfileId;
    } else if (state.profiles.length > 0) {
      state.activeProfileId = state.profiles[0].id;
    }

    saveState(state);
    return state;
  }

  function testStorageDiagnostics() {
    try {
      const testKey = "__cbse_test__";
      localStorage.setItem(testKey, "1");
      const val = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return val === "1" ? "Working (Read & Write OK)" : "Read Error";
    } catch (err) {
      return "Storage Access Blocked (" + (err.message || "Permission Denied") + ")";
    }
  }

  if (typeof window !== "undefined") {
    window.TrackerStorage = {
      getTodayString,
      getStageKeysForGrade: window.getStageKeysForGrade,
      getScopedChapterId,
      getDefaultExamSyllabus,
      createInitialState,
      loadState,
      saveState,
      getActiveProfile,
      createProfile,
      updateProfileDetails,
      updateExamSyllabus,
      updateChapterStage,
      backfillChapters,
      setActiveProfile,
      deleteProfile,
      resetAllData,
      shouldShowBackupNudge,
      exportBackup,
      parseAndValidateBackup,
      applyImportData,
      testStorageDiagnostics,
      get isStorageBlocked() { return isStorageBlocked; }
    };
  }
})();
