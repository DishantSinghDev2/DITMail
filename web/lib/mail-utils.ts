// lib/mail-utils.ts

/**
 * Parses a participant string like "John Doe <john.doe@example.com>"
 * into its name and email parts.
 * @param participant - The string to parse.
 * @returns An object with name and email.
 */
export const parseParticipant = (participant: string): { name: string | null; email: string } => {
  const match = participant.match(/(.*)<(.*)>/);
  if (match) {
    const name = match[1].trim().replace(/"/g, '');
    const email = match[2].trim();
    return { name: name || null, email };
  }
  return { name: null, email: participant.trim() };
};


/**
 * Formats a participant's display name, showing "me" for the current user.
 * @param participant - The participant string (e.g., "Jane <jane@mail.com>").
 * @param currentUserEmail - The email address of the current user.
 * @returns The formatted display name (e.g., "Jane", "me", "jane@mail.com").
 */
export const formatDisplayName = (participant: string, currentUserEmail?: string): string => {
  const { name, email } = parseParticipant(participant);

  if (currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase()) {
    return "me";
  }

  return name || email;
};