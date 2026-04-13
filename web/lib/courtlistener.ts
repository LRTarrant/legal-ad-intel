/**
 * CourtListener REST API v4 utility
 * https://www.courtlistener.com/api/rest/v4/
 */

const CL_BASE = "https://www.courtlistener.com/api/rest/v4";

export interface ClAttorneyRecord {
  attorney_name: string;
  firm_name: string | null;
  email: string | null;
  phone: string | null;
  role: string; // "Plaintiff" | "Defendant" | "Third Party" etc.
  party_name: string | null;
  cl_attorney_id: number | null;
}

export interface CourtListenerSourceRef {
  docketId: number | null;
  docketNumber: string | null;
  court: string | null;
}

export interface FetchDocketAttorneysResult {
  attorneys: ClAttorneyRecord[];
  partial: boolean;
  pagesFetched: number;
  hadError: boolean;
}

// ---------------------------------------------------------------------------
// Stub data for 3 well-known MDLs (used when no API token is available)
// ---------------------------------------------------------------------------

const STUB_ATTORNEYS: Record<number, ClAttorneyRecord[]> = {
  // MDL 2738 – Johnson & Johnson Talcum Powder
  2738: [
    { attorney_name: "R. Allen Smith Jr.", firm_name: "Beasley Allen Crow Methvin Portis & Miles", email: "allen.smith@beasleyallen.com", phone: "(334) 269-2343", role: "Plaintiff", party_name: "Lisa Herrera", cl_attorney_id: 101001 },
    { attorney_name: "Mark P. Robinson Jr.", firm_name: "Robinson Calcagnie Inc.", email: "mrobinson@robinsonfirm.com", phone: "(949) 720-1288", role: "Plaintiff", party_name: "Lisa Herrera", cl_attorney_id: 101002 },
    { attorney_name: "Leigh O'Dell", firm_name: "Beasley Allen Crow Methvin Portis & Miles", email: "leigh.odell@beasleyallen.com", phone: "(334) 269-2343", role: "Plaintiff", party_name: "Patricia Schmitz", cl_attorney_id: 101003 },
    { attorney_name: "Chris Seeger", firm_name: "Seeger Weiss LLP", email: "cseeger@seegerweiss.com", phone: "(212) 584-0700", role: "Plaintiff", party_name: "Joan Knudsen", cl_attorney_id: 101004 },
    { attorney_name: "Andy Birchfield", firm_name: "Beasley Allen Crow Methvin Portis & Miles", email: "andy.birchfield@beasleyallen.com", phone: "(334) 269-2343", role: "Plaintiff", party_name: "Multiple Plaintiffs", cl_attorney_id: 101005 },
    { attorney_name: "Ted Meadows", firm_name: "Beasley Allen Crow Methvin Portis & Miles", email: "ted.meadows@beasleyallen.com", phone: "(334) 269-2343", role: "Plaintiff", party_name: "Multiple Plaintiffs", cl_attorney_id: 101006 },
    { attorney_name: "Michelle A. Parfitt", firm_name: "Ashcraft & Gerel LLP", email: "mparfitt@ashcraftlaw.com", phone: "(202) 783-6400", role: "Plaintiff", party_name: "Teresa Leavitt", cl_attorney_id: 101007 },
    { attorney_name: "John Gomez", firm_name: "Gomez Trial Attorneys", email: "john@gomeztrial.com", phone: "(619) 237-3490", role: "Plaintiff", party_name: "Multiple Plaintiffs", cl_attorney_id: 101008 },
    { attorney_name: "Michael F. Brock", firm_name: "King & Spalding LLP", email: "mbrock@kslaw.com", phone: "(212) 556-2100", role: "Defendant", party_name: "Johnson & Johnson", cl_attorney_id: 102001 },
    { attorney_name: "Susan M. Sharko", firm_name: "Drinker Biddle & Reath LLP", email: "susan.sharko@dbr.com", phone: "(973) 549-7000", role: "Defendant", party_name: "Johnson & Johnson", cl_attorney_id: 102002 },
    { attorney_name: "John H. Beisner", firm_name: "Skadden Arps Slate Meagher & Flom LLP", email: "john.beisner@skadden.com", phone: "(202) 371-7000", role: "Defendant", party_name: "Johnson & Johnson Consumer Inc.", cl_attorney_id: 102003 },
    { attorney_name: "Amanda P. Reeves", firm_name: "Skadden Arps Slate Meagher & Flom LLP", email: "amanda.reeves@skadden.com", phone: "(202) 371-7000", role: "Defendant", party_name: "Johnson & Johnson Consumer Inc.", cl_attorney_id: 102004 },
  ],

  // MDL 2741 – Roundup Products Liability
  2741: [
    { attorney_name: "Robin L. Greenwald", firm_name: "Weitz & Luxenberg PC", email: "rgreenwald@weitzlux.com", phone: "(212) 558-5500", role: "Plaintiff", party_name: "Dewayne Johnson", cl_attorney_id: 201001 },
    { attorney_name: "Aimee H. Wagstaff", firm_name: "Andrus Wagstaff PC", email: "aimee@andruswagstaff.com", phone: "(303) 376-6360", role: "Plaintiff", party_name: "Multiple Plaintiffs", cl_attorney_id: 201002 },
    { attorney_name: "David J. Dickens", firm_name: "The Miller Firm LLC", email: "david@millerfirmllc.com", phone: "(540) 989-0000", role: "Plaintiff", party_name: "Multiple Plaintiffs", cl_attorney_id: 201003 },
    { attorney_name: "Samuel Issacharoff", firm_name: "NYU School of Law", email: "si13@nyu.edu", phone: null, role: "Plaintiff", party_name: "Plaintiffs Steering Committee", cl_attorney_id: 201004 },
    { attorney_name: "William G. Laxton Sr.", firm_name: "Laxton & Sipe LLC", email: "wlaxton@laxtonsipe.com", phone: "(304) 344-3424", role: "Plaintiff", party_name: "Multiple Plaintiffs", cl_attorney_id: 201005 },
    { attorney_name: "Joe Hollingsworth", firm_name: "Hollingsworth LLP", email: "jhollingsworth@hollingsworthllp.com", phone: "(202) 898-5800", role: "Defendant", party_name: "Monsanto Company", cl_attorney_id: 202001 },
    { attorney_name: "Eric G. Lasker", firm_name: "Hollingsworth LLP", email: "elasker@hollingsworthllp.com", phone: "(202) 898-5800", role: "Defendant", party_name: "Monsanto Company", cl_attorney_id: 202002 },
  ],

  // MDL 2873 – AFFF Firefighting Foam
  2873: [
    { attorney_name: "Paul J. Napoli", firm_name: "Napoli Shkolnik PLLC", email: "pnapoli@napolishkolnik.com", phone: "(212) 397-1000", role: "Plaintiff", party_name: "City of Stuart", cl_attorney_id: 301001 },
    { attorney_name: "Scott Summy", firm_name: "Baron & Budd PC", email: "ssummy@baronbudd.com", phone: "(214) 521-3605", role: "Plaintiff", party_name: "Multiple Plaintiffs", cl_attorney_id: 301002 },
    { attorney_name: "Joseph F. Rice", firm_name: "Motley Rice LLC", email: "jrice@motleyrice.com", phone: "(843) 216-9000", role: "Plaintiff", party_name: "Multiple Plaintiffs", cl_attorney_id: 301003 },
    { attorney_name: "Douglas G. Herrema", firm_name: "SidleyAustin LLP", email: "dherrema@sidley.com", phone: "(312) 853-7000", role: "Defendant", party_name: "3M Company", cl_attorney_id: 302001 },
    { attorney_name: "Kannon K. Shanmugam", firm_name: "Paul Weiss Rifkind Wharton & Garrison LLP", email: "kshanmugam@paulweiss.com", phone: "(202) 223-7300", role: "Defendant", party_name: "The Chemours Company", cl_attorney_id: 302002 },
    { attorney_name: "William A. Brewer III", firm_name: "Brewer Attorneys & Counselors", email: "wbrewer@brewerattorneys.com", phone: "(214) 653-4000", role: "Defendant", party_name: "DuPont de Nemours Inc.", cl_attorney_id: 302003 },
  ],
};

