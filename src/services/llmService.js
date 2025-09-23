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
1. Extract booking/accommodation and activity information from the text.
2. Return ONLY a JSON array - no explanations, no markdown.
3. Each item must be an object with these exact fields:
   - date: YYYY-MM-DD format (for calendar date).
   - location: A specific place string (city, neighbourhood or activity location). When the item is an activity (type 'enroute' or 'note'), include the activity location (e.g. "Paris - Montmartre" or "Rotorua - Whakarewarewa").
   - title: Accommodation or activity title (hotel name, "Hot Air Balloon Ride", "Train to Hobart", etc.).
   - status: "Booked" or "Unconfirmed".
  - type: "roofed" for accommodations, "camp" for campsites, "enroute" for travel segments and activities, "note" for suggestions/tips. Also use specific transport/activity types where helpful: "ferry", "drive" (car/drive), "flight" (plane/flight).
   - activities: Description of planned activities. When possible include time windows in HH:MM-HH:MM format (e.g. "06:00-09:00 hot air balloon, 10:00-12:00 brunch"). Separate multiple segments with commas.
   - notes: Additional details such as booking numbers, dietary notes, accessibility info, transport details, pacing constraints, etc.
4. When times are present in the source, extract and include them. Prefer a dedicated "time" field with a single time ("HH:MM") or an ISO 8601 timestamp for precise times. For time ranges prefer a "time_window" or include the window in the "activities" field as HH:MM-HH:MM. If no time information is present, date-only entries are acceptable.
5. Each distinct activity at a different location must be its own entry, even if it occurs on the same date. Maintain chronological order (morning -> lunch -> afternoon -> evening).
6. For multi-night accommodation bookings, OUTPUT ONE accommodation entry PER NIGHT (one date per night).
7. Ensure the generated itinerary spans the travel dates, includes an entry for each night of accommodation, aligns activities with traveler interests, and considers pace and constraints.

TRAVEL PROFILE:
- Adults: ${profile.adults || 'Not specified'}
- Children: ${profile.children || 'Not specified'}
- Interests: ${Array.isArray(profile.interests) ? profile.interests.join(', ') : 'Not specified'}
- Diet: ${profile.diet || 'Not specified'}

OUTPUT FORMAT EXAMPLE (JSON ONLY):
[{"date":"2025-07-15","time":"15:00","location":"Paris - 1st Arrondissement","title":"Central Hotel (night)","status":"Booked","type":"roofed","activities":"Check-in 15:00-16:00","notes":"Accessible room requested"},{"date":"2025-07-16","time_window":"06:00-09:00","location":"Paris - Montmartre","title":"Hot Air Balloon Ride","status":"Unconfirmed","type":"enroute","activities":"06:00-09:00 hot air balloon","notes":"Vegetarian breakfast available"},{"date":"2025-07-16","time":"10:00","location":"Paris - Le Marais","title":"Brunch at Café Bleu","status":"Unconfirmed","type":"enroute","activities":"10:00-12:00 brunch","notes":"Vegetarian menu options"},{"date":"2025-07-16","time_window":"14:00-17:00","location":"Paris - Louvre Museum","title":"Louvre Visit","status":"Unconfirmed","type":"enroute","activities":"14:00-17:00 museum visit","notes":"Prebook tickets recommended"}]`;
  }

  buildCraftPrompt(formData) {
    const {
      destinations,
      travelDates,
      travelers,
      budget,
      alreadyBooked,
      alreadyBookedDetails,
      tripPace,
      independence,
      sightseeingVsDowntime,
      historyCulture,
      natureOutdoors,
      foodDrink,
      shopping,
      nightlifeEntertainment,
      relaxation,
      otherInterests,
      otherInterestsRating,
      mustSeePlaces,
      thingsToAvoid,
      morningStyle,
      travelComfort,
      preferredTransport,
      accommodationStyle,
      basePreference,
  accommodationMix,
  travelTimePreferences,
  travelTimeNotes,
      dietaryNeeds,
      accessibilityNeeds,
      safetyConcerns,
      travelingWith,
      freeTimeFlexibility,
      hiddenGemsVsAttractions,
      shoppingTime,
      eventsFestivals,
      finalNotes
    } = formData;

    // Convert ratings to descriptive text
    const ratingDescriptions = {
      1: "Not at all important",
      2: "Somewhat important",
      3: "Moderately important",
      4: "Very important",
      5: "Extremely important"
    };

    const paceDescriptions = {
      1: "Very relaxed pace with lots of downtime",
      2: "Relaxed pace",
      3: "Moderate pace",
      4: "Active pace",
      5: "Very fast-paced with minimal downtime"
    };

    const independenceDescriptions = {
      1: "Fully guided tours and organized activities",
      2: "Mostly guided with some independent time",
      3: "Balanced mix of guided and independent activities",
      4: "Mostly independent with some guided elements",
      5: "Fully independent exploration"
    };

    const morningDescriptions = {
      1: "Sleep in until late morning",
      2: "Wake up mid-morning",
      3: "Normal schedule",
      4: "Early riser",
      5: "Very early morning starts"
    };

    const transportPrefs = Object.entries(preferredTransport)
      .filter(([_, checked]) => checked)
      .map(([key, _]) => {
        const labels = {
          rentalCar: 'Rental car',
          trains: 'Trains',
          flights: 'Flights',
          guidedTransport: 'Guided transport',
          walking: 'Walking'
        };
        return labels[key];
      })
      .join(', ');

  // Build a compact summary of the form data for context
  const summaryLines = [];
  if (destinations) summaryLines.push(`Destinations: ${destinations}`);
  if (travelDates) summaryLines.push(`Travel dates: ${travelDates}`);
  if (travelers) summaryLines.push(`Travelers: ${travelers}`);
  if (mustSeePlaces) summaryLines.push(`Must-see: ${mustSeePlaces}`);
  if (thingsToAvoid) summaryLines.push(`Avoid: ${thingsToAvoid}`);
  if (accommodationMix) summaryLines.push(`Accommodation mix: ${accommodationMix}`);
  if (travelTimePreferences) {
    const tt = travelTimePreferences === 'mostly_under_2h' ? 'Mostly under 2h between sights (short travel), occasional long days allowed' : travelTimePreferences === 'flexible_with_long_days' ? 'Flexible, comfortable with long travel days (up to ~8h)' : `Custom: ${travelTimeNotes || ''}`;
    summaryLines.push(`Travel time preference: ${tt}`);
  }

  const summary = summaryLines.length ? `FORM SUMMARY:\n${summaryLines.join('\n')}` : '';

  // Use the exact TASK instructions provided by the user for Craft Trip LLM instructions
  return `${summary}

