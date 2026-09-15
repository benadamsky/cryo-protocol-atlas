import type { DomainData } from "./data";

export function paperHrefFromIds(ids: {
  doi?: string | null;
  pmcid?: string | null;
  pmid?: string | null;
  paperUrl?: string | null;
}) {
  if (ids.paperUrl) {
    return ids.paperUrl;
  }

  if (ids.doi) {
    return `https://doi.org/${ids.doi}`;
  }

  if (ids.pmcid) {
    return `https://pmc.ncbi.nlm.nih.gov/articles/${ids.pmcid}/`;
  }

  if (ids.pmid) {
    return `https://pubmed.ncbi.nlm.nih.gov/${ids.pmid}/`;
  }

  return null;
}

export function paperHrefById(domainData: DomainData, paperId: string) {
  const enrichment = domainData.sourceEnrichment.records.find((record) => record.paperId === paperId);

  if (enrichment?.paperUrl) {
    return enrichment.paperUrl;
  }

  const paper = domainData.domainSnapshot.papers.find((entry) => entry.paper.id === paperId)?.paper;

  if (!paper) {
    return null;
  }

  return paperHrefFromIds({ paperUrl: paper.paper_url, doi: paper.doi, pmcid: paper.pmcid, pmid: paper.pmid });
}

function titleKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function paperHrefByTitle(domainData: DomainData, title: string) {
  const key = titleKey(title);
  const paper = domainData.domainSnapshot.papers.find((entry) => titleKey(entry.paper.title) === key)?.paper;

  if (!paper) {
    return null;
  }

  return paperHrefById(domainData, paper.id);
}
