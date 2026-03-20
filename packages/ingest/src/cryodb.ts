import { CryoChemicalSchema, CryoPaperSchema, type CryoChemical, type CryoPaper } from "../../shared/src/schema.js";

const CRYODB_BASE_URL = "https://cryodb.replit.app";

type PapersResponse = {
  papers: unknown[];
  total?: number;
  page?: number;
  limit?: number;
};

type AdvancedSearchExperiment = {
  experiment_label?: string | null;
  experiment_method?: string | null;
  biological_context?: {
    organ?: string | null;
    tissue?: string | null;
    species?: string | null;
    cell_line?: string | null;
    dimensions?: string | null;
    health_status?: string | null;
    developmental_stage?: string | null;
  } | null;
  curated_bio_context?: {
    organ?: { label?: string | null } | null;
    tissue?: { label?: string | null } | null;
    species?: { label?: string | null } | null;
    cell_type?: { label?: string | null } | null;
    developmental_stage?: string | null;
    physiological_state?: string | null;
  } | null;
};

type AdvancedSearchPaper = {
  paper_id?: string | null;
  paper_title?: string | null;
  paper_doi?: string | null;
  paper_authors?: string | null;
  paper_url?: string | null;
  published_year?: number | null;
  published_month?: number | null;
  published_day?: number | null;
  journal?: string | null;
  experiments?: AdvancedSearchExperiment[] | null;
};

type AdvancedSearchResponse = {
  papers: AdvancedSearchPaper[];
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
  const data = await fetchJson<AdvancedSearchResponse>("/api/papers/advanced-search", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      page,
      limit,
      useCurated: true
    })
  });
  const papers = (data.papers ?? []).map((paper) => CryoPaperSchema.parse(mapAdvancedSearchPaper(paper)));

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

export function mapAdvancedSearchPaper(paper: AdvancedSearchPaper): CryoPaper {
  const id = paper.paper_id?.trim() || crypto.randomUUID();
  const title = paper.paper_title?.trim() || paper.paper_doi?.trim() || id;

  return {
    id,
    paper_id: id,
    doi: paper.paper_doi ?? null,
    title,
    abstract: buildPaperAbstract(paper.experiments ?? []),
    paper_url: paper.paper_url ?? null,
    journal: paper.journal ?? null,
    published_year: paper.published_year ?? null,
    published_month: paper.published_month ?? null,
    published_day: paper.published_day ?? null,
    authors_flat: paper.paper_authors ?? null
  };
}

function buildPaperAbstract(experiments: AdvancedSearchExperiment[]): string | null {
  const sections = experiments
    .flatMap((experiment) => {
      const parts = [
        experiment.experiment_label,
        experiment.experiment_method,
        formatBiologicalContext(experiment)
      ]
        .map((value) => value?.trim())
        .filter(Boolean) as string[];

      return parts.length > 0 ? [parts.join(". ")] : [];
    })
    .filter(Boolean);

  if (sections.length === 0) {
    return null;
  }

  return sections.join(" ");
}

function formatBiologicalContext(experiment: AdvancedSearchExperiment): string | null {
  const curated = experiment.curated_bio_context;
  const raw = experiment.biological_context;

  const values = [
    curated?.species?.label,
    curated?.organ?.label,
    curated?.tissue?.label,
    curated?.cell_type?.label,
    curated?.developmental_stage,
    curated?.physiological_state,
    raw?.species,
    raw?.organ,
    raw?.tissue,
    raw?.cell_line,
    raw?.dimensions,
    raw?.health_status,
    raw?.developmental_stage
  ]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  const unique = Array.from(new Set(values));
  return unique.length > 0 ? unique.join("; ") : null;
}
