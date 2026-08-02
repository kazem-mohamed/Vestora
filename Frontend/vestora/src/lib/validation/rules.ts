/**
 * The rules an account must satisfy, in one place.
 *
 * Every rule here has a counterpart in `Services/AccountRules.cs`. That pairing is the
 * point: before this existed, the frontend asked for six characters and so did the
 * backend, which meant `123456` was a valid Vestora password on a platform where people
 * publish fundraising documents. Neither side was protecting anything — they just
 * agreed with each other about not protecting it.
 *
 * The frontend copy of the rules exists for the feedback, not the enforcement. The
 * server is what decides.
 */

// ---------------------------------------------------------------------------
//  Password
// ---------------------------------------------------------------------------

/**
 * BCrypt silently ignores everything past 72 bytes. A 90-character passphrase would be
 * accepted at signup, truncated on hash, and then "work" — which is fine until someone
 * pastes a slightly different 90-character string and it also works. Better to refuse
 * the input than to quietly keep only part of it.
 */
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_MIN_LENGTH = 10;

/**
 * Passwords that are common enough to be tried first in any credential-stuffing list.
 * A short, honest list beats a long one: this is a last line of defence behind the
 * length and character rules, not a substitute for them.
 */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "password1234",
  "passw0rd123", "qwertyuiop", "qwerty123456", "1234567890", "12345678901",
  "123456789012", "letmein123", "welcome123", "iloveyou123", "admin12345",
  "administrator", "changeme123", "1qaz2wsx3edc", "zaq12wsxcde3", "trustno1234",
  "monkey123456", "dragon123456", "football1234", "baseball1234", "superman123",
  "sunshine1234", "princess1234", "abcd1234567", "aaaaaaaaaa", "1111111111",
  "0000000000", "asdfghjkl123", "vestora123", "vestora1234", "investor123",
  "startup1234", "capital1234",
]);

export interface PasswordCheck {
  /** Stable id — used as the i18n key suffix and the React key. */
  id: "length" | "case" | "digit" | "uncommon";
  met: boolean;
}

/** UTF-8 byte length, since that is what BCrypt actually counts. */
export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * The four requirements shown to the person as they type.
 *
 * Deliberately four, and deliberately these four. Length carries the most real weight,
 * so it leads. The two character rules are cheap to satisfy and rule out whole
 * categories of guessable input. "Not a common password" is the only one that cannot be
 * satisfied by pattern alone, and it is last because it is the one almost nobody trips.
 *
 * Rules that would be noise as live checkboxes — the byte ceiling, resemblance to your
 * own email — are enforced as errors instead, where they belong: they are mistakes, not
 * targets to work towards.
 */
export function passwordChecks(value: string): PasswordCheck[] {
  return [
    { id: "length", met: value.length >= PASSWORD_MIN_LENGTH },
    { id: "case", met: /[a-z]/.test(value) && /[A-Z]/.test(value) },
    { id: "digit", met: /\d/.test(value) },
    {
      id: "uncommon",
      // Only claim this once there is enough to judge, so the row does not sit green
      // on an empty field and then flip to red.
      met: value.length > 0 && !COMMON_PASSWORDS.has(value.toLowerCase()),
    },
  ];
}

export function passwordMeetsAll(value: string): boolean {
  return passwordChecks(value).every((c) => c.met);
}

/**
 * Reasons a password is rejected that are *not* progress-style requirements. Returned
 * as an i18n key so the caller decides the wording.
 */
export function passwordHardError(value: string, email?: string): string | null {
  if (byteLength(value) > PASSWORD_MAX_BYTES) return "valid.pw.tooLong";
  if (value !== value.trim()) return "valid.pw.trimmed";
  const local = email?.split("@")[0]?.trim().toLowerCase();
  // 4 is the shortest local part worth comparing; below that the match is coincidence.
  if (local && local.length >= 4 && value.toLowerCase().includes(local)) {
    return "valid.pw.containsEmail";
  }
  return null;
}

// ---------------------------------------------------------------------------
//  Names
// ---------------------------------------------------------------------------

export const NAME_MIN = 2;
export const NAME_MAX = 50;

/**
 * `[StringLength(50, MinimumLength = 2)]` counted two spaces as a valid surname, so
 * "  " registered an account whose display name was a blank. Length is measured after
 * trimming, and a name has to contain at least one letter in some script — which is
 * why this tests for the absence of digits and punctuation rather than listing the
 * alphabets Vestora accepts. Arabic, accented Latin and hyphenated names all pass.
 */
export function nameError(value: string): string | null {
  const v = value.trim();
  if (v.length < NAME_MIN) return "valid.name.short";
  if (v.length > NAME_MAX) return "valid.name.long";
  if (/\d/.test(v)) return "valid.name.digits";
  if (!/\p{L}/u.test(v)) return "valid.name.letters";
  if (/[<>@#$%^*_={}[\]|\\/~`+]/.test(v)) return "valid.name.symbols";
  return null;
}

// ---------------------------------------------------------------------------
//  Email
// ---------------------------------------------------------------------------

export const EMAIL_MAX = 254;

/** Lowercased and trimmed — the same normalisation the server applies before it looks for duplicates. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function emailError(value: string): string | null {
  const v = normalizeEmail(value);
  if (v.length === 0) return "valid.required";
  if (v.length > EMAIL_MAX) return "valid.email.long";
  // Deliberately not RFC-complete: one @, something either side, a dot in the domain,
  // no whitespace. Stricter regexes reject valid addresses, and the real proof of an
  // address is the verification email.
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v)) return "valid.email";
  return null;
}

// ---------------------------------------------------------------------------
//  Phone
// ---------------------------------------------------------------------------

/**
 * Vestora takes members from anywhere, so no national format is imposed — the rule is
 * only that what is entered could be dialled. `[Phone]` on the server accepted strings
 * like `ext. 4` because it is built for a much looser world than a signup form.
 */
export function phoneError(value: string): string | null {
  const v = value.trim();
  if (v.length === 0) return "valid.required";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7) return "valid.phone.short";
  if (digits.length > 15) return "valid.phone.long"; // E.164 ceiling
  if (!/^\+?[\d\s()./-]+$/.test(v)) return "valid.phone.chars";
  return null;
}

// ---------------------------------------------------------------------------
//  Birth date
// ---------------------------------------------------------------------------

export const MIN_AGE = 18;
export const MAX_AGE = 100;

/**
 * The field had no bounds whatsoever: a birth year of 3000 registered an account, and
 * so did 1850. Both ends are now closed, and the lower bound is a real one — Vestora
 * involves people stating financial intentions, which is not a thing to invite a
 * fifteen-year-old into.
 */
export function birthDateError(value: string): string | null {
  if (!value) return "valid.required";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "valid.date.invalid";

  const today = new Date();
  if (d > today) return "valid.date.future";

  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;

  if (age < MIN_AGE) return "valid.date.tooYoung";
  if (age > MAX_AGE) return "valid.date.tooOld";
  return null;
}

// ---------------------------------------------------------------------------
//  Bio
// ---------------------------------------------------------------------------

export const BIO_MAX = 250;

export function bioError(value: string): string | null {
  if (value.trim().length > BIO_MAX) return "valid.bio.long";
  return null;
}
