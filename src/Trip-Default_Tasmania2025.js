// Trip-Default_Tasmania2025.js
// This file contains the default trip data for the Tasmania 2025 trip,
// combining details manually extracted from the provided CSV and PDF booking confirmations.

const defaultTasmaniaTripData = [
  // Spirit of Tasmania (Sailing 1) - Dec 22 (from PDF booking)
  {
    id: 'spirit-of-tasmania-sailing1-2025-12-22',
    date: '2025-12-22',
    location: 'TT-Line Company Ferry Terminal, 119 Corio Quay Rd, North Geelong VIC 3215, Australia',
    accommodation: 'Spirit of Tasmania (Sailing 1)',
    status: 'Booked',
    notes: 'Depart Geelong 08:30, Arrive Devonport 19:00. Passengers: 4 Adult, 2 Recliner (Accessible), 2 Day Ticket. Vehicle: 1 LDV T60 (6m, over 2.1m high), DO32JP. Booking #15661503.',
    travelTime: '10h 30m',
    activities: 'Ferry crossing, scenic views of Bass Strait.',
    type: 'note',
    activityLink: 'https://www.google.com/search?q=things%20to%20do%20in%20Geelong%20Victoria%20Australia',
  },
  // George Town - Dec 22-23 (from CSV, adjusted to fit after ferry arrival)
  {
    id: 'george-town-2025-12-22',
    date: '2025-12-22', // Overnight on 22nd
    location: 'George Town, TAS 7253, Australia',
    accommodation: 'Camping/Accommodation (Booked Georgetown but may cancel and just free camp as it\'s like $200!)',
    status: 'Unconfirmed', // Status from CSV
    notes: 'Overnight. May cancel and just free camp.',
    travelTime: '~30m from Devonport', // Estimated drive from Devonport port
    activities: 'Arrival in Tasmania, settle in George Town.',
    type: 'camp',
    activityLink: 'https://www.google.com/search?q=campsites%20near%20George%20Town%20Tasmania%20Australia',
  },
  // Bay of Fires / NE Coast (Binalong Bay) - Dec 23-24 (from CSV)
  {
    id: 'bay-of-fires-2025-12-23',
    date: '2025-12-23',
    location: 'Binalong Bay, TAS 7216, Australia',
    accommodation: 'Bay of Fires Camping',
    status: 'Not booked',
    notes: 'Beaches, Eddystone Point day trip, coastal walks.',
    travelTime: '~3h 15m from Devonport',
    activities: 'Beaches, Eddystone Point day trip, coastal walks.',
    type: 'camp',
    activityLink: 'https://www.google.com/search?q=campsites%20near%20Binalong%20Bay%20Tasmania%20Australia',
  },
  // Ross / Midlands (Christmas - booked) - Dec 24-26 (from CSV, overlapping with Scamander)
  // Scamander Sanctuary (from PDF booking) is Dec 24-25, so we'll adjust Ross to start after.
  {
    id: 'scamander-sanctuary-2025-12-24',
    date: '2025-12-24',
    location: 'Scamander Sanctuary Holiday Park, 2375 Tasman Hwy, Scamander TAS 7215, Australia',
    accommodation: 'Scamander Sanctuary Holiday Park',
    status: 'Booked',
    notes: 'Accommodation for George Corea (24 Dec 2025 to 25 Dec 2025). Booking #27366. Receipt #29582. Scenic drive from Bay of Fires to Tasmania\'s East Coast for Christmas.',
    travelTime: 'Approx. 1h from Bay of Fires', // Estimated based on map
    activities: 'Travel to Scamander, settle for Christmas Eve.',
  type: 'roofed',
  activityLink: 'https://www.booking.com/searchresults.html?ss=Scamander%20Sanctuary%20Holiday%20Park%2C%20Tasmania%2C%20Australia&checkin=2025-12-24&checkout=2025-12-25&group_adults=4',
  },
  {
    id: 'ross-midlands-2025-12-25',
    date: '2025-12-25', // Ross starts on 24th in CSV, but PDF booking is 24-25 Scamander. Adjusting Ross to start on 25th.
    location: 'Ross, TAS 7209, Australia',
    accommodation: 'Ross Caravan Park',
    status: 'Booked',
    notes: 'Christmas service, historic village walks.',
    travelTime: '~1h from Scamander', // Estimated drive from Scamander to Ross
    activities: 'Christmas service, historic village walks.',
  type: 'roofed',
  activityLink: 'https://www.booking.com/searchresults.html?ss=Ross%2C%20Tasmania%2C%20Australia&checkin=2025-12-25&checkout=2025-12-26&group_adults=4',
  },
  // Freycinet / East Coast - Dec 26-28 (from CSV)
  {
    id: 'freycinet-east-coast-2025-12-26',
    date: '2025-12-26',
    location: 'Coles Bay, TAS 7215, Australia',
    accommodation: 'Coles Bay Accommodation',
    status: 'Not booked',
    notes: 'Wineglass Bay hike, coastal activities.',
    travelTime: '~1h 30m from Ross', // Estimated drive
    activities: 'Wineglass Bay hike, coastal activities.',
  type: 'roofed',
  activityLink: 'https://www.booking.com/searchresults.html?ss=Coles%20Bay%2C%20Tasmania%2C%20Australia&checkin=2025-12-26&checkout=2025-12-27&group_adults=4',
  },
  // Hobart / South East - Dec 28-30 (from CSV)
  {
    id: 'hobart-south-east-2025-12-28',
    date: '2025-12-28',
    location: 'Hobart, TAS 7000, Australia',
    accommodation: 'Hobart Accommodation',
    status: 'Not booked',
    notes: 'MONA, Salamanca, Port Arthur day trip, Richmond.',
    travelTime: '~2h from Freycinet',
    activities: 'MONA, Salamanca, Port Arthur day trip, Richmond.',
  type: 'roofed',
  activityLink: 'https://www.booking.com/searchresults.html?ss=Hobart%2C%20Tasmania%2C%20Australia&checkin=2025-12-28&checkout=2025-12-29&group_adults=4',
  },
  // Huon Valley / South West - Dec 30-Jan 1 (from CSV)
  {
    id: 'huon-valley-south-west-2025-12-30',
    date: '2025-12-30',
    location: 'Geeveston, TAS 7116, Australia',
    accommodation: 'Huon Valley Accommodation',
    status: 'Not booked',
    notes: 'Tahune Airwalk, Hastings Caves, New Year\'s Eve.',
    travelTime: '~1h from Hobart',
    activities: 'Tahune Airwalk, Hastings Caves, New Year\'s Eve.',
    type: 'roofed',
    activityLink: 'https://www.booking.com/searchresults.html?ss=Geeveston%2C%20Tasmania%2C%20Australia&checkin=2025-12-30&checkout=2025-12-31&group_adults=4',
  },
  // Mount Field / Central Highlands - Jan 1-3 (from CSV)
  {
    id: 'mount-field-central-highlands-2026-01-01',
    date: '2026-01-01',
    location: 'National Park, TAS 7140, Australia',
    accommodation: 'Mount Field Accommodation',
    status: 'Not booked',
    notes: 'Waterfalls, Tall Trees Walk, Lake St Clair.',
    travelTime: '~1h 30m from Huon Valley',
    activities: 'Waterfalls, Tall Trees Walk, Lake St Clair.',
  type: 'roofed',
  activityLink: 'https://www.booking.com/searchresults.html?ss=National%20Park%2C%20Tasmania%2C%20Australia&checkin=2026-01-01&checkout=2026-01-02&group_adults=4',
  },
  // Queenstown / West Coast - Jan 3-5 (from CSV)
  {
    id: 'queenstown-west-coast-2026-01-03',
    date: '2026-01-03',
    location: 'Queenstown, TAS 7467, Australia',
    accommodation: 'Queenstown Accommodation',
    status: 'Not booked',
    notes: 'Mining history, Gordon River Cruise (Strahan).',
    travelTime: '~2h from Mount Field',
    activities: 'Mining history, Gordon River Cruise (Strahan).',
  type: 'roofed',
  activityLink: 'https://www.booking.com/searchresults.html?ss=Queenstown%2C%20Tasmania%2C%20Australia&checkin=2026-01-03&checkout=2026-01-04&group_adults=4',
  },
  // Strahan / West Coast - Jan 5-7 (from CSV)
  {
    id: 'strahan-west-coast-2026-01-05',
    date: '2026-01-05',
    location: 'Strahan, TAS 7468, Australia',
    accommodation: 'Strahan Accommodation',
    status: 'Not booked',
    notes: 'Gordon River Cruise, Henty Dunes.',
    travelTime: '~45m from Queenstown',
    activities: 'Gordon River Cruise, Henty Dunes.',
  type: 'roofed',
  activityLink: 'https://www.booking.com/searchresults.html?ss=Strahan%2C%20Tasmania%2C%20Australia&checkin=2026-01-05&checkout=2026-01-06&group_adults=4',
  },
  // Stanley / NW Coast / Tarkine - Jan 7-9 (from CSV)
  {
    id: 'stanley-nw-coast-tarkine-2026-01-07',
    date: '2026-01-07',
    location: 'Stanley, TAS 7331, Australia',
    accommodation: 'Stanley Cabins',
    status: 'Not booked',
    notes: 'The Nut, Tarkine Drive, Edge of the World walks.',
    travelTime: '~3-4h from Strahan to Stanley',
    activities: 'The Nut, Tarkine Drive, Edge of the World walks.',
  type: 'roofed',
  activityLink: 'https://www.booking.com/searchresults.html?ss=Stanley%2C%20Tasmania%2C%20Australia&checkin=2026-01-07&checkout=2026-01-08&group_adults=4',
  },
  // Cethana Campground (from PDF booking) - Jan 9-11 (overlaps with CSV's Transit to Cradle Mountain)
  // We'll keep Cethana as the primary booking for these dates.
  {
    id: 'cethana-campground-2026-01-09',
    date: '2026-01-09',
    location: 'Cethana Power Station Access Rd, Cethana TAS 7306, Australia',
    accommodation: 'Cethana Campground',
    status: 'Booked',
    notes: 'Trip dates: Fri, Jan 9th to Sun, Jan 11th. Group size: 3 Adults, 1 Vehicle (car, 5 meters length). Booking #3585929. Located near the Cradle Mountain area, providing a good base for exploring.',
    travelTime: 'Approx. 2h from Stanley', // Estimated drive to Cethana
    activities: 'Camping, exploring local area, relaxing, day trips to nearby attractions like Cradle Mountain.',
  type: 'camp',
  activityLink: 'https://www.google.com/search?q=campsites%20near%20Cethana%20Power%20Station%20Access%20Rd%20Tasmania%20Australia',
  },
  // Cradle Mountain - Jan 10-12 (from CSV, adjusted to fit Cethana booking)
  // This entry is adjusted to represent activities during the Cethana stay.
  {
    id: 'cradle-mountain-canyoning-2026-01-10',
    date: '2026-01-10',
    location: 'Cradle Mountain-Lake St Clair National Park, TAS 7306, Australia',
    accommodation: 'Cethana Campground (Base)', // Accommodation is Cethana
    status: 'Booked', // Status based on Cethana booking
    notes: 'Canyoning with Cradle Mountain Canyons, guided caving, alpine hikes.',
    travelTime: 'Local (from Cethana)',
    activities: 'Canyoning with Cradle Mountain Canyons, guided caving, alpine hikes.',
  type: 'enroute',
  activityLink: 'https://www.google.com/search?q=things%20to%20do%20Cradle%20Mountain-Lake%20St%20Clair%20National%20Park%20Tasmania%20Australia%20activities%20attractions',
  },
  // Transit to Devonport - Jan 12 (from CSV)
  {
    id: 'transit-devonport-2026-01-12',
    date: '2026-01-12',
    location: 'Devonport, TAS 7310, Australia',
    accommodation: 'Devonport Accommodation (or Ferry)',
    status: 'Not booked',
    notes: 'Travel day to Devonport for ferry departure.',
    travelTime: '~1h from Cradle Mountain area',
    activities: 'Travel day, last-minute souvenir shopping in Devonport.',
  type: 'roofed',
  activityLink: 'https://www.booking.com/searchresults.html?ss=Devonport%2C%20Tasmania%2C%20Australia&checkin=2026-01-12&checkout=2026-01-13&group_adults=4',
  },
  // Spirit of Tasmania (Sailing 2) - Jan 13 (from PDF booking)
  {
    id: 'spirit-of-tasmania-sailing2-2026-01-13',
    date: '2026-01-13',
    location: 'TT-Line Company Ferry Terminal, 5 Esplanade E, Devonport TAS 7310, Australia',
    accommodation: 'Spirit of Tasmania (Sailing 2)',
    status: 'Booked',
    notes: 'Depart Devonport 08:30, Arrive Geelong 19:00. Passengers: 3 Adult, 1 Recliner, 2 Day Ticket. Vehicle: 1 LDV T60 (6m, over 2.1m high), DO32JP. Booking #15661503.',
    travelTime: '10h 30m',
    activities: 'Ferry crossing, reflection on the trip.',
    type: 'note',
    activityLink: 'https://www.google.com/search?q=things%20to%20do%20in%20Devonport%20Tasmania%20Australia',
  },
];

export default defaultTasmaniaTripData;
