# Assumable Homes — Claude notes

Purpose
- Central notes for using Claude (or other Anthropic models) with the Assumable Homes project.
- Capture recommended prompts, use-cases, safety considerations, and integration tips for generating listing copy, meta descriptions, and social blurbs.

When to call Claude
- Generate short listing descriptions (50–140 chars) from listing fields.
- Create SEO-friendly title and meta description for each property page.
- Produce social captions (Instagram / Facebook / X) given a listing’s `address`, `price`, `beds`, `baths`, `sqft`, and public remarks.
- Rewriting seller-provided copy to be concise and buyer-focused.

Recommended prompts
- Short listing headline (one line)

  Prompt:
  "Write a concise, attention-grabbing headline (<= 60 characters) for a home listing using this data: address: {{address}}, price: {{price}}, beds: {{beds}}, baths: {{baths}}, sqft: {{sqft}}. Keep it direct and buyer-focused."

- SEO title + meta description

  Prompt:
  "Create an SEO title (<= 60 chars) and a meta description (<= 155 chars) for a property with the following details: {{address}}, price {{price}}, {{beds}} bd, {{baths}} ba, {{sqft}} sqft. Include the city and the phrase 'assumable loan' when appropriate. Return JSON: {\"title\":..., \"description\":...}."

- Social caption (Instagram)

  Prompt:
  "Write an Instagram caption (max 2200 chars, keep it under 300 chars recommended) highlighting a unique selling point of this property: {{publicRemarks}}. Include a short CTA like 'DM for a tour' and 3 short hashtags. Return plain text."

- Short property summary for cards (1–2 sentences)

  Prompt:
  "Produce a 1–2 sentence summary for a property card using: price: {{price}}, beds: {{beds}}, baths: {{baths}}, sqft: {{sqft}}, address: {{address}}. Keep it under 120 characters."

Safety & content guidelines
- Do NOT include personal data beyond property contact handles provided by the user.
- Avoid creating legal, financial, or mortgage advice. When asked about loan terms or assumability specifics, respond with a short disclaimer: 'Contact the listing agent or lender for details. This is not financial advice.'
- Sanitize any user-provided public remarks to remove phone numbers, emails, or PII before sending to Claude.

Integration tips
- Keep prompts short and deterministic. Use explicit length limits and JSON-return instructions when the frontend expects structured data.
- Run Claude calls server-side (Edge Function) to protect the API key. Return only the sanitized outputs to the client.
- Cache generated content in a small local store (or in listings.json) to avoid re-calling the model on each page load.

Cost & performance
- Use shorter models or lower temperature for short text generation (title, meta). Use higher temperature or longer-context models only when generating creative social captions.
- Batch requests when generating multiple captions (e.g., generate summaries for 10 featured listings in one call) to reduce per-request overhead.

Example server-side usage (pseudo)

1. Receive listing data from frontend.
2. Sanitize fields (remove PII, trim long remarks).
3. Build prompt as per above templates.
4. Call Claude Edge function with model settings: temperature 0.3 for SEO/title, 0.6 for captions.
5. Validate and store returned text.
6. Return the sanitized result to the client.

Notes
- If we later add multilingual support, include a `lang` parameter in prompts.
- Log prompt + trimmed response for auditing, but never persist raw user PII.
