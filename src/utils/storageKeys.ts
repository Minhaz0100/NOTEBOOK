// Scoped Local Storage Key Management for Account Data Isolation
export const getUserStorageKey = (uid: string) => `daybook_user_state_${uid}`;
export const GUEST_STORAGE_KEY = 'daybook_guest_state_v1';
export const LEGACY_STORAGE_KEY = 'daybook_local_state_v1';
export const ENTERED_STORAGE_KEY = 'daybook_entered_desk_v1';
