export type StaffLogin = { email: string; displayName?: string };

export function availableStaffLogins(
  logins: StaffLogin[],
  staff: { email?: string }[],
  personalLinks: Record<string, string>,
): StaffLogin[] {
  const normalize = (email: string) => email.trim().toLowerCase();
  const linked = new Set([
    ...staff.map(person => normalize(person.email || '')),
    ...Object.keys(personalLinks).filter(email => !!personalLinks[email]).map(normalize),
  ]);
  const seen = new Set<string>();
  return logins.flatMap(login => {
    const email = normalize(login.email);
    if (!email || linked.has(email) || seen.has(email)) return [];
    seen.add(email);
    return [{ email, displayName: login.displayName?.trim() || '' }];
  }).sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
}

export function staffDetailsFromLogin(login: StaffLogin) {
  const parts = (login.displayName || '').trim().split(/\s+/).filter(Boolean);
  // Display names have no structured surname. Suggest a split for review;
  // never invent a surname when the login has only one name.
  const lastName = parts.length > 1 ? parts.pop()! : '';
  const firstName = parts.join(' ');
  return { firstName, lastName, name: [firstName, lastName].filter(Boolean).join(' '), email: login.email.trim().toLowerCase() };
}
