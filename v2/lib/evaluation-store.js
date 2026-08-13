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
  try {
    const records = JSON.parse(storage.getItem(HOVER_STORAGE_KEY));
    return records && typeof records === "object" && !Array.isArray(records)
      ? records
      : {};
  } catch {
    return {};
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
