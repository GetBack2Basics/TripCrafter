// LLM service for parsing PDF content into trip data format

export class LLMService {
  constructor() {
    this.geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
  }

  async parseBookingInformation(text, profile = {}) {
    const prompt = this.buildPromptWithExample(text, profile);
    if (this.geminiApiKey && this.geminiApiKey !== 'your_gemini_api_key_here') {
      return await this.callGemini(prompt);
    } else {
      // Fallback to mock parsing for demo purposes
      return this.mockParse(text, profile);
    }
  }

  buildPrompt(text, profile = {}) {
    return `You are an expert travel assistant. Parse the following travel booking information and extract structured data.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation, no extra text.

Return an ARRAY of objects, one per day or booking, in this exact format:
[
  {
    "date": "YYYY-MM-DD",
    "location": "Full address or location name",
  "title": "Hotel/accommodation name",
  "status": "Booked|Unconfirmed|Cancelled|Not booked", 
  "type": "roofed|camp|enroute",
    "activities": "Activities or description for the day",
    "notes": "Any additional notes, booking numbers, guest details"
  },
  ...
]

Field Guidelines:
- date: Extract check-in date in YYYY-MM-DD format
- location: Full address if available, otherwise city/area name
- accommodation: Name of hotel, campsite, ferry, etc.
 - title: Name/title of the hotel, campsite, ferry, or accommodation for the day
- status: "Booked" if confirmed, "Unconfirmed" otherwise
- type: "roofed" for hotels/motels, "camp" for camping/caravan parks, "enroute" for transport/activities
- activities: What's planned for this day/booking
- notes: Booking numbers, guest details, special instructions
 - activities: If the source does not clearly state activities, you may SUGGEST activities. When suggesting, use the phrasing: "Suggest activities in [Location] for [profile description]" and wrap suggestions with [AI suggestion]...[/AI suggestion]. Use the provided trip profile below to tailor suggestions.
 - notes: Booking numbers, guest details, special instructions. If there is no booking or notes information in the source, leave this field as an empty string ("").

Trip profile (use these values to tailor activity suggestions):
Number of adults: ${profile.adults || ''}
Number under 16: ${profile.children || ''}
Interests: ${Array.isArray(profile.interests) ? profile.interests.join(', ') : ''}
Food / diet: ${profile.diet || ''}

Text to parse:
${text}

Return only valid JSON as described above.`;
  }

  // Guidance: if activities or notes cannot be reliably extracted from the source,
  // the LLM should generate plausible content and clearly mark it as a suggestion by
  // wrapping the text with [AI suggestion]...[/AI suggestion]. For example:
  // "activities": "[AI suggestion]Coastal walk and beach time[/AI suggestion]"
  // This makes it clear which fields were inferred by the AI and which came from the source.

  // A helper to embed an example in the prompt for better LLM outputs
  buildPromptWithExample(text, profile = {}) {
    const example = [
      {
        "date": "2025-12-24",
        "location": "Scamander Sanctuary Holiday Park, Winifred Dr, Scamander TAS 7215, Australia",
        "title": "Scamander Sanctuary Holiday Park",
        "status": "Booked",
        "type": "camp",
        "activities": "Christmas Eve stay, coastal walk",
        "notes": "Booking #27366. 2 adults, 1 vehicle."
      }
    ];

  return this.buildPrompt(text, profile) + "\n\nExample output:\n" + JSON.stringify(example, null, 2) + "\n\nReturn only the JSON array exactly as shown above.";
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

  mockParse(text, profile = {}) {
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
        // Build activities suggestion using profile if present
        const profileDesc = [];
        if (profile.adults) profileDesc.push(`${profile.adults} adults`);
        if (profile.children) profileDesc.push(`${profile.children} children`);
        if (profile.interests && Array.isArray(profile.interests) && profile.interests.length) profileDesc.push(`interests: ${profile.interests.join(', ')}`);
        if (profile.diet) profileDesc.push(`diet: ${profile.diet}`);
        const profileText = profileDesc.length ? profileDesc.join('; ') : 'general travellers';

        // If the source text contains booking/reservation identifiers, include a notes suggestion; otherwise leave notes blank
        const hasBookingInfo = /booking|booking #|reservation|reference|confirmation number|confirmation|PNR|booking ref/i.test(text);

        items.push({
          date,
          location: address || place || 'Location',
          title: place || 'Accommodation',
          status: 'Unconfirmed',
          type,
          activities: `[AI suggestion]Suggest activities in ${place || 'the area'} for ${profileText}[/AI suggestion]`,
          notes: hasBookingInfo ? '[AI suggestion]Booking details found in source — verify and extract booking numbers[/AI suggestion]' : ''
        });
      }
    }
    // Fallback: if no items found, return a single generic item
    if (items.length === 0) {
      const profileDesc = [];
      if (profile.adults) profileDesc.push(`${profile.adults} adults`);
      if (profile.children) profileDesc.push(`${profile.children} children`);
      if (profile.interests && Array.isArray(profile.interests) && profile.interests.length) profileDesc.push(`interests: ${profile.interests.join(', ')}`);
      if (profile.diet) profileDesc.push(`diet: ${profile.diet}`);
      const profileText = profileDesc.length ? profileDesc.join('; ') : 'general travellers';

      const hasBookingInfo = /booking|booking #|reservation|reference|confirmation number|confirmation|PNR|booking ref/i.test(text);

      return {
        date: new Date().toISOString().split('T')[0],
        location: 'Location from PDF',
        title: 'Accommodation from PDF',
        status: 'Unconfirmed',
        type: 'roofed',
        activities: `[AI suggestion]Suggest activities in the area for ${profileText}[/AI suggestion]`,
        notes: hasBookingInfo ? '[AI suggestion]Booking details found in source — verify and extract booking numbers[/AI suggestion]' : ''
      };
    }
    return items;
  }
}

// Export singleton instance
export const llmService = new LLMService();
