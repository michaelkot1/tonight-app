import {
  Contact,
  ContactField,
  PermissionStatus,
  requestPermissionsAsync,
  type ContactsPermissionResponse,
} from 'expo-contacts';

/**
 * Request contacts permission and return unique emails from the address book.
 * Does not upload anything — caller decides whether to send emails to match-contacts.
 */
export async function loadContactEmails(): Promise<{
  status: ContactsPermissionResponse['status'];
  emails: string[];
}> {
  const permission = await requestPermissionsAsync();
  if (permission.status !== PermissionStatus.GRANTED) {
    return { status: permission.status, emails: [] };
  }

  const details = await Contact.getAllDetails([ContactField.EMAILS]);

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const contact of details) {
    for (const entry of contact.emails ?? []) {
      const email = entry.address?.trim().toLowerCase();
      if (!email || !email.includes('@') || seen.has(email)) continue;
      seen.add(email);
      emails.push(email);
    }
  }

  return { status: permission.status, emails };
}
