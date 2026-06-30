'use client';
import { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    service: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send message');
      }
      toast.success('Message sent! We\'ll get back to you within 24 hours.');
      setFormData({ name: '', company: '', email: '', service: '', message: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 px-[4%] bg-navy2">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-[var(--font-sora)] text-xs font-semibold tracking-widest text-red uppercase mb-2">
            Get In Touch
          </p>
          <h2 className="font-[var(--font-sora)] text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-white">
            Let&apos;s Build Something Together
          </h2>
          <p className="text-slate mt-3 max-w-[520px] mx-auto">
            Tell me about your project and I&apos;ll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-16 max-w-[1000px] mx-auto items-start">
          <div>
            <h3 className="font-[var(--font-sora)] text-[1.4rem] font-bold text-white mb-4">
              Ready to talk?
            </h3>
            <p className="text-slate mb-8 leading-relaxed">
              Whether you&apos;re starting from scratch or need help with an existing system, I&apos;d love to hear about your challenge.
            </p>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-red/12 flex items-center justify-center text-base shrink-0 mt-0.5 text-red">
                <Mail size={18} />
              </div>
              <div>
                <strong className="block font-[var(--font-sora)] text-sm text-white mb-0.5">Email Us</strong>
                <span className="text-slate text-sm">info@elphatechsolutions.com</span>
              </div>
            </div>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-red/12 flex items-center justify-center text-base shrink-0 mt-0.5 text-red">
                <Phone size={18} />
              </div>
              <div>
                <strong className="block font-[var(--font-sora)] text-sm text-white mb-0.5">WhatsApp / Call</strong>
                <span className="text-slate text-sm">+233 557 384 213 /+233 558 352 396</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-red/12 flex items-center justify-center text-base shrink-0 mt-0.5 text-red">
                <MapPin size={18} />
              </div>
              <div>
                <strong className="block font-[var(--font-sora)] text-sm text-white mb-0.5">Location</strong>
                <span className="text-slate text-sm">Accra, Ghana &nbsp;·&nbsp; Remote-first</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                required
                value={formData.name}
                onChange={handleChange}
                className="bg-white/[0.05] border border-brand rounded px-4 py-3 text-white text-sm font-[var(--font-inter)] outline-none focus:border-red transition-colors placeholder:text-slate"
              />
              <input
                type="text"
                name="company"
                placeholder="Company Name"
                value={formData.company}
                onChange={handleChange}
                className="bg-white/[0.05] border border-brand rounded px-4 py-3 text-white text-sm font-[var(--font-inter)] outline-none focus:border-red transition-colors placeholder:text-slate"
              />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              required
              value={formData.email}
              onChange={handleChange}
              className="bg-white/[0.05] border border-brand rounded px-4 py-3 text-white text-sm font-[var(--font-inter)] outline-none focus:border-red transition-colors placeholder:text-slate"
            />
            <select
              name="service"
              aria-label="Service Needed"
              value={formData.service}
              onChange={handleChange}
              className="bg-white/[0.05] border border-brand rounded px-4 py-3 text-white text-sm font-[var(--font-inter)] outline-none focus:border-red transition-colors"
            >
              <option value="" disabled className="bg-navy2">Service Needed</option>
              <option value="Software Development" className="bg-navy2">Software Development</option>
              <option value="Cloud Consultation" className="bg-navy2">Cloud Consultation</option>
              <option value="Cloud Cost Optimization" className="bg-navy2">Cloud Cost Optimization</option>
              <option value="Application Deployment" className="bg-navy2">Application Deployment</option>
              <option value="Data Scraping / Extraction" className="bg-navy2">Data Scraping / Extraction</option>
              <option value="Application Consultation" className="bg-navy2">Application Consultation</option>
              <option value="Other / Not Sure Yet" className="bg-navy2">Other / Not Sure Yet</option>
            </select>
            <textarea
              name="message"
              placeholder="Tell us about your project — what are you trying to build or solve?"
              required
              rows={5}
              value={formData.message}
              onChange={handleChange}
              className="bg-white/[0.05] border border-brand rounded px-4 py-3 text-white text-sm font-[var(--font-inter)] outline-none focus:border-red transition-colors placeholder:text-slate resize-vertical min-h-[130px]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-red text-white border-none rounded px-8 py-[0.9rem] cursor-pointer font-[var(--font-sora)] font-semibold text-sm tracking-wide self-start hover:bg-red2 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:-translate-y-0"
            >
              {submitting ? 'Sending...' : 'Send Message \u2192'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
