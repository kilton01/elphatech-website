'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { href: '#services', label: 'Services' },
  { href: '#work', label: 'Work' },
  { href: '#process', label: 'Process' },
  { href: '#about-founder', label: 'About' },
];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[4%] py-4 bg-navy/85 backdrop-blur-md border-b border-brand">
      <Link href="#">
        <Image src="/logo.png" alt="ElphaTech Solutions" width={72} height={48} className="h-12 w-auto" />
      </Link>

      <ul className="hidden md:flex items-center gap-8 list-none">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="font-[var(--font-sora)] text-sm font-medium text-slate hover:text-white transition-colors no-underline tracking-wide"
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="#contact"
            className="bg-red text-white px-5 py-2 rounded text-sm font-[var(--font-sora)] font-semibold no-underline tracking-wide hover:bg-red2 transition-colors"
          >
            Start a Project
          </Link>
        </li>
      </ul>

      <button
        className="md:hidden text-white p-1"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-navy/95 backdrop-blur-md border-b border-brand md:hidden">
          <ul className="flex flex-col items-center gap-4 py-6 list-none">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-[var(--font-sora)] text-sm font-medium text-slate hover:text-white transition-colors no-underline tracking-wide"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="#contact"
                onClick={() => setMobileOpen(false)}
                className="bg-red text-white px-5 py-2 rounded text-sm font-[var(--font-sora)] font-semibold no-underline tracking-wide hover:bg-red2 transition-colors"
              >
                Start a Project
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
