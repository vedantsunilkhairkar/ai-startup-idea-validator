const INTENT_KEY = "antigravity.run_validation_intent";
const INTENT_TTL_MS = 5 * 60 * 1000;

export function markValidationIntent() {
  sessionStorage.setItem(INTENT_KEY, String(Date.now()));
}

export function hasPendingValidationIntent() {
  const value = sessionStorage.getItem(INTENT_KEY);
  if (!value) return false;

  const timestamp = Number(value);
  const age = Date.now() - timestamp;
  if (!Number.isFinite(timestamp) || age < 0 || age > INTENT_TTL_MS) {
    sessionStorage.removeItem(INTENT_KEY);
    return false;
  }
  return true;
}

export function consumeValidationIntent() {
  const isPending = hasPendingValidationIntent();
  sessionStorage.removeItem(INTENT_KEY);
  return isPending;
}