// ---------------------------------------------------------------------------
// Extract docket ID from a CourtListener URL
// ---------------------------------------------------------------------------

function parseSourceRef(sourceUrl: string): CourtListenerSourceRef {
  try {
    const url = new URL(sourceUrl);

    // Direct docket URL shape:
    //   https://www.courtlistener.com/docket/6245245/in-re-.../
    const directMatch = url.pathname.match(/\/docket\/(\d+)(?:\/|$)/);
    if (directMatch) {
      return {
        docketId: parseInt(directMatch[1], 10),
        docketNumber: null,
        court: null,
      };
    }

    // Search URL shape:
    //   https://www.courtlistener.com/?type=r&docket_number=2:16-md-02738&court=njd
    const docketNumber = url.searchParams.get("docket_number");
    const court = url.searchParams.get("court");
    if (docketNumber && court) {
      return {
        docketId: null,
        docketNumber,
        court,
      };
    }
  } catch {
    // no-op
  }

  return { docketId: null, docketNumber: null, court: null };
}

export function extractDocketId(sourceUrl: string): number | null {
  return parseSourceRef(sourceUrl).docketId;
}

// ---------------------------------------------------------------------------
// Fetch attorneys from CourtListener API (or stubs)
// ---------------------------------------------------------------------------

/**
 * Fetch all parties/attorneys for a given CourtListener docket ID.
 *
 * TODO: When COURTLISTENER_API_TOKEN is set, this should call
 *   GET {CL_BASE}/dockets/{docketId}/parties/
 *   with Authorization: Token <token> header, paginate through results,
 *   and normalise each attorney entry into ClAttorneyRecord[].
 *
 * Until then we return stub data for known MDL docket IDs.
 */
