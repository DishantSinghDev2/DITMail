// /app/mail/page.tsx
import { redirect } from 'next/navigation';

/**
 * This page now acts as a simple entry point to the mail application.
 * It immediately redirects the user to their inbox, which is the default view.
 * All authentication and onboarding checks are handled by the server-side layout.
 */
export default function MailPage() {
  redirect('/mail/inbox');
}