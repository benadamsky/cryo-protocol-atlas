import { CryoChemicalSchema, CryoPaperSchema, type CryoChemical, type CryoPaper } from "../../shared/src/schema.js";

const CRYODB_BASE_URL = "https://cryodb.replit.app";

type PapersResponse = {
  papers: unknown[];
  total?: number;
  page?: number;
  limit?: number;
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CRYODB_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw new Error(`CryoRepository request failed: ${response.status} ${response.statusText} (${path})`);
  }

  return (await response.json()) as T;
}

export async function listPapers(page: number, limit: number): Promise<{ papers: CryoPaper[]; total: number }> {
  const data = await fetchJson<PapersResponse>(`/api/papers?page=${page}&limit=${limit}`);
  const papers = (data.papers ?? []).map((paper) => CryoPaperSchema.parse(paper));

  return {
    papers,
    total: data.total ?? papers.length
  };
}

export async function searchChemicals(query: string): Promise<CryoChemical[]> {
  const encoded = encodeURIComponent(query);
  const data = await fetchJson<unknown[]>(`/api/chemicals?q=${encoded}`);
  return data.map((chemical) => CryoChemicalSchema.parse(chemical));
}

export async function listAvailableProperties(): Promise<string[]> {
  return fetchJson<string[]>("/api/properties/available");
}

export { CRYODB_BASE_URL };
