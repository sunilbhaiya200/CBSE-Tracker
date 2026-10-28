/**
 * CBSE Class 9 & 10 Study Tracker - Planner Module
 * Pace math, today's focus, status colors, and exam countdowns scoped to examSyllabus and grade stage sets.
 */

(function () {
  "use strict";

  /**
   * Returns dynamic stage keys array for a given grade in exact display order
   */
  function getStageKeys(grade = 10) {
    if (typeof window !== "undefined" && window.STAGE_SETS) {
      return window.STAGE_SETS[grade] || window.STAGE_SETS[10];
    }
    return grade === 9 ? ["theory", "ncert", "revision"] : ["theory", "ncert", "exemplar", "pyq", "cbq"];
  }

  /**
   * Calculates progress and pace for a given subject scoped to profile.examSyllabus
   * @param {Object} profile - Student profile
   * @param {Object} subjectData - Subject chapter structure from CLASS_9 / CLASS_10
   */
  function calculateSubjectPace(profile, subjectData) {
    const todayStr = window.TrackerStorage.getTodayString();
    const today = new Date(todayStr);

    const activeSyllabus = (profile.examSyllabus && profile.examSyllabus[subjectData.id])
      ? profile.examSyllabus[subjectData.id]
      : [];

    const stageKeys = getStageKeys(profile.grade);

    // Flatten all chapters in groups with their scoped IDs (grade-aware)
    let allBookChapters = [];
    subjectData.groups.forEach(g => {
      if (g.chapters) {
        g.chapters.forEach(ch => {
          const scopedId = window.TrackerStorage.getScopedChapterId(subjectData.id, g.id, ch.id, profile.grade);
          allBookChapters.push({
            ...ch,
            groupId: g.id,
            groupName: g.name,
            scopedId
          });
        });
      }
    });

    // Filter to only chapters included in examSyllabus
    const inSyllabusChapters = allBookChapters.filter(ch => activeSyllabus.includes(ch.scopedId));

    const scopedChapterCount = inSyllabusChapters.length;
    const totalStages = scopedChapterCount * stageKeys.length;

    let doneCount = 0;
    let progressCount = 0;

    inSyllabusChapters.forEach(ch => {
      const key = `${subjectData.id}.${ch.id}`;
      const chProgress = profile.progress ? profile.progress[key] : null;

      if (chProgress) {
        stageKeys.forEach(sk => {
          if (chProgress[sk] === "done") doneCount++;
          else if (chProgress[sk] === "progress") progressCount++;
        });
      }
    });

    const completedStages = doneCount + 0.5 * progressCount;
    const remainingStages = totalStages - completedStages;
    const completionPercentage = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

    const examDateStr = profile.datesheet ? profile.datesheet[subjectData.examKey] : null;
    let daysLeft = null;
    let isPastExam = false;

    if (examDateStr) {
      const examDate = new Date(examDateStr);
      const diffTime = examDate - today;
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        isPastExam = true;
      }
    }

    let requiredPace = 0;
    let statusColor = "grey";
    let statusLabel = "";
    let advice = null;

    if (totalStages === 0) {
      statusColor = "grey";
      statusLabel = "No Chapters";
    } else if (remainingStages === 0) {
      statusColor = "grey";
      statusLabel = "Done";
    } else if (isPastExam) {
      statusColor = "amber";
      statusLabel = "Exam Passed";
    } else if (daysLeft !== null) {
      const validDays = Math.max(daysLeft, 1);
      requiredPace = parseFloat((remainingStages / validDays).toFixed(1));

      if (completionPercentage === 0) {
        statusColor = "grey";
        statusLabel = "Not Started";
      } else if (completionPercentage <= 30) {
        statusColor = "red";
        statusLabel = "Pace Up";
      } else if (completionPercentage <= 60) {
        statusColor = "amber";
        statusLabel = "Building Momentum";
      } else if (completionPercentage <= 90) {
        statusColor = "green";
        statusLabel = "On Track";
      } else {
        statusColor = "blue";
        statusLabel = "Exam Ready";
      }
    } else {
      statusLabel = "No Exam Date";
    }

    return {
      subjectId: subjectData.id,
      subjectName: subjectData.name,
      examKey: subjectData.examKey,
      examDate: examDateStr,
      bookChapterCount: allBookChapters.length,
      scopedChapterCount,
      totalStages,
      completedStages,
      remainingStages,
      completionPercentage,
      daysLeft,
      isPastExam,
      requiredPace,
      statusColor,
      statusLabel,
      advice,
      allBookChapters,
      inSyllabusChapters,
      stageKeys
    };
  }

  /**
   * Gets sorted subject paces ordered by nearest exam date first
   */
  function getOrderedSubjectPaces(profile, subjectsData) {
    const paces = subjectsData.map(sub => calculateSubjectPace(profile, sub));

    return paces.sort((a, b) => {
      if (!a.examDate) return 1;
      if (!b.examDate) return -1;
      if (a.isPastExam && !b.isPastExam) return 1;
      if (!a.isPastExam && b.isPastExam) return -1;
      return (a.daysLeft || 9999) - (b.daysLeft || 9999);
    });
  }

  /**
   * Returns top 3 incomplete stages distributed across active subjects,
   * giving higher weight (backlog focus) to subjects with lower completion percentages.
   */
  function getTodaysFocus(profile, subjectsData) {
    const paces = getOrderedSubjectPaces(profile, subjectsData);
    const activePaces = paces.filter(p => p.remainingStages > 0);
    
    if (activePaces.length === 0) return [];

    const stageKeys = getStageKeys(profile.grade);
    let subjectPendingStages = {};

    activePaces.forEach(pace => {
      let pendingList = [];
      for (const ch of pace.inSyllabusChapters) {
        const key = `${pace.subjectId}.${ch.id}`;
        const chProgress = profile.progress ? profile.progress[key] : null;

        for (const sk of stageKeys) {
          const state = chProgress ? chProgress[sk] || "none" : "none";
          if (state !== "done") {
            pendingList.push({
              subjectId: pace.subjectId,
              subjectName: pace.subjectName,
              groupId: ch.groupId,
              groupName: ch.groupName,
              chapterId: ch.id,
              chapterNo: ch.no,
              chapterName: ch.name,
              stageKey: sk,
              stageLabel: window.getStageLabel(pace.subjectId, sk),
              currentState: state
            });
          }
        }
      }
      subjectPendingStages[pace.subjectId] = {
        pace,
        pendingList,
        urgency: Math.max(1, 100 - pace.completionPercentage) // Higher urgency for lagging subjects
      };
    });

    const totalSlots = 3;
    let totalUrgency = activePaces.reduce((sum, p) => sum + subjectPendingStages[p.subjectId].urgency, 0);

    let allocations = {};
    let allocatedCount = 0;

    activePaces.forEach(pace => {
      const subObj = subjectPendingStages[pace.subjectId];
      if (subObj.pendingList.length === 0) {
        allocations[pace.subjectId] = 0;
        return;
      }
      let rawShare = (subObj.urgency / totalUrgency) * totalSlots;
      let count = Math.round(rawShare);
      
      if (count === 0 && subObj.pendingList.length > 0 && activePaces.length <= totalSlots) {
        count = 1;
      }
      count = Math.min(count, subObj.pendingList.length);
      allocations[pace.subjectId] = count;
      allocatedCount += count;
    });

    // Balance slots if total count differs from 3 due to rounding
    if (allocatedCount < totalSlots) {
      let sortedByUrgency = [...activePaces].sort((a, b) => a.completionPercentage - b.completionPercentage);
      for (let i = 0; i < sortedByUrgency.length && allocatedCount < totalSlots; i++) {
        const pace = sortedByUrgency[i];
        const subObj = subjectPendingStages[pace.subjectId];
        if (allocations[pace.subjectId] < subObj.pendingList.length) {
          allocations[pace.subjectId]++;
          allocatedCount++;
          if (allocatedCount < totalSlots && i === sortedByUrgency.length - 1) i = -1;
        }
      }
    } else if (allocatedCount > totalSlots) {
      let sortedByCompletion = [...activePaces].sort((a, b) => b.completionPercentage - a.completionPercentage);
      for (let i = 0; i < sortedByCompletion.length && allocatedCount > totalSlots; i++) {
        const pace = sortedByCompletion[i];
        if (allocations[pace.subjectId] > 1) {
          allocations[pace.subjectId]--;
          allocatedCount--;
        }
      }
    }

    let focusItems = [];
    activePaces.forEach(pace => {
      const count = allocations[pace.subjectId] || 0;
      const subObj = subjectPendingStages[pace.subjectId];
      for (let i = 0; i < count && i < subObj.pendingList.length; i++) {
        focusItems.push(subObj.pendingList[i]);
      }
    });

    if (focusItems.length === 0) {
      for (const pace of activePaces) {
        for (const item of subjectPendingStages[pace.subjectId].pendingList) {
          focusItems.push(item);
          if (focusItems.length === 3) return focusItems;
        }
      }
    }

    return focusItems.slice(0, 3);
  }

  if (typeof window !== "undefined") {
    window.TrackerPlanner = {
      getStageKeys,
      getStageLabel: window.getStageLabel,
      calculateSubjectPace,
      getOrderedSubjectPaces,
      getTodaysFocus
    };
  }
})();
