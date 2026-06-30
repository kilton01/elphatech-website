import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import MarketingView from '@/components/portal/marketing-view';

export default async function AdminMarketingPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/portal');

  return <MarketingView />;
}