TASK:
You are an expert travel planner. Always follow a two-step workflow when asked for an itinerary.

Step 1 – Preview Table (default output)

Present the itinerary first as a table for user review.

Each row = one activity, travel, or accommodation entry.

Each row must include:

date (YYYY-MM-DD)

time window (HH:MM-HH:MM, approximate if needed)

location (city + neighborhood if relevant)

title (activity, transport, or accommodation)

notes (dietary, accessibility, transport, tips, etc.)

List in chronological order from trip start to end.

Include one accommodation entry per night.

Align activities with traveler preferences (pace, interests, must-see/avoid, dietary, style).

Step 2 – JSON Export (only when user says “give me json”)

Convert the exact preview table into a JSON array.

Each row becomes one JSON object with the following fields:

{
  "date": "YYYY-MM-DD",
  "time_window": "HH:MM-HH:MM",
  "location": "City - Area/Place",
  "title": "Activity or Accommodation Name",
  "status": "Unconfirmed",
  "type": "roofed|camp|enroute|note|ferry|drive|flight",
  "activities": "Short description of what happens",
  "notes": "Extra guidance, dietary, accessibility, transport, or booking info"
}


"type" rules:

"roofed" = accommodation nights

"camp" = campsite nights

"enroute" = travel segments or scheduled activities

"note" = optional suggestions/tips

JSON output must contain only the array, no markdown, no explanations.`;

  // Note: we also explicitly ask the LLM to include times when present in the source/preview
  // Prefer a dedicated "time" field for single times ("HH:MM" or ISO 8601) and "time_window" for ranges ("HH:MM-HH:MM").
  }

  async parseBookingInformation(text = '', profile = {}) {
  const prompt = this.buildPrompt(text, profile);
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

  async parseCraftResponse(text = '') {
    // Try to parse the entire response as JSON first
    try {
      const parsed = JSON.parse(text.trim());
      if (Array.isArray(parsed)) {
        return { success: true, data: parsed };
      }
    } catch (e) {
      console.log('Direct JSON parse failed, trying extraction');
    }

    // Fallback: extract JSON array from the response
    const jsonMatches = text.match(/\[[\s\S]*?\]/g);
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          const parsed = JSON.parse(match);
          if (Array.isArray(parsed)) {
            return { success: true, data: parsed };
          }
        } catch (e) {
          continue;
        }
      }
    }

    // If no JSON found, return the text as a prompt for manual use
    return { type: 'manual', tableText: text };
  }
}

export const llmService = new LLMService();