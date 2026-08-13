const STORAGE_KEY = "color-lab-v2-evaluations";
const HOVER_STORAGE_KEY = "color-lab-v2-hover-evaluations";

export function loadEvaluationRecords(storage = localStorage) {
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function saveEvaluationRecords(records, storage = localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function loadHoverEvaluationRecords(storage = localStorage) {
  return inspectHoverEvaluationStorage(storage).records;
}

export function inspectHoverEvaluationStorage(storage = localStorage) {
  try {
    const serialized = storage.getItem(HOVER_STORAGE_KEY);
    if (serialized === null)
      return { present: false, unreadable: false, records: {} };
    const records = JSON.parse(serialized);
    if (!records || typeof records !== "object" || Array.isArray(records)) {
      return { present: true, unreadable: true, records: {} };
    }
    return { present: true, unreadable: false, records };
  } catch {
    return { present: true, unreadable: true, records: {} };
  }
}

export function saveHoverEvaluationRecords(records, storage = localStorage) {
  try {
    storage.setItem(HOVER_STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function clearHoverEvaluationRecords(storage = localStorage) {
  try {
    storage.removeItem(HOVER_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
