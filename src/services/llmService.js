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
    console.log('Using mock parser for text:', text.substring(0, 200) + '...');
    
    // Simple pattern matching for demonstration
    const patterns = {
      dates: /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/g,
      accommodations: /(hotel|motel|resort|camping|campsite|ferry|hostel|lodge|b&b|bnb|apartment)/i,
      locations: /(avenue|ave|street|st|road|rd|drive|dr|way|lane|ln|boulevard|blvd|highway|hwy)/i,
      bookingNumbers: /(booking|confirmation|reference)[\s#:]*([a-z0-9]{6,})/i
    };

    const foundDates = text.match(patterns.dates) || [];
    const foundBookingNumbers = text.match(patterns.bookingNumbers) || [];

    // Extract a meaningful location
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let location = 'Location from PDF';
    for (const line of lines) {
      if (patterns.locations.test(line) && line.length < 100) {
        location = line.trim();
        break;
      }
    }

    // Extract accommodation name
    let accommodation = 'Accommodation from PDF';
    for (const line of lines) {
      if (patterns.accommodations.test(line) && line.length < 80) {
        accommodation = line.trim();
        break;
      }
    }

    // Determine type based on accommodation
    let type = 'roofed';
    if (/camping|campsite|caravan|rv|camp/i.test(accommodation.toLowerCase())) {
      type = 'camp';
    } else if (/ferry|transport|flight|bus|train/i.test(accommodation.toLowerCase())) {
      type = 'enroute';
    }

    // Format date
    let date = new Date().toISOString().split('T')[0];
    if (foundDates.length > 0) {
      try {
        const parsedDate = new Date(foundDates[0]);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {
        // Keep default date if parsing fails
      }
    }

    // Build notes
    let notes = 'Extracted from PDF';
    if (foundBookingNumbers.length > 0) {
      notes += `. Booking reference: ${foundBookingNumbers[0]}`;
    }
    if (text.length > 200) {
      notes += `. Original text: ${text.substring(0, 150)}...`;
    }

    return {
      date,
      location,
      accommodation,
      status: 'Unconfirmed',
      type,
      travelTime: '',
      activities: `Activities extracted from PDF content`,
      notes
    };
  }
}

// Export singleton instance
export const llmService = new LLMService();
