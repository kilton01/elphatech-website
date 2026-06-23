import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PortalNav from '@/components/portal/portal-nav';
import PortalHeader from '@/components/portal/portal-header';
import SessionProvider from '@/components/portal/session-provider';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-navy">
        <PortalNav />
        <div className="ml-60 flex flex-1 flex-col">
          <PortalHeader />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
