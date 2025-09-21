// Sample data that mimics what would be extracted from various PDF types
// Use this for testing the PDF parsing functionality

export const samplePdfTexts = {
  hotelBooking: `
BOOKING CONFIRMATION
Grand Plaza Hotel
123 Harbor Street, Sydney NSW 2000, Australia
Booking Reference: GPH789456

Guest Details:
- John Smith (2 Adults)
- Check-in: December 25, 2024
- Check-out: December 27, 2024
- Room Type: Deluxe Ocean View
- Rate: $250.00 per night

Special Requests:
- Late check-in arranged
- Harbor view preferred
  `,

  ferryTicket: `
SPIRIT OF TASMANIA
BOOKING CONFIRMATION

Departure: Melbourne Terminal
Arrival: Devonport Terminal, Tasmania
Sailing Date: January 15, 2025
Departure Time: 09:30
Arrival Time: 20:00

Passengers: 4 Adults
Vehicle: 1 Car (6m)
Booking Number: SOT123789

Cabin Details:
- 2 x Recliner Seats (Ocean View)
- Deck 7

Total Journey Time: 10h 30m
  `,

  campingReservation: `
BAY OF FIRES CAMPING GROUND
Binalong Bay, Tasmania 7216

Reservation Confirmation
Booking ID: BOF456123

Site Details:
- Site Number: 45A
- Site Type: Powered Site (Beach Access)
- Check-in: January 16, 2025
- Check-out: January 18, 2025
- Guests: 4 Adults

Facilities:
- Beach access
- BBQ facilities
- Camp kitchen
- Swimming area nearby

Activities:
- Beach walks at sunrise
- Snorkeling at Skeleton Bay
- Eddystone Point lighthouse visit
  `,

  multipleBookings: `
TASMANIA ADVENTURE TOUR ITINERARY

Day 1 - December 22, 2024
Accommodation: George Town Caravan Park
Address: 5 Ferry Boulevard, George Town TAS 7253
Type: Powered site
Activities: Arrival, setup camp, explore town

Day 2 - December 23, 2024  
Accommodation: Freycinet Lodge
Address: Freycinet National Park, Coles Bay TAS 7215
Type: Eco cabin
Activities: Wineglass Bay hike, wildlife spotting
Travel time: 3 hours from George Town

Day 3 - December 24, 2024
Accommodation: Cradle Mountain Chalets  
Address: Cradle Mountain-Lake St Clair National Park TAS 7306
Type: Mountain chalet
Activities: Dove Lake walk, museum visit
Travel time: 4 hours from Freycinet
  `
};

// Helper function to simulate PDF text extraction for testing
export const simulatePdfUpload = (sampleKey) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(samplePdfTexts[sampleKey] || samplePdfTexts.hotelBooking);
    }, 1000); // Simulate processing time
  });
};