export async function fetchDocketAttorneys(
  docketId: number,
  mdlNumber?: number
): Promise<FetchDocketAttorneysResult> {
  const token = process.env.COURTLISTENER_API_TOKEN;

  if (token) {
    // TODO: Implement live API call when token is available
    // The endpoint is GET {CL_BASE}/dockets/{docketId}/parties/
    // Response shape: { results: [{ attorneys: [...], name, type }] }
    // Each attorney has: { name, contact, roles: [{ role, party }] }
    return fetchLiveAttorneys(docketId, token);
  }

  // Fall back to stub data keyed by MDL number
  if (mdlNumber && STUB_ATTORNEYS[mdlNumber]) {
    return {
      attorneys: STUB_ATTORNEYS[mdlNumber],
      partial: false,
      pagesFetched: 0,
      hadError: false,
    };
  }

  return {
    attorneys: [],
    partial: false,
    pagesFetched: 0,
    hadError: false,
  };
}

export async function resolveDocketIdFromSourceUrl(
  sourceUrl: string
): Promise<number | null> {
  const sourceRef = parseSourceRef(sourceUrl);
  if (sourceRef.docketId) {
    return sourceRef.docketId;
  }

  if (!sourceRef.docketNumber || !sourceRef.court) {
    return null;
  }

  const token = process.env.COURTLISTENER_API_TOKEN;
  if (!token) {
    return null;
  }

  const url = new URL(`${CL_BASE}/dockets/`);
  url.searchParams.set("format", "json");
  url.searchParams.set("docket_number", sourceRef.docketNumber);
  url.searchParams.set("court", sourceRef.court);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    console.error(
      `CourtListener docket lookup failed: ${res.status} ${res.statusText} for ${url}`
    );
    return null;
  }

  const json = await res.json();
  const docket = json.results?.[0];
  return typeof docket?.id === "number" ? docket.id : null;
}

