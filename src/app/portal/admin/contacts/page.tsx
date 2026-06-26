import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import ContactsView from '@/components/portal/contacts-view';

export default async function AdminContactsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/portal');

  return <ContactsView />;
}
