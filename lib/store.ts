'use client';

// Deals live in the browser (localStorage). Money lives in PayPal: every money step is checked
// against PayPal on the server, and the terms are signed when funded, so the browser copy can't
// be used to move money it shouldn't.

import { useSyncExternalStore } from 'react';
import type { Deal, Milestone, TimelineEvent } from './types';

const KEY = 'proofpay.deals.v1';
const listeners = new Set<() => void>();
let cache: Deal[] | null = null;
const EMPTY: Deal[] = [];

function read(): Deal[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || '[]') as Deal[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(deals: Deal[]) {
  cache = deals;
  try {
    localStorage.setItem(KEY, JSON.stringify(deals));
  } catch {
    // storage full or blocked: keep the in-memory copy for this tab
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useDeals(): Deal[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useDeal(id: string): Deal | undefined {
  return useDeals().find((d) => d.id === id);
}

export const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

export function saveDeal(deal: Deal) {
  write([deal, ...read().filter((d) => d.id !== deal.id)]);
}

export function deleteDeal(id: string) {
  write(read().filter((d) => d.id !== id));
}

export function updateDeal(id: string, fn: (deal: Deal) => Deal) {
  write(read().map((d) => (d.id === id ? fn(structuredClone(d)) : d)));
}

export function updateMilestone(dealId: string, milestoneId: string, fn: (m: Milestone) => void, events: Omit<TimelineEvent, 'at'>[] = []) {
  updateDeal(dealId, (deal) => {
    const m = deal.milestones.find((x) => x.id === milestoneId);
    if (m) fn(m);
    const at = new Date().toISOString();
    deal.timeline.push(...events.map((e) => ({ ...e, at })));
    return deal;
  });
}

export function createDemoDeal(freelancerEmail: string): Deal {
  const now = new Date().toISOString();
  const deal: Deal = {
    id: newId('deal'),
    title: 'Sunrise Bakery website',
    summary: 'A one-page site for a neighbourhood bakery, then an online pre-order form so regulars can reserve bread for pickup.',
    clientName: 'Maria Lopez (Sunrise Bakery)',
    freelancerName: 'Alex Rivera',
    freelancerEmail,
    currency: 'USD',
    deliverableType: 'website',
    createdAt: now,
    milestones: [
      {
        id: newId('ms'),
        title: 'Landing page',
        amount: '300.00',
        criteria: [
          'The main heading shows the business name "Sunrise Bakery"',
          'A menu section lists at least 5 items, each with a price',
          'The page shows a phone number customers can call',
          'The page shows opening hours',
          'The page links to the bakery address on a map',
        ],
        status: 'AGREED',
        submissions: [],
      },
      {
        id: newId('ms'),
        title: 'Online pre-order form',
        amount: '650.00',
        criteria: [
          'The page has an order form with fields for name, phone, pickup date and items',
          'The name and phone fields are marked required',
          'The form has a submit button',
          'The page states how much notice is needed for a pre-order',
        ],
        status: 'AGREED',
        submissions: [],
      },
    ],
    timeline: [{ at: now, actor: 'system', text: 'Deal created from the Sunrise Bakery demo template.' }],
  };
  saveDeal(deal);
  return deal;
}