// ---------------------------------------------------------------------------
// Live API implementation (requires token)
// ---------------------------------------------------------------------------

async function fetchLiveAttorneys(
  docketId: number,
  token: string
): Promise<FetchDocketAttorneysResult> {
  const records: ClAttorneyRecord[] = [];
  let url: string | null = `${CL_BASE}/parties/?docket=${docketId}&format=json`;
  let pagesFetched = 0;

  while (url) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
          Accept: "application/json",
        },
      });
    } catch (error) {
      console.warn(
        `CourtListener parties fetch failed after ${pagesFetched} pages for docket ${docketId}; returning partial results (${records.length} attorneys).`,
        error
      );
      return {
        attorneys: records,
        partial: true,
        pagesFetched,
        hadError: true,
      };
    }

    if (!res.ok) {
      console.warn(
        `CourtListener API error after ${pagesFetched} pages: ${res.status} ${res.statusText} for ${url}; returning partial results (${records.length} attorneys).`
      );
      return {
        attorneys: records,
        partial: true,
        pagesFetched,
        hadError: true,
      };
    }

    const json = await res.json();
    pagesFetched += 1;

    // Each result is a party with nested attorneys.
    for (const party of json.results ?? []) {
      const partyName: string = party.name ?? "Unknown";
      const partyType: string = party.party_type?.name ?? party.type ?? "";
      const role = normaliseRole(partyType);

      for (const att of party.attorneys ?? []) {
        const attorneyRole = Array.isArray(att.roles)
          ? normaliseRole(
              att.roles
                .map((r: { role?: string }) => r.role ?? "")
                .filter(Boolean)
                .join(", ")
            )
          : role;

        records.push({
          attorney_name: att.name ?? "Unknown",
          firm_name:
            att.firm_name ??
            att.organization ??
            parseContactField(att.contact, "firm") ??
            null,
          email: att.email ?? parseContactField(att.contact, "email") ?? null,
          phone: att.phone ?? parseContactField(att.contact, "phone") ?? null,
          role: attorneyRole,
          party_name: partyName,
          cl_attorney_id: att.id ?? null,
        });
      }
    }

    url = json.next ?? null;
  }

  return {
    attorneys: records,
    partial: false,
    pagesFetched,
    hadError: false,
  };
}

/**
 * Normalise CourtListener party_type into a standard role label.
 */
function normaliseRole(partyType: string): string {
  const lower = partyType.toLowerCase();
  if (lower.includes("plaintiff") || lower.includes("petitioner") || lower.includes("claimant")) {
    return "Plaintiff";
  }
  if (lower.includes("defendant") || lower.includes("respondent")) {
    return "Defendant";
  }
  if (lower.includes("third party")) {
    return "Third Party";
  }
  if (lower.includes("amicus")) {
    return "Amicus";
  }
  return partyType || "Unknown";
}

/**
 * Parse simple contact info from CourtListener's contact raw text block.
 * CourtListener stores attorney contact as a plain-text block like:
 *   "Firm Name\n123 Main St\nCity, ST 12345\n(555) 123-4567\nemail@example.com"
 */
function parseContactField(
  contact: string | null | undefined,
  field: "firm" | "email" | "phone"
): string | null {
  if (!contact) return null;

  const lines = contact.split("\n").map((l) => l.trim()).filter(Boolean);

  if (field === "email") {
    const emailLine = lines.find((l) => l.includes("@") && !l.includes("http"));
    return emailLine ?? null;
  }

  if (field === "phone") {
    const phoneLine = lines.find((l) => /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(l));
    return phoneLine ?? null;
  }

  // firm — first non-empty line is typically the firm name
  return lines[0] ?? null;
}
