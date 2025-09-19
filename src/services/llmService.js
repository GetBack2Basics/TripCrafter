// LLM service for parsing PDF content into trip data format// LLM service for parsing PDF content into trip data format// LLM service for parsing PDF content into trip data format

// Uses Hugging Face API for free AI processing with OpenAI and mock parser fallbacks

// Uses Hugging Face API for free AI processing with OpenAI and mock parser fallbacks

export class LLMService {

  constructor() {export class LLMService {

    this.huggingFaceApiKey = process.env.REACT_APP_HUGGINGFACE_API_KEY;

    this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;export class LLMService {  constructor() {

  }

  constructor() {    this.geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;

  async parseBookingInformation(text, profile = {}) {

    const prompt = this.buildPromptWithExample(text, profile);    this.huggingFaceApiKey = process.env.REACT_APP_HUGGINGFACE_API_KEY;  }



    // Try Hugging Face first (free)    this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;

    if (this.huggingFaceApiKey && this.huggingFaceApiKey !== 'your_huggingface_api_key_here') {

      try {  }  async parseBookingInformation(text, profile = {}) {

        console.log('Trying Hugging Face API for PDF parsing...');

        const result = await this.callHuggingFace(prompt);    const prompt = this.buildPromptWithExample(text, profile);

        if (result && Array.isArray(result) && result.length > 0) {

          console.log('Hugging Face API succeeded');  async parseBookingInformation(text, profile = {}) {    if (this.geminiApiKey && this.geminiApiKey !== 'your_gemini_api_key_here') {

          return result;

        }    const prompt = this.buildPromptWithExample(text, profile);      return await this.callGemini(prompt);

      } catch (error) {

        console.warn('Hugging Face API failed, trying fallback:', error.message);    } else {

      }

    }    // Try Hugging Face first (free)      // Fallback to mock parsing for demo purposes



    // Try OpenAI as secondary fallback (paid but more reliable)    if (this.huggingFaceApiKey && this.huggingFaceApiKey !== 'your_huggingface_api_key_here') {      return this.mockParse(text, profile);

    if (this.openaiApiKey && this.openaiApiKey !== 'your_openai_api_key_here') {

      try {      try {    }

        console.log('Trying OpenAI API as fallback...');

        const result = await this.callOpenAI(prompt);        console.log('Trying Hugging Face API for PDF parsing...');  }

        if (result && Array.isArray(result) && result.length > 0) {

          console.log('OpenAI API succeeded');        const result = await this.callHuggingFace(prompt);

          return result;

        }        if (result && Array.isArray(result) && result.length > 0) {  buildPrompt(text, profile = {}) {

      } catch (error) {

        console.warn('OpenAI API failed, using mock parser:', error.message);          console.log('Hugging Face API succeeded');    return `You are an expert travel assistant. Parse the following travel booking information and extract structured data.

      }

    }          return result;



    // Final fallback to mock parsing        }IMPORTANT: Return ONLY valid JSON, no markdown, no explanation, no extra text.

    console.log('Using mock parser as final fallback');

    return this.mockParse(text, profile);      } catch (error) {

  }

        console.warn('Hugging Face API failed, trying fallback:', error.message);Return an ARRAY of objects, one per day or booking, in this exact format:

  buildPrompt(text, profile = {}) {

    return `You are an expert travel assistant. Parse the following travel booking information and extract structured data.      }[



IMPORTANT: Return ONLY valid JSON, no markdown, no explanation, no extra text.    }  {



Return an ARRAY of objects, one per day or booking, in this exact format:    "date": "YYYY-MM-DD",

[

  {    // Try OpenAI as secondary fallback (paid but more reliable)    "location": "Full address or location name",

    "date": "YYYY-MM-DD",

    "location": "Full address or location name",    if (this.openaiApiKey && this.openaiApiKey !== 'your_openai_api_key_here') {  "title": "Hotel/accommodation name",

    "title": "Hotel/accommodation name",

    "status": "Booked|Unconfirmed|Cancelled|Not booked",      try {  "status": "Booked|Unconfirmed|Cancelled|Not booked", 

    "type": "roofed|camp|enroute",

    "activities": "Activities or description for the day",        console.log('Trying OpenAI API as fallback...');  "type": "roofed|camp|enroute",

    "notes": "Any additional notes, booking numbers, guest details"

  },        const result = await this.callOpenAI(prompt);    "activities": "Activities or description for the day",

  ...

]        if (result && Array.isArray(result) && result.length > 0) {    "notes": "Any additional notes, booking numbers, guest details"



Field Guidelines:          console.log('OpenAI API succeeded');  },

- date: Extract check-in date in YYYY-MM-DD format

- location: Full address if available, otherwise city/area name          return result;  ...

- title: Name/title of the hotel, campsite, ferry, or accommodation for the day

- status: "Booked" if confirmed, "Unconfirmed" otherwise        }]

- type: "roofed" for hotels/motels, "camp" for camping/caravan parks, "enroute" for transport/activities

- activities: What's planned for this day/booking      } catch (error) {

- notes: Booking numbers, guest details, special instructions

        console.warn('OpenAI API failed, using mock parser:', error.message);Field Guidelines:

Trip profile (use these values to tailor activity suggestions):

Number of adults: ${profile.adults || ''}      }- date: Extract check-in date in YYYY-MM-DD format

Number under 16: ${profile.children || ''}

Interests: ${Array.isArray(profile.interests) ? profile.interests.join(', ') : ''}    }- location: Full address if available, otherwise city/area name

Food / diet: ${profile.diet || ''}

- accommodation: Name of hotel, campsite, ferry, etc.

Text to parse:

${text}    // Final fallback to mock parsing - title: Name/title of the hotel, campsite, ferry, or accommodation for the day



Return only valid JSON as described above.`;    console.log('Using mock parser as final fallback');- status: "Booked" if confirmed, "Unconfirmed" otherwise

  }

    return this.mockParse(text, profile);- type: "roofed" for hotels/motels, "camp" for camping/caravan parks, "enroute" for transport/activities

  buildPromptWithExample(text, profile = {}) {

    const example = [  }- activities: What's planned for this day/booking

      {

        "date": "2025-12-24",- notes: Booking numbers, guest details, special instructions

        "location": "Scamander Sanctuary Holiday Park, Winifred Dr, Scamander TAS 7215, Australia",

        "title": "Scamander Sanctuary Holiday Park",  buildPrompt(text, profile = {}) { - activities: If the source does not clearly state activities, you may SUGGEST activities. When suggesting, use the phrasing: "Suggest activities in [Location] for [profile description]" and wrap suggestions with [AI suggestion]...[/AI suggestion]. Use the provided trip profile below to tailor suggestions.

        "status": "Booked",

        "type": "camp",    return `You are an expert travel assistant. Parse the following travel booking information and extract structured data. - notes: Booking numbers, guest details, special instructions. If there is no booking or notes information in the source, leave this field as an empty string ("").

        "activities": "Christmas Eve stay, coastal walk",

        "notes": "Booking #27366. 2 adults, 1 vehicle."

      }

    ];IMPORTANT: Return ONLY valid JSON, no markdown, no explanation, no extra text.Trip profile (use these values to tailor activity suggestions):



    return this.buildPrompt(text, profile) + "\n\nExample output:\n" + JSON.stringify(example, null, 2) + "\n\nReturn only the JSON array exactly as shown above.";Number of adults: ${profile.adults || ''}

  }

Return an ARRAY of objects, one per day or booking, in this exact format:Number under 16: ${profile.children || ''}

  async callHuggingFace(prompt) {

    try {[Interests: ${Array.isArray(profile.interests) ? profile.interests.join(', ') : ''}

      // Using a free text generation model from Hugging Face

      const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {  {Food / diet: ${profile.diet || ''}

        method: 'POST',

        headers: {    "date": "YYYY-MM-DD",

          'Authorization': `Bearer ${this.huggingFaceApiKey}`,

          'Content-Type': 'application/json'    "location": "Full address or location name",Text to parse:

        },

        body: JSON.stringify({    "title": "Hotel/accommodation name",${text}

          inputs: prompt,

          parameters: {    "status": "Booked|Unconfirmed|Cancelled|Not booked",

            max_new_tokens: 1000,

            temperature: 0.1,    "type": "roofed|camp|enroute",Return only valid JSON as described above.`;

            do_sample: false,

            return_full_text: false    "activities": "Activities or description for the day",  }

          }

        })    "notes": "Any additional notes, booking numbers, guest details"

      });

  },  // Guidance: if activities or notes cannot be reliably extracted from the source,

      if (!response.ok) {

        const errorData = await response.json();  ...  // the LLM should generate plausible content and clearly mark it as a suggestion by

        throw new Error(`Hugging Face API error: ${errorData.error || response.statusText}`);

      }]  // wrapping the text with [AI suggestion]...[/AI suggestion]. For example:



      const data = await response.json();  // "activities": "[AI suggestion]Coastal walk and beach time[/AI suggestion]"

      console.log('Hugging Face raw response:', data);

Field Guidelines:  // This makes it clear which fields were inferred by the AI and which came from the source.

      // Extract the generated text

      const generatedText = data[0]?.generated_text || '';- date: Extract check-in date in YYYY-MM-DD format



      // Try to extract JSON from the response- location: Full address if available, otherwise city/area name  // A helper to embed an example in the prompt for better LLM outputs

      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {- title: Name/title of the hotel, campsite, ferry, or accommodation for the day  buildPromptWithExample(text, profile = {}) {

        try {

          const parsed = JSON.parse(jsonMatch[0]);- status: "Booked" if confirmed, "Unconfirmed" otherwise    const example = [

          if (Array.isArray(parsed)) {

            return parsed;- type: "roofed" for hotels/motels, "camp" for camping/caravan parks, "enroute" for transport/activities      {

          }

        } catch (parseError) {- activities: What's planned for this day/booking        "date": "2025-12-24",

          console.warn('Failed to parse JSON from Hugging Face response');

        }- notes: Booking numbers, guest details, special instructions        "location": "Scamander Sanctuary Holiday Park, Winifred Dr, Scamander TAS 7215, Australia",

      }

        "title": "Scamander Sanctuary Holiday Park",

      // If JSON extraction fails, fall back to mock parsing

      throw new Error('Could not extract valid JSON from Hugging Face response');Trip profile (use these values to tailor activity suggestions):        "status": "Booked",



    } catch (error) {Number of adults: ${profile.adults || ''}        "type": "camp",

      console.error('Hugging Face API call failed:', error);

      throw error;Number under 16: ${profile.children || ''}        "activities": "Christmas Eve stay, coastal walk",

    }

  }Interests: ${Array.isArray(profile.interests) ? profile.interests.join(', ') : ''}        "notes": "Booking #27366. 2 adults, 1 vehicle."



  async callOpenAI(prompt) {Food / diet: ${profile.diet || ''}      }

    try {

      const response = await fetch('https://api.openai.com/v1/chat/completions', {    ];

        method: 'POST',

        headers: {Text to parse:

          'Authorization': `Bearer ${this.openaiApiKey}`,

          'Content-Type': 'application/json'${text}  return this.buildPrompt(text, profile) + "\n\nExample output:\n" + JSON.stringify(example, null, 2) + "\n\nReturn only the JSON array exactly as shown above.";

        },

        body: JSON.stringify({  }

          model: 'gpt-3.5-turbo',

          messages: [Return only valid JSON as described above.`;

            {

              role: 'system',  }  async callGemini(prompt) {

              content: 'You are a travel booking parser. Return only valid JSON arrays.'

            },    try {

            {

              role: 'user',  buildPromptWithExample(text, profile = {}) {      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + this.geminiApiKey, {

              content: prompt

            }    const example = [        method: 'POST',

          ],

          temperature: 0.1,      {        headers: {

          max_tokens: 1000

        })        "date": "2025-12-24",          'Content-Type': 'application/json'

      });

        "location": "Scamander Sanctuary Holiday Park, Winifred Dr, Scamander TAS 7215, Australia",        },

      if (!response.ok) {

        const errorData = await response.json();        "title": "Scamander Sanctuary Holiday Park",        body: JSON.stringify({

        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);

      }        "status": "Booked",          contents: [{ parts: [{ text: prompt }] }]



      const data = await response.json();        "type": "camp",        })

      const content = data.choices?.[0]?.message?.content?.trim() || '';

        "activities": "Christmas Eve stay, coastal walk",      });

      // Remove any markdown code block formatting

      const cleanContent = content.replace(/```json\n?|\n?```/g, '');        "notes": "Booking #27366. 2 adults, 1 vehicle."



      try {      }      if (!response.ok) {

        const parsed = JSON.parse(cleanContent);

        if (Array.isArray(parsed)) {    ];        const errorData = await response.json();

          return parsed;

        } else if (typeof parsed === 'object') {        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);

          // If it's a single object, wrap it in an array

          return [parsed];    return this.buildPrompt(text, profile) + "\n\nExample output:\n" + JSON.stringify(example, null, 2) + "\n\nReturn only the JSON array exactly as shown above.";      }

        }

      } catch (parseError) {  }

        console.error('Failed to parse OpenAI response as JSON:', cleanContent);

        throw new Error('OpenAI returned invalid JSON format');      const data = await response.json();

      }

  async callHuggingFace(prompt) {      // Gemini returns candidates[0].content.parts[0].text

      throw new Error('OpenAI returned unexpected response format');

    try {      const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    } catch (error) {

      console.error('OpenAI API call failed:', error);      // Using a free text generation model from Hugging Face      // Remove any markdown code block formatting

      throw error;

    }      const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {      const cleanContent = content.replace(/```json\n?|\n?```/g, '');

  }

        method: 'POST',      try {

  mockParse(text, profile = {}) {

    console.log('Using improved mock parser for text:', text.substring(0, 200) + '...');        headers: {        return JSON.parse(cleanContent);



    // Split lines and scan for date lines          'Authorization': `Bearer ${this.huggingFaceApiKey}`,      } catch (parseError) {

    const lines = text.split('\n')

      .map(l => l.trim())          'Content-Type': 'application/json'        console.error('Failed to parse Gemini response as JSON:', content);

      .filter(l => l.length > 0)

      .filter(l =>        },        throw new Error('LLM returned invalid JSON format');

        !l.match(/^\d+ ?km( to end of trip)?$/i) &&

        !l.match(/^View site details$/i) &&        body: JSON.stringify({      }

        !l.match(/^routing$/i) &&

        !l.match(/^(\d+ Places|\d{1,2} [A-Za-z]{3,9} \d{4} to \d{1,2} [A-Za-z]{3,9} \d{4}|\d+km to end of trip)$/i)          inputs: prompt,    } catch (error) {

      );

          parameters: {      console.error('Gemini API call failed:', error);

    const dateRegex = /^(\d{1,2} [A-Za-z]{3,9} \d{4})$/;

    const items = [];            max_new_tokens: 1000,      throw error;



    for (let i = 0; i < lines.length; i++) {            temperature: 0.1,    }

      const line = lines[i];

      if (dateRegex.test(line)) {            do_sample: false,  }

        // Look back for place/accommodation/address

        let place = null, address = null;            return_full_text: false

        if (i >= 2) {

          place = lines[i-1];          }  mockParse(text, profile = {}) {

          address = lines[i-2];

        } else if (i >= 1) {        })    console.log('Using improved mock parser for text:', text.substring(0, 200) + '...');

          place = lines[i-1];

        }      });    // Split lines and scan for date lines



        // If address looks like a street or has a number, keep, else swap    // Remove summary, 'View site details', 'km', and other non-place lines

        if (address && !address.match(/\d+|road|rd|drive|dr|tasman|highway|hwy|avenue|ave|street|st|lane|ln|boulevard|blvd|access/i)) {

          place = address ? address + ' ' + (place || '') : (place || '');      if (!response.ok) {    const lines = text.split('\n')

          address = '';

        }        const errorData = await response.json();      .map(l => l.trim())



        // Determine type        throw new Error(`Hugging Face API error: ${errorData.error || response.statusText}`);      .filter(l => l.length > 0)

        let type = 'roofed';

        if (/camp|campsite|caravan|rv|park|lagoon|green|bay|harbour|river|lake|bluff|trial|wilderness/i.test((place || '').toLowerCase())) {      }      .filter(l =>

          type = 'camp';

        }        !l.match(/^\d+ ?km( to end of trip)?$/i) &&



        // Format date      const data = await response.json();        !l.match(/^View site details$/i) &&

        const [day, monthStr, year] = line.split(' ');

        const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].findIndex(m => m === monthStr.toLowerCase().slice(0,3)) + 1;      console.log('Hugging Face raw response:', data);        !l.match(/^routing$/i) &&

        const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

        !l.match(/^(\d+ Places|\d{1,2} [A-Za-z]{3,9} \d{4} to \d{1,2} [A-Za-z]{3,9} \d{4}|\d+km to end of trip)$/i)

        // Build activities suggestion using profile if present

        const profileDesc = [];      // Extract the generated text      );

        if (profile.adults) profileDesc.push(`${profile.adults} adults`);

        if (profile.children) profileDesc.push(`${profile.children} children`);      const generatedText = data[0]?.generated_text || '';    const dateRegex = /^(\d{1,2} [A-Za-z]{3,9} \d{4})$/;

        if (profile.interests && Array.isArray(profile.interests) && profile.interests.length) profileDesc.push(`interests: ${profile.interests.join(', ')}`);

        if (profile.diet) profileDesc.push(`diet: ${profile.diet}`);    const items = [];

        const profileText = profileDesc.length ? profileDesc.join('; ') : 'general travellers';

      // Try to extract JSON from the response  // Removed unused variables lastPlace, lastAddress, lastAccommodation

        const hasBookingInfo = /booking|booking #|reservation|reference|confirmation number|confirmation|PNR|booking ref/i.test(text);

      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);    for (let i = 0; i < lines.length; i++) {

        items.push({

          date,      if (jsonMatch) {      const line = lines[i];

          location: address || place || 'Location',

          title: place || 'Accommodation',        try {      if (dateRegex.test(line)) {

          status: 'Unconfirmed',

          type,          const parsed = JSON.parse(jsonMatch[0]);        // Look back for place/accommodation/address

          activities: `[AI suggestion]Suggest activities in ${place || 'the area'} for ${profileText}[/AI suggestion]`,

          notes: hasBookingInfo ? '[AI suggestion]Booking details found in source — verify and extract booking numbers[/AI suggestion]' : ''          if (Array.isArray(parsed)) {        let place = null, address = null;

        });

      }            return parsed;        if (i >= 2) {

    }

          }          // Assume: [address], [place], [date]

    // Fallback: if no items found, return a single generic item

    if (items.length === 0) {        } catch (parseError) {          place = lines[i-1];

      const profileDesc = [];

      if (profile.adults) profileDesc.push(`${profile.adults} adults`);          console.warn('Failed to parse JSON from Hugging Face response');          address = lines[i-2];

      if (profile.children) profileDesc.push(`${profile.children} children`);

      if (profile.interests && Array.isArray(profile.interests) && profile.interests.length) profileDesc.push(`interests: ${profile.interests.join(', ')}`);        }        } else if (i >= 1) {

      if (profile.diet) profileDesc.push(`diet: ${profile.diet}`);

      const profileText = profileDesc.length ? profileDesc.join('; ') : 'general travellers';      }          place = lines[i-1];



      const hasBookingInfo = /booking|booking #|reservation|reference|confirmation number|confirmation|PNR|booking ref/i.test(text);        }



      return [{      // If JSON extraction fails, fall back to mock parsing        // If address looks like a street or has a number, keep, else swap

        date: new Date().toISOString().split('T')[0],

        location: 'Location from PDF',      throw new Error('Could not extract valid JSON from Hugging Face response');        if (address && !address.match(/\d+|road|rd|drive|dr|tasman|highway|hwy|avenue|ave|street|st|lane|ln|boulevard|blvd|access/i)) {

        title: 'Accommodation from PDF',

        status: 'Unconfirmed',          // If address doesn't look like an address, treat as part of place

        type: 'roofed',

        activities: `[AI suggestion]Suggest activities in the area for ${profileText}[/AI suggestion]`,    } catch (error) {          place = address ? address + ' ' + (place || '') : (place || '');

        notes: hasBookingInfo ? '[AI suggestion]Booking details found in source — verify and extract booking numbers[/AI suggestion]' : ''

      }];      console.error('Hugging Face API call failed:', error);          address = '';

    }

      throw error;        }

    return items;

  }    }        // Determine type

}

  }        let type = 'roofed';

// Export singleton instance

export const llmService = new LLMService();        if (/camp|campsite|caravan|rv|park|lagoon|green|bay|harbour|river|lake|bluff|trial|wilderness/i.test((place || '').toLowerCase())) {

  async callOpenAI(prompt) {          type = 'camp';

    try {        }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {        // Format date

        method: 'POST',        const [day, monthStr, year] = line.split(' ');

        headers: {        const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].findIndex(m => m === monthStr.toLowerCase().slice(0,3)) + 1;

          'Authorization': `Bearer ${this.openaiApiKey}`,        const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

          'Content-Type': 'application/json'        // Build activities suggestion using profile if present

        },        const profileDesc = [];

        body: JSON.stringify({        if (profile.adults) profileDesc.push(`${profile.adults} adults`);

          model: 'gpt-3.5-turbo',        if (profile.children) profileDesc.push(`${profile.children} children`);

          messages: [        if (profile.interests && Array.isArray(profile.interests) && profile.interests.length) profileDesc.push(`interests: ${profile.interests.join(', ')}`);

            {        if (profile.diet) profileDesc.push(`diet: ${profile.diet}`);

              role: 'system',        const profileText = profileDesc.length ? profileDesc.join('; ') : 'general travellers';

              content: 'You are a travel booking parser. Return only valid JSON arrays.'

            },        // If the source text contains booking/reservation identifiers, include a notes suggestion; otherwise leave notes blank

            {        const hasBookingInfo = /booking|booking #|reservation|reference|confirmation number|confirmation|PNR|booking ref/i.test(text);

              role: 'user',

              content: prompt        items.push({

            }          date,

          ],          location: address || place || 'Location',

          temperature: 0.1,          title: place || 'Accommodation',

          max_tokens: 1000          status: 'Unconfirmed',

        })          type,

      });          activities: `[AI suggestion]Suggest activities in ${place || 'the area'} for ${profileText}[/AI suggestion]`,

          notes: hasBookingInfo ? '[AI suggestion]Booking details found in source — verify and extract booking numbers[/AI suggestion]' : ''

      if (!response.ok) {        });

        const errorData = await response.json();      }

        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);    }

      }    // Fallback: if no items found, return a single generic item

    if (items.length === 0) {

      const data = await response.json();      const profileDesc = [];

      const content = data.choices?.[0]?.message?.content?.trim() || '';      if (profile.adults) profileDesc.push(`${profile.adults} adults`);

      if (profile.children) profileDesc.push(`${profile.children} children`);

      // Remove any markdown code block formatting      if (profile.interests && Array.isArray(profile.interests) && profile.interests.length) profileDesc.push(`interests: ${profile.interests.join(', ')}`);

      const cleanContent = content.replace(/```json\n?|\n?```/g, '');      if (profile.diet) profileDesc.push(`diet: ${profile.diet}`);

      const profileText = profileDesc.length ? profileDesc.join('; ') : 'general travellers';

      try {

        const parsed = JSON.parse(cleanContent);      const hasBookingInfo = /booking|booking #|reservation|reference|confirmation number|confirmation|PNR|booking ref/i.test(text);

        if (Array.isArray(parsed)) {

          return parsed;      return {

        } else if (typeof parsed === 'object') {        date: new Date().toISOString().split('T')[0],

          // If it's a single object, wrap it in an array        location: 'Location from PDF',

          return [parsed];        title: 'Accommodation from PDF',

        }        status: 'Unconfirmed',

      } catch (parseError) {        type: 'roofed',

        console.error('Failed to parse OpenAI response as JSON:', cleanContent);        activities: `[AI suggestion]Suggest activities in the area for ${profileText}[/AI suggestion]`,

        throw new Error('OpenAI returned invalid JSON format');        notes: hasBookingInfo ? '[AI suggestion]Booking details found in source — verify and extract booking numbers[/AI suggestion]' : ''

      }      };

    }

      throw new Error('OpenAI returned unexpected response format');    return items;

  }

    } catch (error) {}

      console.error('OpenAI API call failed:', error);

      throw error;// Export singleton instance

    }export const llmService = new LLMService();

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