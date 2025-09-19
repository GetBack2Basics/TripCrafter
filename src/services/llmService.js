// LLM service for parsing PDF content into trip data format
// Uses Hugging Face API for free AI processing with OpenAI and mock parser fallbacks

export class LLMService {
  constructor() {
    this.huggingFaceApiKey = process.env.REACT_APP_HUGGINGFACE_API_KEY;
    this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;
    this.geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
  }

  async parseBookingInformation(text, profile = {}) {
    const prompt = this.buildPromptWithExample(text, profile);

    // Try Hugging Face first (free)
    if (this.huggingFaceApiKey && this.huggingFaceApiKey !== 'your_huggingface_api_key_here') {
      try {
        console.log('Trying Hugging Face API for PDF parsing...');
        const result = await this.callHuggingFace(prompt);
        if (result && Array.isArray(result) && result.length > 0) {
          console.log('Hugging Face API succeeded');
          return result;
        }
      } catch (error) {
        console.warn('Hugging Face API failed, trying fallback:', error.message);
      }
    }

    // Try Gemini as secondary fallback
    if (this.geminiApiKey && this.geminiApiKey !== 'your_gemini_api_key_here') {
      try {
        console.log('Trying Gemini API as fallback...');
        const result = await this.callGemini(prompt);
        if (result && Array.isArray(result) && result.length > 0) {
          console.log('Gemini API succeeded');
          return result;
        }
      } catch (error) {
        console.warn('Gemini API failed, trying fallback:', error.message);
      }
    }

    // Try OpenAI as secondary fallback (paid but more reliable)
    if (this.openaiApiKey && this.openaiApiKey !== 'your_openai_api_key_here') {
      try {
        console.log('Trying OpenAI API as fallback...');
        const result = await this.callOpenAI(prompt);
        if (result && Array.isArray(result) && result.length > 0) {
          console.log('OpenAI API succeeded');
          return result;
        }
      } catch (error) {
        console.warn('OpenAI API failed, using mock parser:', error.message);
      }
    }

    // Final fallback to mock parsing
    console.log('Using mock parser as final fallback');
    return this.mockParse(text, profile);
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
- title: Name/title of the hotel, campsite, ferry, or accommodation for the day
- status: "Booked" if confirmed, "Unconfirmed" otherwise
- type: "roofed" for hotels/motels, "camp" for camping/caravan parks, "enroute" for transport/activities
- activities: What's planned for this day/booking
- notes: Booking numbers, guest details, special instructions

Trip profile (use these values to tailor activity suggestions):
Number of adults: ${profile.adults || ''}
Number under 16: ${profile.children || ''}
Interests: ${Array.isArray(profile.interests) ? profile.interests.join(', ') : ''}
Food / diet: ${profile.diet || ''}

Text to parse:
${text}

Return only valid JSON as described above.`;
  }

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

  async callHuggingFace(prompt) {
    try {
      // Using a free text generation model from Hugging Face
      const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.huggingFaceApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.1,
            do_sample: false,
            return_full_text: false
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Hugging Face API error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('Hugging Face raw response:', data);

      // Extract the generated text
      const generatedText = data[0]?.generated_text || '';

      // Try to extract JSON from the response
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (parseError) {
          console.warn('Failed to parse JSON from Hugging Face response');
        }
      }

      // If JSON extraction fails, fall back to mock parsing
      throw new Error('Could not extract valid JSON from Hugging Face response');

    } catch (error) {
      console.error('Hugging Face API call failed:', error);
      throw error;
    }
  }

  async callOpenAI(prompt) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a travel booking parser. Return only valid JSON arrays.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';

      // Remove any markdown code block formatting
      const cleanContent = content.replace(/```json\n?|\n?```/g, '');

      try {
        const parsed = JSON.parse(cleanContent);
        if (Array.isArray(parsed)) {
          return parsed;
        } else if (typeof parsed === 'object') {
          // If it's a single object, wrap it in an array
          return [parsed];
        }
      } catch (parseError) {
        console.error('Failed to parse OpenAI response as JSON:', cleanContent);
        throw new Error('OpenAI returned invalid JSON format');
      }

      throw new Error('OpenAI returned unexpected response format');

    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
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
        throw new Error('Gemini returned invalid JSON format');
      }

    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  mockParse(text, profile = {}) {
    console.log('Using improved mock parser for text:', text.substring(0, 200) + '...');

    // Split lines and scan for date lines
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (dateRegex.test(line)) {
        // Look back for place/accommodation/address
        let place = null, address = null;
        if (i >= 2) {
          place = lines[i-1];
          address = lines[i-2];
        } else if (i >= 1) {
          place = lines[i-1];
        }

        // If address looks like a street or has a number, keep, else swap
        if (address && !address.match(/\d+|road|rd|drive|dr|tasman|highway|hwy|avenue|ave|street|st|lane|ln|boulevard|blvd|access/i)) {
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

      return [{
        date: new Date().toISOString().split('T')[0],
        location: 'Location from PDF',
        title: 'Accommodation from PDF',
        status: 'Unconfirmed',
        type: 'roofed',
        activities: `[AI suggestion]Suggest activities in the area for ${profileText}[/AI suggestion]`,
        notes: hasBookingInfo ? '[AI suggestion]Booking details found in source — verify and extract booking numbers[/AI suggestion]' : ''
      }];
    }

    return items;
  }
}

// Export singleton instance
export const llmService = new LLMService();
