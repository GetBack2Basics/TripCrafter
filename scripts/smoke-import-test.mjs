import { aiImportService } from '../src/services/aiImportService.js';
import { samplePdfTexts } from '../src/testData/samplePdfTexts.js';

// Duplicate of TripDashboard's link helpers and normalization (kept minimal for smoke test)
function generateActivityLink(type, location, checkinDate, adults = 2, tripSettings = {}) {
  if (!location) return '';
  const locationParts = location.split(',');
  const cityName = locationParts[0].trim();
  const state = tripSettings.state || 'Tasmania';
  const country = tripSettings.country || 'Australia';

  switch (type) {
    case 'roofed': {
      if (!checkinDate) return '';
      const checkin = new Date(checkinDate);
      if (isNaN(checkin.getTime())) return '';
      const checkinYear = checkin.getFullYear();
      const checkinMonth = checkin.getMonth() + 1;
      const checkinDay = checkin.getDate();
      const checkout = new Date(checkin);
      checkout.setDate(checkout.getDate() + 1);
      const checkoutYear = checkout.getFullYear();
      const checkoutMonth = checkout.getMonth() + 1;
      const checkoutDay = checkout.getDate();
      const baseUrl = 'https://www.booking.com/searchresults.html';
      const searchLocation = `${cityName}, ${state}, ${country}`;
      const params = new URLSearchParams({
        ss: searchLocation,
        checkin: `${checkinYear}-${String(checkinMonth).padStart(2,'0')}-${String(checkinDay).padStart(2,'0')}`,
        checkout: `${checkoutYear}-${String(checkoutMonth).padStart(2,'0')}-${String(checkoutDay).padStart(2,'0')}`,
        group_adults: String(adults)
      });
      return `${baseUrl}?${params.toString()}`;
    }
    case 'camp': {
      const campSearchQuery = encodeURIComponent(`campsites near ${cityName} ${state} ${country}`);
      return `https://www.google.com/search?q=${campSearchQuery}`;
    }
    case 'enroute': {
      const searchQuery = encodeURIComponent(`things to do ${cityName} ${state} ${country} activities attractions`);
      return `https://www.google.com/search?q=${searchQuery}`;
    }
    default:
      return '';
  }
}

function generateTitleLink(title, type, location, checkinDate, adults = 2, tripSettings = {}) {
  if (!title) return '';
  if (type === 'roofed') {
    if (!checkinDate) return '';
    const checkin = new Date(checkinDate);
    if (isNaN(checkin.getTime())) return '';
    const checkinYear = checkin.getFullYear();
    const checkinMonth = checkin.getMonth() + 1;
    const checkinDay = checkin.getDate();
    const checkout = new Date(checkin);
    checkout.setDate(checkout.getDate() + 1);
    const checkoutYear = checkout.getFullYear();
    const checkoutMonth = checkout.getMonth() + 1;
    const checkoutDay = checkout.getDate();
    const baseUrl = 'https://www.booking.com/searchresults.html';
    const params = new URLSearchParams({
      ss: title,
      checkin: `${checkinYear}-${String(checkinMonth).padStart(2,'0')}-${String(checkinDay).padStart(2,'0')}`,
      checkout: `${checkoutYear}-${String(checkoutMonth).padStart(2,'0')}-${String(checkoutDay).padStart(2,'0')}`,
      group_adults: String(adults)
    });
    return `${baseUrl}?${params.toString()}`;
  }
  const q = encodeURIComponent(`${title} ${tripSettings.state || 'Tasmania'} ${tripSettings.country || 'Australia'}`);
  return `https://www.google.com/search?q=${q}`;
}

function normalizeTripItem(item) {
  const profile = item.profile || {};
  const adults = profile.adults || 2;
  const tripSettings = profile || {};
  return {
    id: item.id || Math.random().toString(36).substr(2, 9),
    date: item.date || '',
    location: item.location || '',
    title: item.title || item.activities || '',
    status: item.status || 'Unconfirmed',
    notes: item.notes || '',
    travelTime: item.travelTime || '',
    activities: item.activities || '',
    type: item.type || 'roofed',
    titleLink: (item.type === 'roofed' || item.type === 'camp') ? (item.titleLink || generateTitleLink(item.title || '', item.type, item.location, item.date, adults, tripSettings)) : (item.type === 'enroute' ? (item.titleLink || generateTitleLink(item.title || '', item.type, item.location, item.date, adults, tripSettings)) : ''),
    activityLink: (item.type && item.type !== 'note') ? (item.activityLink || generateActivityLink(item.type || 'enroute', item.location, item.date, adults, tripSettings)) : '',
  };
}

(async () => {
  try {
    const sample = samplePdfTexts.multipleBookings; // choose a multi-bookings sample
    const profile = { adults: 2, children: 0, interests: ['coastal walks','hiking'], diet: 'vegetarian', state: 'Tasmania', country: 'Australia' };
    console.log('Running AI import for smoke test...');
    const parsed = await aiImportService.importFromSource(sample, 'text', profile);
    if (!parsed.success) {
      console.error('AI import failed:', parsed.error);
      process.exit(1);
    }
    // Build wrapper payload: approve all parsed entries
    const payload = parsed.data.map(d => ({ entry: { ...d, profile }, action: 'create' }));

    // Simulate existing trip items (empty to start)
    let localTripItems = [];

    const summary = { created: 0, updated: 0, replaced: 0, errors: 0 };

    for (const item of payload) {
      const { entry, action } = item;
      const incoming = normalizeTripItem(entry);
      // find existing by date+type
      const existing = localTripItems.find(t => t.date === incoming.date && t.type === incoming.type);
      if (existing) {
        if (action === 'replace') {
          localTripItems = localTripItems.filter(t => t.id !== existing.id);
          localTripItems.push(incoming);
          summary.replaced += 1;
        } else {
          // merge: incoming overrides
          localTripItems = localTripItems.map(t => t.id === existing.id ? { ...t, ...incoming } : t);
          summary.updated += 1;
        }
      } else {
        localTripItems.push(incoming);
        summary.created += 1;
      }

      // Enforce single roofed/camp per day: demote others
      if (incoming.type === 'roofed' || incoming.type === 'camp') {
        localTripItems = localTripItems.map(t => {
          if (t.id === incoming.id) return t;
          if (t.date === incoming.date && (t.type === 'roofed' || t.type === 'camp')) {
            return { ...t, status: 'Unconfirmed' };
          }
          return t;
        });
      }
    }

    console.log('Import summary:', summary);
    console.log('Final trip items snapshot:');
    console.log(JSON.stringify(localTripItems, null, 2));

  } catch (e) {
    console.error('Smoke test error:', e);
    process.exit(1);
  }
})();
