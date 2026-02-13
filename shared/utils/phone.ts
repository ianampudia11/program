/**
 * Normalize phone number to +E.164 format
 * @param phone The phone number to normalize
 * @returns Normalized phone number in +E.164 format
 */
export function normalizePhoneToE164(phone: string): string {
    if (!phone) return phone;

    let normalized = phone.replace(/[^\d+]/g, '');

    if (normalized.startsWith('+')) {
        return normalized;
    }

    return '+' + normalized;
}

/**
 * Normalize phone number for internal storage (usually same as E.164 or without +)
 * @param phone The phone number to normalize
 * @returns Normalized phone number
 */
export function normalizePhoneForInternal(phone: string): string {
    if (!phone) return phone;
    // If internal format prefers no plus, remove it. 
    // But usually E.164 is standard. Let's make it consistent with E.164 for now
    // unless we find evidence otherwise.
    return normalizePhoneToE164(phone);
}

/**
 * Validates if the phone number is valid
 * @param phone The phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
    // Basic validation: at least 10 digits
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
}
