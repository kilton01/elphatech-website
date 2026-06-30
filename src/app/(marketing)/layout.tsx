import type { Metadata } from 'next';
import { Sora, Inter } from 'next/font/google';
import { organizationSchema } from '@/lib/schema';
import { Toaster } from 'sonner';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'ElphaTech Solutions – Software. Cloud. Results.',
    template: '%s | ElphaTech Solutions',
  },
  description:
    'We build enterprise-grade software, cloud infrastructure, and data systems for businesses that need to scale. Based in Accra, Ghana.',
  openGraph: {
    title: 'ElphaTech Solutions – Software. Cloud. Results.',
    description:
      'We build enterprise-grade software, cloud infrastructure, and data systems for businesses that need to scale.',
    url: 'https://elphatechsolutions.com',
    siteName: 'ElphaTech Solutions',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ElphaTech Solutions',
    description:
      'We build enterprise-grade software, cloud infrastructure, and data systems.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${sora.variable} ${inter.variable} bg-navy text-white`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      {children}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
