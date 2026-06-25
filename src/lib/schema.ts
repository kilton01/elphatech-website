export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ElphaTech Solutions",
  url: "https://elphatechsolutions.com",
  logo: "https://elphatechsolutions.com/logo.png",
  description:
    "We build enterprise-grade software, cloud infrastructure, and data systems for businesses that need to scale.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Accra",
    addressCountry: "GH",
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@elphatechsolutions.com",
    contactType: "sales",
  },
  sameAs: [],
};

export function serviceSchema(name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: { "@type": "Organization", name: "ElphaTech Solutions" },
  };
}
