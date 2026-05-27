import { getCotalityToken } from './auth';
import type { MortgageTransactionProduct, PropertySearchHit } from './types';

const BASE = 'https://api1.cotality.com';

async function authedGet<T>(path: string): Promise<T> {
  const token = await getCotalityToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `OAuth ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Cotality GET ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export interface PropertySearchParams {
  streetAddress: string;
  city?: string;
  state: string;
  zipCode: string;
  bestMatch?: boolean;
}

export async function searchProperty(p: PropertySearchParams): Promise<PropertySearchHit | null> {
  const q = new URLSearchParams({
    streetAddress: p.streetAddress,
    state: p.state,
    zipCode: p.zipCode,
    bestMatch: String(p.bestMatch ?? true)
  });
  if (p.city) q.set('city', p.city);
  const result = await authedGet<{ items?: PropertySearchHit[] }>(`/v2/properties/search?${q}`);
  return result.items?.[0] ?? null;
}

export function getCurrentMortgage(clip: string): Promise<MortgageTransactionProduct> {
  return authedGet<MortgageTransactionProduct>(`/v2/properties/${clip}/mortgage/current`);
}

export interface DocImageParams {
  fipsCode: string;
  recordingDate: number;     // YYYYMMDD
  documentNumber: string;
  outputType?: 'PDF' | 'TIFF';
}

export async function fetchDocumentImage(p: DocImageParams): Promise<{ contentType: string; body: ArrayBuffer }> {
  const token = await getCotalityToken();
  const q = new URLSearchParams({
    fipsCode: p.fipsCode,
    recordingDate: String(p.recordingDate),
    documentNumber: p.documentNumber,
    outputType: p.outputType ?? 'PDF'
  });
  const res = await fetch(`${BASE}/v2/properties/document-images/mortgage?${q}`, {
    headers: { Authorization: `OAuth ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Cotality doc-image → ${res.status}: ${await res.text()}`);
  }
  return { contentType: res.headers.get('content-type') ?? 'application/pdf', body: await res.arrayBuffer() };
}
