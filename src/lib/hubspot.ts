const HUBSPOT_API = 'https://api.hubapi.com';

// Internal id of the first stage ("Prospecting" / "New lead") in this account's default Sales Pipeline.
// Renaming a stage in HubSpot doesn't change its id. Override with HUBSPOT_DEAL_STAGE if the pipeline changes.
const DEAL_PIPELINE = process.env.HUBSPOT_DEAL_PIPELINE || 'default';
const DEAL_STAGE = process.env.HUBSPOT_DEAL_STAGE || '6178392294';
// HubSpot-defined association type: deal -> contact
const DEAL_TO_CONTACT = 3;

type Lead = {
  name: string;
  email: string;
  company?: string | null;
  service?: string | null;
  message: string;
};

async function hubspot<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`HubSpot ${path} failed (${res.status}): ${err.message ?? res.statusText}`);
  }
  return res.json();
}

// Creates/updates the contact (matched on email) and opens a deal in the first pipeline stage.
export async function syncLeadToHubspot(lead: Lead): Promise<{ contactId: string; dealId: string }> {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    throw new Error('HUBSPOT_ACCESS_TOKEN is not configured');
  }

  const [firstname, ...rest] = lead.name.trim().split(/\s+/);
  const upsert = await hubspot<{ results: { id: string }[] }>('/crm/v3/objects/contacts/batch/upsert', {
    inputs: [
      {
        idProperty: 'email',
        id: lead.email.toLowerCase(),
        properties: {
          email: lead.email.toLowerCase(),
          firstname,
          lastname: rest.join(' '),
          ...(lead.company ? { company: lead.company } : {}),
          message: lead.message.slice(0, 5000),
        },
      },
    ],
  });
  const contactId = upsert.results[0].id;

  const label = lead.company || lead.name;
  const deal = await hubspot<{ id: string }>('/crm/v3/objects/deals', {
    properties: {
      dealname: `${label}${lead.service ? ` — ${lead.service}` : ''} (website enquiry)`,
      pipeline: DEAL_PIPELINE,
      dealstage: DEAL_STAGE,
    },
    associations: [
      {
        to: { id: contactId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: DEAL_TO_CONTACT }],
      },
    ],
  });

  return { contactId, dealId: deal.id };
}
