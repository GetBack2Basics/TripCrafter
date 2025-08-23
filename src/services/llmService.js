// LLM service for parsing PDF content into trip data format

export class LLMService {
  constructor() {
    this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;
  }

  async parseBookingInformation(text) {
    const prompt = this.buildPrompt(text);
    
    if (this.openaiApiKey && this.openaiApiKey !== 'your_openai_api_key_here') {
      return await this.callOpenAI(prompt);
    } else {
      // Fallback to mock parsing for demo purposes
      return this.mockParse(text);
    }
  }

  buildPrompt(text) {
    return `You are an expert travel assistant. Parse the following travel booking information and extract structured data.

IMPORTANT: Return ONLY valid JSON with no additional text, formatting, or explanation.

Expected format for single booking:
{
  "date": "YYYY-MM-DD",
  "location": "Full address or location name",
  "accommodation": "Hotel/accommodation name",
  "status": "Booked|Unconfirmed|Cancelled|Not booked", 
  "type": "roofed|camp|enroute",
  "travelTime": "Estimated travel time (e.g., '2h 30m')",
  "activities": "Activities or description for the day",
  "notes": "Any additional notes, booking numbers, guest details"
}

For multiple bookings, return an array of objects.

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

Return only JSON:`;
  }

  async callOpenAI(prompt) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that parses travel booking information into structured JSON data. Always return valid JSON only, no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Remove any markdown code block formatting
      const cleanContent = content.replace(/```json\n?|\n?```/g, '');
      
      try {
        return JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response as JSON:', content);
        throw new Error('LLM returned invalid JSON format');
      }
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  }

  mockParse(text) {
    console.log('Using improved mock parser for text:', text.substring(0, 200) + '...');
    // Split lines and scan for date lines
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const dateRegex = /^(\d{1,2} [A-Za-z]{3,9} \d{4})$/;
    const items = [];
    let lastPlace = null;
    let lastAddress = null;
    let lastAccommodation = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (dateRegex.test(line)) {
        // Look back for place/accommodation/address
        let j = i - 1;
        let place = null, address = null, accommodation = null;
        while (j >= 0 && (!place || !address)) {
          if (!place && lines[j].match(/hotel|park|camp|campsite|caravan|motel|resort|lodge|inn|apartment|stand|campground|site|harbour|river|lake|bay|bluff|trial|wilderness|information|green|lagoon|track|road|rd|drive|dr|tasman|highway|hwy|avenue|ave|street|st|lane|ln|boulevard|blvd/i)) {
            place = lines[j];
          } else if (!address && lines[j].match(/\d+|road|rd|drive|dr|tasman|highway|hwy|avenue|ave|street|st|lane|ln|boulevard|blvd|access/i)) {
            address = lines[j];
          }
          j--;
        }
        accommodation = place || address || 'Accommodation';
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
          accommodation,
          status: 'Unconfirmed',
          type,
          travelTime: '',
          activities: '',
          notes: 'Extracted from itinerary text.'
        });
        lastPlace = place;
        lastAddress = address;
        lastAccommodation = accommodation;
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
