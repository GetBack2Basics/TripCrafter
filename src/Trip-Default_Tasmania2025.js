// Trip-Default_Tasmania2025.js
// This file contains the default trip data for the Tasmania 2025 trip,
// combining details manually extracted from the provided CSV and PDF booking confirmations.

const defaultTasmaniaTripData = [
  // Spirit of Tasmania (Sailing 1) - Dec 22 (from PDF booking)
  {
    id: 'spirit-of-tasmania-sailing1-2025-12-22',
    date: '2025-12-22',
    location: 'Geelong to Devonport',
    accommodation: 'Spirit of Tasmania (Sailing 1)',
    status: 'Booked',
    notes: 'Depart Geelong 08:30, Arrive Devonport 19:00. Passengers: 4 Adult, 2 Recliner (Accessible), 2 Day Ticket. Vehicle: 1 LDV T60 (6m, over 2.1m high), DO32JP. Booking #15661503.',
    travelTime: '10h 30m',
    activities: 'Ferry crossing, scenic views of Bass Strait.',
  },
  // George Town - Dec 22-23 (from CSV, adjusted to fit after ferry arrival)
  {
    id: 'george-town-2025-12-22',
    date: '2025-12-22', // Overnight on 22nd
    location: 'George Town',
    accommodation: 'Camping/Accommodation (Booked Georgetown but may cancel and just free camp as it\'s like $200!)',
    status: 'Unconfirmed', // Status from CSV
    notes: 'Overnight. May cancel and just free camp.',
    travelTime: '~30m from Devonport', // Estimated drive from Devonport port
    activities: 'Arrival in Tasmania, settle in George Town.',
  },
  // Bay of Fires / NE Coast (Binalong Bay) - Dec 23-24 (from CSV)
  {
    id: 'bay-of-fires-2025-12-23',
    date: '2025-12-23',
    location: 'Bay of Fires / NE Coast (Binalong Bay)',
    accommodation: 'Bay of Fires Camping',
    status: 'Not booked',
    notes: 'Beaches, Eddystone Point day trip, coastal walks.',
    travelTime: '~3h 15m from Devonport',
    activities: 'Beaches, Eddystone Point day trip, coastal walks.',
  },
  // Ross / Midlands (Christmas - booked) - Dec 24-26 (from CSV, overlapping with Scamander)
  // Scamander Sanctuary (from PDF booking) is Dec 24-25, so we'll adjust Ross to start after.
  {
    id: 'scamander-sanctuary-2025-12-24',
    date: '2025-12-24',
    location: 'Scamander Sanctuary Holiday Park',
    accommodation: 'Scamander Sanctuary Holiday Park',
    status: 'Booked',
    notes: 'Accommodation for George Corea (24 Dec 2025 to 25 Dec 2025). Booking #27366. Receipt #29582. Scenic drive from Bay of Fires to Tasmania\'s East Coast for Christmas.',
    travelTime: 'Approx. 1h from Bay of Fires', // Estimated based on map
    activities: 'Travel to Scamander, settle for Christmas Eve.',
  },
  {
    id: 'ross-midlands-2025-12-25',
    date: '2025-12-25', // Ross starts on 24th in CSV, but PDF booking is 24-25 Scamander. Adjusting Ross to start on 25th.
    location: 'Ross / Midlands',
    accommodation: 'Ross Caravan Park',
    status: 'Booked',
    notes: 'Christmas service, historic village walks.',
    travelTime: '~1h from Scamander', // Estimated drive from Scamander to Ross
    activities: 'Christmas service, historic village walks.',
  },
  // Freycinet / East Coast - Dec 26-28 (from CSV)
  {
    id: 'freycinet-east-coast-2025-12-26',
    date: '2025-12-26',
    location: 'Freycinet / East Coast',
    accommodation: 'Coles Bay Accommodation',
    status: 'Not booked',
    notes: 'Wineglass Bay hike, coastal activities.',
    travelTime: '~1h 30m from Ross', // Estimated drive
    activities: 'Wineglass Bay hike, coastal activities.',
  },
  // Hobart / South East - Dec 28-30 (from CSV)
  {
    id: 'hobart-south-east-2025-12-28',
    date: '2025-12-28',
    location: 'Hobart / South East',
    accommodation: 'Hobart Accommodation',
    status: 'Not booked',
    notes: 'MONA, Salamanca, Port Arthur day trip, Richmond.',
    travelTime: '~2h from Freycinet',
    activities: 'MONA, Salamanca, Port Arthur day trip, Richmond.',
  },
  // Huon Valley / South West - Dec 30-Jan 1 (from CSV)
  {
    id: 'huon-valley-south-west-2025-12-30',
    date: '2025-12-30',
    location: 'Huon Valley / South West',
    accommodation: 'Huon Valley Accommodation',
    status: 'Not booked',
    notes: 'Tahune Airwalk, Hastings Caves, New Year\'s Eve.',
    travelTime: '~1h from Hobart',
    activities: 'Tahune Airwalk, Hastings Caves, New Year\'s Eve.',
  },
  // Mount Field / Central Highlands - Jan 1-3 (from CSV)
  {
    id: 'mount-field-central-highlands-2026-01-01',
    date: '2026-01-01',
    location: 'Mount Field / Central Highlands',
    accommodation: 'Mount Field Accommodation',
    status: 'Not booked',
    notes: 'Waterfalls, Tall Trees Walk, Lake St Clair.',
    travelTime: '~1h 30m from Huon Valley',
    activities: 'Waterfalls, Tall Trees Walk, Lake St Clair.',
  },
  // Queenstown / West Coast - Jan 3-5 (from CSV)
  {
    id: 'queenstown-west-coast-2026-01-03',
    date: '2026-01-03',
    location: 'Queenstown / West Coast',
    accommodation: 'Queenstown Accommodation',
    status: 'Not booked',
    notes: 'Mining history, Gordon River Cruise (Strahan).',
    travelTime: '~2h from Mount Field',
    activities: 'Mining history, Gordon River Cruise (Strahan).',
  },
  // Strahan / West Coast - Jan 5-7 (from CSV)
  {
    id: 'strahan-west-coast-2026-01-05',
    date: '2026-01-05',
    location: 'Strahan / West Coast',
    accommodation: 'Strahan Accommodation',
    status: 'Not booked',
    notes: 'Gordon River Cruise, Henty Dunes.',
    travelTime: '~45m from Queenstown',
    activities: 'Gordon River Cruise, Henty Dunes.',
  },
  // Stanley / NW Coast / Tarkine - Jan 7-9 (from CSV)
  {
    id: 'stanley-nw-coast-tarkine-2026-01-07',
    date: '2026-01-07',
    location: 'Stanley / NW Coast / Tarkine',
    accommodation: 'Stanley Cabins',
    status: 'Not booked',
    notes: 'The Nut, Tarkine Drive, Edge of the World walks.',
    travelTime: '~3-4h from Strahan to Stanley',
    activities: 'The Nut, Tarkine Drive, Edge of the World walks.',
  },
  // Cethana Campground (from PDF booking) - Jan 9-11 (overlaps with CSV's Transit to Cradle Mountain)
  // We'll keep Cethana as the primary booking for these dates.
  {
    id: 'cethana-campground-2026-01-09',
    date: '2026-01-09',
    location: 'Cethana Camp Ground',
    accommodation: 'Cethana Campground',
    status: 'Booked',
    notes: 'Trip dates: Fri, Jan 9th to Sun, Jan 11th. Group size: 3 Adults, 1 Vehicle (car, 5 meters length). Booking #3585929. Located near the Cradle Mountain area, providing a good base for exploring.',
    travelTime: 'Approx. 2h from Stanley', // Estimated drive to Cethana
    activities: 'Camping, exploring local area, relaxing, day trips to nearby attractions like Cradle Mountain.',
  },
  // Cradle Mountain - Jan 10-12 (from CSV, adjusted to fit Cethana booking)
  // This entry is adjusted to represent activities during the Cethana stay.
  {
    id: 'cradle-mountain-canyoning-2026-01-10',
    date: '2026-01-10',
    location: 'Cradle Mountain',
    accommodation: 'Cethana Campground (Base)', // Accommodation is Cethana
    status: 'Booked', // Status based on Cethana booking
    notes: 'Canyoning with Cradle Mountain Canyons, guided caving, alpine hikes.',
    travelTime: 'Local (from Cethana)',
    activities: 'Canyoning with Cradle Mountain Canyons, guided caving, alpine hikes.',
  },
  // Transit to Devonport - Jan 12 (from CSV)
  {
    id: 'transit-devonport-2026-01-12',
    date: '2026-01-12',
    location: 'Transit to Devonport',
    accommodation: 'Devonport Accommodation (or Ferry)',
    status: 'Not booked',
    notes: 'Travel day to Devonport for ferry departure.',
    travelTime: '~1h from Cradle Mountain area',
    activities: 'Travel day, last-minute souvenir shopping in Devonport.',
  },
  // Spirit of Tasmania (Sailing 2) - Jan 13 (from PDF booking)
  {
    id: 'spirit-of-tasmania-sailing2-2026-01-13',
    date: '2026-01-13',
    location: 'Devonport to Geelong',
    accommodation: 'Spirit of Tasmania (Sailing 2)',
    status: 'Booked',
    notes: 'Depart Devonport 08:30, Arrive Geelong 19:00. Passengers: 3 Adult, 1 Recliner, 2 Day Ticket. Vehicle: 1 LDV T60 (6m, over 2.1m high), DO32JP. Booking #15661503.',
    travelTime: '10h 30m',
    activities: 'Ferry crossing, reflection on the trip.',
  },
];

export default defaultTasmaniaTripData;
