/**
 * PIN Utilities — Family Quest
 *
 * Uses the Web Crypto API (built-in in all modern browsers).
 * No external dependencies needed.
 *
 * Salt: combines a fixed app salt with the user's invite_token
 * so that even two users with the same PIN have different hashes.
 */

const APP_SALT = 'familyquest_v1_';

/**
 * Hashes a 4-digit PIN using SHA-256.
 * @param pin - The 4-digit PIN string (e.g. "1234")
 * @param inviteToken - The user's unique invite token (used as per-user salt)
 */
export async function hashPin(pin: string, inviteToken: string): Promise<string> {
    const rawInput = `${APP_SALT}${inviteToken}_${pin}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a PIN against a stored hash.
 * @param pin - The entered PIN
 * @param inviteToken - The user's invite token (same one used when setting PIN)
 * @param storedHash - The hash from the database
 */
export async function verifyPin(pin: string, inviteToken: string, storedHash: string): Promise<boolean> {
    const candidateHash = await hashPin(pin, inviteToken);
    return candidateHash === storedHash;
}

/**
 * Derives the internal Supabase Auth password for a hero.
 * Never shown to the user — used for server auth only.
 * @param pin - The hero's PIN
 * @param inviteToken - The hero's unique token
 */
export function deriveHeroPassword(pin: string, inviteToken: string): string {
    // Minimum 8 chars. Combines PIN + part of invite_token.
    return `${pin}_fq_${inviteToken.replace(/-/g, '').slice(0, 12)}`;
}

/**
 * Derives the internal Supabase Auth email for a hero.
 * Not a real email — never sent anywhere.
 * @param profileId - The hero's profile ID (UUID)
 */
export function deriveHeroEmail(profileId: string): string {
    return `hero_${profileId.replace(/-/g, '')}@noreply.familyquest.app`;
}

/**
 * Derives the Supabase Auth password for a hero.
 * Based ONLY on invite_token — does NOT change when PIN changes.
 * This allows persistent signin independent of PIN resets.
 */
export function heroAuthPassword(inviteToken: string): string {
    return `fq_hero_${inviteToken.replace(/-/g, '').slice(0, 20)}`;
}
