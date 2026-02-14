export function getScopedStorageKey(baseKey: string, userId: string): string {
  return `${baseKey}_${userId}`;
}

export function getScopedStorageItem(
  baseKey: string,
  userId: string
): string | null {
  const scopedKey = getScopedStorageKey(baseKey, userId);
  const scopedValue = localStorage.getItem(scopedKey);
  if (scopedValue !== null) {
    return scopedValue;
  }

  // Legacy migration path: if old key exists, migrate it once.
  const legacyValue = localStorage.getItem(baseKey);
  if (legacyValue === null) {
    return null;
  }

  localStorage.setItem(scopedKey, legacyValue);
  localStorage.removeItem(baseKey);
  return legacyValue;
}

export function setScopedStorageItem(
  baseKey: string,
  userId: string,
  value: string
): void {
  localStorage.setItem(getScopedStorageKey(baseKey, userId), value);
}

export function removeScopedStorageItem(baseKey: string, userId: string): void {
  localStorage.removeItem(getScopedStorageKey(baseKey, userId));
}
