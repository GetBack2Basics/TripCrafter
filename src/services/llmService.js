// Minimal, safe LLM service stub
// Provides the methods the app expects, but does not call external APIs.

export class LLMService {
  constructor() {
    this.huggingFaceApiKey = process.env.REACT_APP_HUGGINGFACE_API_KEY || '';
    this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    this.geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
  }

  // Return a simple prompt string (used by aiImportService for debugging/preview)
  buildPromptWithExample(text = '', profile = {}) {
    const excerpt = (text || '').slice(0, 1000);
    return `Parse the following travel booking text and return a JSON array of trip items.\n\nProfile: ${JSON.stringify(profile)}\n\nText:\n${excerpt}`;
  }

  // Parse booking information. For safety during local testing this returns a deterministic mock result.
  async parseBookingInformation(text = '', profile = {}) {
    // In a full implementation this would call Hugging Face / OpenAI / Gemini if API keys are present.
    // For local verification return a minimal parsed object so downstream validation passes.
    return this.mockParse(text, profile);
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