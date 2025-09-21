// Minimal LLM service stub
// Provides the methods the app expects, with API calls and prompt fallback.

export class LLMService {
  constructor() {
    this.huggingFaceApiKey = process.env.REACT_APP_HUGGINGFACE_API_KEY || '';
    this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    this.geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
  }

  buildPrompt(text, profile = {}) {
    return `Parse travel booking information into JSON format.

INPUT TEXT:
${text}

INSTRUCTIONS:
1. Extract booking/accommodation information from the text
2. Return ONLY a JSON array - no explanations, no markdown
3. Each booking should be an object with these exact fields:
   - date: YYYY-MM-DD format (check-in date)
   - location: Full address or city name
   - title: Hotel/campsite name
   - status: "Booked" or "Unconfirmed"
   - type: "roofed" (hotels), "camp" (campsites), or "enroute" (transport)
   - activities: Description of planned activities
   - notes: Booking numbers, guest details, special requests
 4. For bookings that span multiple dates, OUTPUT ONE ENTRY PER DATE covered by the booking. Duplicate booking-level fields (location, title, status, type, activities, notes) for each date entry. If the text indicates a checkout morning for the end date, exclude the checkout date; if it clearly includes an overnight stay through the end date, include it.
TRAVEL PROFILE:
- Adults: ${profile.adults || 'Not specified'}
- Children: ${profile.children || 'Not specified'}
- Interests: ${Array.isArray(profile.interests) ? profile.interests.join(', ') : 'Not specified'}
- Diet: ${profile.diet || 'Not specified'}

OUTPUT FORMAT:
Return a JSON array like this:
[{"date":"2025-12-24","location":"Address","title":"Hotel Name","status":"Booked","type":"roofed","activities":"Description","notes":"Details"}]`;
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

    return `${this.buildPrompt(text, profile)}

EXAMPLES:
1) Single-date booking
Input: "Booked at Beach Hotel, Sydney for Dec 25, 2025. Booking #12345"
Output: [{"date":"2025-12-25","location":"Sydney","title":"Beach Hotel","status":"Booked","type":"roofed","activities":"Hotel stay","notes":"Booking #12345"}]
2) Multi-night booking (produce one entry per date)
Input: "Booked at Beach Hotel, Sydney for Dec 25 to Dec 27th, 2025. Booking #12345"
Output: [{"date":"2025-12-25","location":"Sydney","title":"Beach Hotel","status":"Booked","type":"roofed","activities":"Hotel stay","notes":"Booking #12345"},{"date":"2025-12-26","location":"Sydney","title":"Beach Hotel","status":"Booked","type":"roofed","activities":"Hotel stay","notes":"Booking #12345"},{"date":"2025-12-27","location":"Sydney","title":"Beach Hotel","status":"Booked","type":"roofed","activities":"Hotel stay","notes":"Booking #12345"}]
REQUIRED: Return ONLY the JSON array, nothing else.`;
  }

  async parseBookingInformation(text = '', profile = {}) {
    const prompt = this.buildPromptWithExample(text, profile);
    if (this.huggingFaceApiKey) {
      try {
        const result = await this.callHuggingFace(prompt);
        if (result && result.length) return result;
      } catch (error) {
        console.error('Hugging Face API failed:', error.message);
      }
    }
    // If API failed or no key, provide the prompt for manual use
    return { type: 'prompt', prompt };
  }

  async callHuggingFace(prompt) {
    const models = [
      'microsoft/DialoGPT-medium',
      'distilgpt2',
      'google/flan-t5-base',
      'microsoft/DialoGPT-small',
      'gpt2'
    ];

    for (const modelName of models) {
      try {
        console.log(`Trying Hugging Face model: ${modelName}`);
        const response = await fetch(`https://api-inference.huggingface.co/models/${modelName}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.huggingFaceApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: `Parse this travel booking text into JSON format. Return only a JSON array with booking details.\n${prompt}`,
            parameters: {
              max_new_tokens: 600,
              temperature: 0.1,
              do_sample: true,
              return_full_text: false,
              repetition_penalty: 1.2,
              num_beams: 1,
              early_stopping: true
            },
            options: {
              wait_for_model: true,
              use_cache: true
            }
          })
        });

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = `<unable to read response body: ${e.message}>`;
          }
          console.warn(`Model ${modelName} failed: HTTP ${response.status} - ${errorText.substring(0,200)}`);
          continue;
        }

        const data = await response.json();
        console.log(`Model ${modelName} raw response:`, data);
        let generatedText = '';
        if (Array.isArray(data) && data[0]?.generated_text) {
          generatedText = data[0].generated_text;
        } else if (data.generated_text) {
          generatedText = data.generated_text;
        } else if (typeof data === 'string') {
          generatedText = data;
        }

        console.log(`Model ${modelName} generated text:`, generatedText.substring(0, 300) + '...');

        if (!generatedText.trim()) {
          console.warn(`Model ${modelName} returned empty response`);
          continue;
        }

        const result = this.parseHuggingFaceResponse(generatedText);
        if (result) {
          console.log(`Model ${modelName} successfully parsed response`);
          return result;
        }

      } catch (error) {
        console.warn(`Model ${modelName} error:`, error.message);
        continue;
      }
    }

    throw new Error('All Hugging Face models failed to generate valid JSON');
  }

  parseHuggingFaceResponse(generatedText) {
    let parsed = null;

    try {
      parsed = JSON.parse(generatedText.trim());
      console.log('Direct JSON parse successful');
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (directParseError) {
      console.log('Direct parse failed, trying extraction methods');
    }

    const jsonMatches = generatedText.match(/\[[\s\S]*?\]/g);
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          parsed = JSON.parse(match);
          console.log('JSON extraction successful from match');
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (matchError) {
          continue;
        }
      }
    }

    const startIndex = generatedText.indexOf('[');
    const endIndex = generatedText.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonCandidate = generatedText.substring(startIndex, endIndex + 1);
      try {
        parsed = JSON.parse(jsonCandidate);
        console.log('JSON extraction successful from substring');
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (substringError) {
        console.log('Substring parse failed');
      }
    }

    return null;
  }

  // Simple mock parser that returns one normalized item containing required fields.
  mockParse(text = '', profile = {}) {
    const firstLine = (text || '').split(/\r?\n/).find(l => l.trim().length > 0) || '';
    const location = firstLine.slice(0, 120);

    return [
      {
        date: '',
        location: location || '',
        title: '',
        status: 'Unconfirmed',
        type: 'roofed',
        activities: '',
        notes: ''
      }
    ];
  }
}

export const llmService = new LLMService();