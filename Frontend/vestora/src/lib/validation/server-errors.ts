import { ApiError } from "@/lib/api/client";

/**
 * Turns an ASP.NET validation response back into per-field errors.
 *
 * The API already returns exactly what a form needs — `ModelState` is a dictionary of
 * property name to messages — but the client was throwing all of it away: `parseError`
 * picks the *first* message out of the dictionary, uses it as `ApiError.message`, and the
 * pages then showed that single string in a toast. So a registration that failed on both
 * the password and the phone number produced one floating message about the password, and
 * the phone field looked fine.
 *
 * The full body is still on `ApiError.payload`, so nothing new has to be sent. This just
 * reads it.
 *
 * Property names arrive PascalCase (`FirstName`); the map converts them to the form's own
 * field names. Anything unrecognised is returned separately so the caller can still show
 * it rather than silently dropping a real server complaint.
 */
export interface MappedServerErrors<F extends string> {
  fields: Partial<Record<F, string>>;
  /** Messages that belong to no known field — show these at form level. */
  general: string[];
}

export function mapServerErrors<F extends string>(
  err: unknown,
  /** Server property name (case-insensitive) → form field name. */
  map: Record<string, F>
): MappedServerErrors<F> {
  const out: MappedServerErrors<F> = { fields: {}, general: [] };
  if (!(err instanceof ApiError)) return out;

  const payload = err.payload as
    | { errors?: Record<string, string[] | string>; message?: string }
    | undefined;

  const errors = payload?.errors;
  if (!errors) {
    // A plain `{ message }` response — the shape the service layer returns for
    // business-rule failures like a duplicate email.
    if (err.message) out.general.push(err.message);
    return out;
  }

  const lookup = new Map(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));

  for (const [key, value] of Object.entries(errors)) {
    const messages = Array.isArray(value) ? value : [value];
    const first = messages.find((m) => typeof m === "string" && m.trim().length > 0);
    if (!first) continue;

    // ModelState nests as "dto.Password" on some binding paths; the last segment is
    // always the property.
    const prop = key.split(".").pop()!.toLowerCase();
    const field = lookup.get(prop);
    if (field) {
      // Keep the first message per field — later ones repeat the same rule.
      if (!out.fields[field]) out.fields[field] = first;
    } else if (key !== "" && key !== "$") {
      out.general.push(first);
    } else {
      out.general.push(first);
    }
  }

  return out;
}

/**
 * A duplicate email comes back as a business-rule message rather than a ModelState
 * entry, so it needs recognising by content. Worth doing precisely because it is the
 * single most common registration failure, and a floating toast is the wrong place for
 * it — the person needs to see it beside the address they typed.
 */
export function isDuplicateEmail(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const m = err.message.toLowerCase();
  return m.includes("already exists") || m.includes("already registered");
}
