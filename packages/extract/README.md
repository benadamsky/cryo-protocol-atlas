# Extraction Package

This package currently contains the first ovarian-domain extraction pass.

It turns title/abstract text into:

- protocol family
- specimen types
- chemical mentions
- concentration, temperature, and duration mentions
- outcome classes with evidence snippets
- extraction confidence

The current extractor is intentionally heuristic and auditable. It is a bridge to later LLM-assisted extraction from full text, not a replacement for it.
