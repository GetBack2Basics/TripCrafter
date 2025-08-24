// LLM service for parsing PDF content into trip data format

export class LLMService {
  constructor() {
    this.geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
  }

  async parseBookingInformation(text) {
    const prompt = this.buildPrompt(text);
    if (this.geminiApiKey && this.geminiApiKey !== 'your_gemini_api_key_here') {
      return await this.callGemini(prompt);
    } else {
      // Fallback to mock parsing for demo purposes
      return this.mockParse(text);
    }
  }

  buildPrompt(text) {
    return `You are an expert travel assistant. Parse the following travel booking information and extract structured data.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation, no extra text.

Return an ARRAY of objects, one per day or booking, in this exact format:
[
  {
    "date": "YYYY-MM-DD",
    "location": "Full address or location name",
    "accommodation": "Hotel/accommodation name",
    "status": "Booked|Unconfirmed|Cancelled|Not booked", 
    "type": "roofed|camp|enroute",
    "travelTime": "Estimated travel time (e.g., '2h 30m')",
    "activities": "Activities or description for the day",
    "notes": "Any additional notes, booking numbers, guest details"
  },
  ...
]

Field Guidelines:
- date: Extract check-in date in YYYY-MM-DD format
- location: Full address if available, otherwise city/area name
- accommodation: Name of hotel, campsite, ferry, etc.
- status: "Booked" if confirmed, "Unconfirmed" otherwise
- type: "roofed" for hotels/motels, "camp" for camping/caravan parks, "enroute" for transport/activities
- travelTime: Estimate based on transport type or leave empty
- activities: What's planned for this day/booking
- notes: Booking numbers, guest details, special instructions

Text to parse:
${text}

Return only valid JSON as described above.`;
  }

  async callGemini(prompt) {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + this.geminiApiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      // Gemini returns candidates[0].content.parts[0].text
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      // Remove any markdown code block formatting
      const cleanContent = content.replace(/```json\n?|\n?```/g, '');
      try {
        return JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Failed to parse Gemini response as JSON:', content);
        throw new Error('LLM returned invalid JSON format');
      }
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  mockParse(text) {
    console.log('Using improved mock parser for text:', text.substring(0, 200) + '...');
    // Split lines and scan for date lines
    // Remove summary, 'View site details', 'km', and other non-place lines
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .filter(l =>
        !l.match(/^\d+ ?km( to end of trip)?$/i) &&
        !l.match(/^View site details$/i) &&
        !l.match(/^routing$/i) &&
        !l.match(/^(\d+ Places|\d{1,2} [A-Za-z]{3,9} \d{4} to \d{1,2} [A-Za-z]{3,9} \d{4}|\d+km to end of trip)$/i)
      );
    const dateRegex = /^(\d{1,2} [A-Za-z]{3,9} \d{4})$/;
    const items = [];
  // Removed unused variables lastPlace, lastAddress, lastAccommodation
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (dateRegex.test(line)) {
        // Look back for place/accommodation/address
        let place = null, address = null;
        if (i >= 2) {
          // Assume: [address], [place], [date]
          place = lines[i-1];
          address = lines[i-2];
        } else if (i >= 1) {
          place = lines[i-1];
        }
        // If address looks like a street or has a number, keep, else swap
        if (address && !address.match(/\d+|road|rd|drive|dr|tasman|highway|hwy|avenue|ave|street|st|lane|ln|boulevard|blvd|access/i)) {
          // If address doesn't look like an address, treat as part of place
          place = address ? address + ' ' + (place || '') : (place || '');
          address = '';
        }
        // Determine type
        let type = 'roofed';
        if (/camp|campsite|caravan|rv|park|lagoon|green|bay|harbour|river|lake|bluff|trial|wilderness/i.test((place || '').toLowerCase())) {
          type = 'camp';
        }
        // Format date
        const [day, monthStr, year] = line.split(' ');
        const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].findIndex(m => m === monthStr.toLowerCase().slice(0,3)) + 1;
        const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        items.push({
          date,
          location: address || place || 'Location',
          accommodation: place || 'Accommodation',
          status: 'Unconfirmed',
          type,
          travelTime: '',
          activities: '',
          notes: 'Extracted from itinerary text.'
        });
      }
    }
    // Fallback: if no items found, return a single generic item
    if (items.length === 0) {
      return {
        date: new Date().toISOString().split('T')[0],
        location: 'Location from PDF',
        accommodation: 'Accommodation from PDF',
        status: 'Unconfirmed',
        type: 'roofed',
        travelTime: '',
        activities: `Activities extracted from PDF content`,
        notes: 'Extracted from PDF.'
      };
    }
    return items;
  }
}

// Export singleton instance
export const llmService = new LLMService();
