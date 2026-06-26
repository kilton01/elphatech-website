import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-[#060f1d] border-t border-brand py-12 px-[4%]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="#">
          <Image src="/logo.png" alt="ElphaTech Solutions" width={60} height={40} className="h-10 w-auto opacity-90" />
        </Link>

        <div className="flex gap-6">
          <Link href="#services" className="text-xs text-slate no-underline hover:text-white transition-colors">
            Services
          </Link>
          <Link href="#work" className="text-xs text-slate no-underline hover:text-white transition-colors">
            Work
          </Link>
          <Link href="#contact" className="text-xs text-slate no-underline hover:text-white transition-colors">
            Contact
          </Link>
          <Link href="/portal" className="text-xs text-slate no-underline hover:text-white transition-colors">
            Client Portal
          </Link>
        </div>

        <div className="text-xs text-slate">
          &copy; 2026 ElphaTech Solutions. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
