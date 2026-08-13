const STORAGE_KEY = "color-lab-v2-evaluations";

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
