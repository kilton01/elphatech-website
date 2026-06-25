import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PortalNav from '@/components/portal/portal-nav';
import PortalHeader from '@/components/portal/portal-header';
import SessionProvider from '@/components/portal/session-provider';
import { Toaster } from 'sonner';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <SessionProvider session={session}>
      <div className="dark flex min-h-screen bg-navy">
        <PortalNav />
        <div className="flex flex-1 flex-col ml-0 md:ml-60">
          <PortalHeader />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
        <Toaster theme="dark" position="bottom-right" richColors />
      </div>
    </SessionProvider>
  );
}
