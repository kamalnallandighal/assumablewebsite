'use client';
import { useState, useEffect } from 'react';
import { findListing } from '../../lib/listings/data';

interface Props {
  listingId: string | null;
  onClose: () => void;
}

interface LeadForm {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const empty: LeadForm = { name: '', email: '', phone: '', message: '' };

export function LeadModal({ listingId, onClose }: Props) {
  const [form, setForm] = useState<LeadForm>(empty);
  const [done, setDone] = useState(false);
  const listing = listingId ? findListing(listingId) : null;

  useEffect(() => {
    if (listingId) {
      setForm(empty);
      setDone(false);
    }
  }, [listingId]);

  if (!listingId || !listing) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = {
      ...form,
      listingId,
      listingAddress: listing.address,
      createdAt: new Date().toISOString()
    };
    try {
      const existing = JSON.parse(localStorage.getItem('assumableLeads') ?? '[]');
      localStorage.setItem(
        'assumableLeads',
        JSON.stringify([...existing, lead])
      );
    } catch {
      /* ignore quota / SSR */
    }
    setDone(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-paper rounded-card shadow-lg w-full max-w-md max-[480px]:w-[calc(100%-24px)] p-6">
        {done ? (
          <div className="text-center py-6">
            <div className="font-serif text-2xl text-ink mb-2">Thanks!</div>
            <p className="text-muted text-sm">
              Jeff will reach out shortly about {listing.address}.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-serif text-xl text-ink">Contact agent</div>
                <p className="text-sm text-muted">{listing.address}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-muted text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
                className="w-full px-3 py-2 rounded-pill border border-line text-sm"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className="w-full px-3 py-2 rounded-pill border border-line text-sm"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone (optional)"
                className="w-full px-3 py-2 rounded-pill border border-line text-sm"
              />
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Anything Jeff should know?"
                rows={3}
                className="w-full px-3 py-2 rounded-card border border-line text-sm"
              />
              <button
                type="submit"
                className="w-full bg-terra text-white text-sm py-2.5 rounded-pill"
              >
                Send to Jeff
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
