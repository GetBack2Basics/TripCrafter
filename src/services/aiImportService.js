// ...removed duplicate class declaration...
// AI Import service for parsing various content types into trip data format
import { llmService } from './llmService.js';

export class AIImportService {
  async getPrompt(source, type = 'auto', profile = {}) {
    let content = '';
    let detectedType = type;
    if (type === 'auto') {
      detectedType = this.detectSourceType(source);
    }
    switch (detectedType) {
      case 'url':
        content = await this.extractFromUrl(source);
        break;
      case 'pdf':
        content = await this.extractFromPdf(source);
        break;
      case 'text':
        content = source;
        break;
      default:
        content = '';
    }
  // Provide a prompt with an explicit example to improve LLM output consistency
  return llmService.buildPromptWithExample(content, profile);
  }
  constructor() {
    this.supportedTypes = {
      pdf: 'application/pdf',
      url: 'text/html',
      text: 'text/plain'
    };
  }

  async importFromSource(source, type = 'auto', profile = {}) {
    try {
      let content = '';
      let detectedType = type;

      if (type === 'auto' || source instanceof File) {
        detectedType = this.detectSourceType(source);
      }

      switch (detectedType) {
        case 'url':
          content = await this.extractFromUrl(source);
          break;
        case 'pdf':
          content = await this.extractFromPdf(source);
          break;
        case 'text':
          content = source;
          break;
        case 'rtf':
        case 'docx':
        case 'spreadsheet':
        case 'image':
          content = await this.extractFromDocument(source, detectedType);
          break;
        default:
          throw new Error('Unsupported source type');
      }

      if (!content.trim()) {
        throw new Error('No content could be extracted from the source');
      }

  let parsedData = await llmService.parseBookingInformation(content, profile);

      // Check if LLM returned a prompt instead of parsed data
      if (parsedData && typeof parsedData === 'object' && parsedData.type === 'prompt') {
        return {
          success: false,
          error: 'AI import failed: API not available or failed. Use the provided prompt with your LLM to get the JSON result.',
          prompt: parsedData.prompt,
          sourceType: detectedType,
          contentLength: content.length
        };
      }

      // If LLM returned a single object, wrap it into an array for consistency
      if (!Array.isArray(parsedData) && parsedData && typeof parsedData === 'object') {
        parsedData = [parsedData];
      }

      // Post-process parsedData: strip empty/null fields
      const cleaned = Array.isArray(parsedData) ? parsedData.map(item => {
        const out = {};
        Object.keys(item || {}).forEach(k => {
          const v = item[k];
          if (v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === '')) {
            out[k] = v;
          }
        });
        return out;
      }) : [];

      // Ensure required fields exist on each cleaned item (fill with empty strings/defaults)
      const requiredFields = ["date","location","title","status","type","activities","notes"];
      cleaned.forEach(item => {
        if (!item || typeof item !== 'object') return;
        if (!('date' in item)) item.date = '';
        if (!('location' in item)) item.location = '';
        if (!('title' in item)) item.title = '';
        if (!('status' in item)) item.status = 'Unconfirmed';
        if (!('type' in item)) item.type = 'roofed';
        if (!('activities' in item)) item.activities = '';
        if (!('notes' in item)) item.notes = '';
      });

      // Normalize fields to safe types and formats
      const normalizeImportedItem = (raw) => {
        const item = { ...(raw || {}) };
        // Trim strings
        ['location','title','status','type','activities','notes','travelTime','titleLink','activityLink'].forEach(k => {
          if (k in item && typeof item[k] === 'string') item[k] = item[k].trim();
        });
        // Normalize date to YYYY-MM-DD or empty string
        if (item.date) {
          const d = new Date(item.date);
          if (!isNaN(d.getTime())) {
            item.date = d.toISOString().slice(0,10);
          } else {
            // try parsing common formats like DD MMM YYYY
            const m = item.date.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
            if (m) {
              const [_, day, mon, year] = m;
              const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].findIndex(s => s === mon.toLowerCase().slice(0,3)) + 1;
              if (month > 0) item.date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              else item.date = '';
            } else {
              item.date = '';
            }
          }
        } else {
          item.date = '';
        }

        // Normalize type and status to allowed values
        const allowedTypes = ['roofed','camp','enroute','note'];
        if (!allowedTypes.includes(item.type)) item.type = 'roofed';
        const allowedStatus = ['Booked','Unconfirmed','Cancelled','Not booked'];
        if (!allowedStatus.includes(item.status)) item.status = 'Unconfirmed';

        // Normalize position: allow numeric strings or numbers; otherwise omit
        if ('position' in item) {
          const p = item.position;
          if (p === null || typeof p === 'undefined' || p === '') {
            delete item.position;
          } else if (typeof p === 'number' && Number.isFinite(p)) {
            item.position = p;
          } else if (typeof p === 'string' && p.trim() !== '' && !isNaN(Number(p))) {
            item.position = Number(p);
          } else {
            delete item.position;
          }
        }

        // Remove any undefined-valued keys
        Object.keys(item).forEach(k => { if (typeof item[k] === 'undefined') delete item[k]; });
        return item;
      };

      const normalized = cleaned.map(normalizeImportedItem);

      // Validate result: must be array of objects with required fields
      let valid = Array.isArray(cleaned) && cleaned.length > 0 && cleaned.every(item =>
        typeof item === 'object' && requiredFields.every(f => f in item)
      );
      if (!valid) {
        return {
          success: false,
          error: 'AI import failed: The parsed data was not in the expected format. Please check your input or try again.',
          sourceType: detectedType,
          contentLength: content.length
        };
      }

      // Ensure proper ID generation
      normalized.forEach((item, index) => {
        if (!item.id) {
          item.id = `ai-import-${Date.now()}-${index}`;
        }
      });

      return {
        success: true,
        data: normalized,
        sourceType: detectedType,
        contentLength: content.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        sourceType: type
      };
    }
  }

  detectSourceType(source) {
    if (typeof source === 'string') {
      if (source.startsWith('http://') || source.startsWith('https://')) {
        return 'url';
      }
      if (source.length < 1000) { // Assume short strings are URLs or text
        return 'text';
      }
      return 'text';
    }
    
    if (source instanceof File) {
      const mimeType = source.type;
      const fileName = source.name.toLowerCase();
      
      // PDF files
      if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return 'pdf';
      }
      
      // Text-based documents
      if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
        return 'text';
      }
      
      // Rich text format
      if (mimeType === 'application/rtf' || fileName.endsWith('.rtf')) {
        return 'rtf';
      }
      
      // Microsoft Word documents
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          mimeType === 'application/msword' ||
          fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        return 'docx';
      }
      
      // Excel files
      if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          mimeType === 'application/vnd.ms-excel' ||
          fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        return 'spreadsheet';
      }
      
      // Images (for OCR)
      if (mimeType.startsWith('image/') || 
          fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
          fileName.endsWith('.png') || fileName.endsWith('.gif') || 
          fileName.endsWith('.bmp')) {
        return 'image';
      }
      
      // Default to text for unknown types
      return 'text';
    }

    return 'text';
  }

  async extractFromUrl(url) {
    try {
      // For client-side URL extraction, we need to handle CORS limitations
      // This is a simplified version - in production you might need a proxy or server-side extraction
      
      // Try direct fetch first (will work for CORS-enabled sites)
      try {
        const response = await fetch(url, {
          mode: 'cors',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'TripCrafter AI Import'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        return this.extractTextFromHtml(html);
      } catch (corsError) {
        // Fallback: Use a CORS proxy service
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }
        
        const data = await response.json();
        return this.extractTextFromHtml(data.contents);
      }
    } catch (error) {
      throw new Error(`Failed to extract content from URL: ${error.message}`);
    }
  }

  extractTextFromHtml(html) {
    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove script and style elements
    const scripts = doc.querySelectorAll('script, style, nav, footer, header');
    scripts.forEach(el => el.remove());
    
    // Extract text content
    let text = doc.body ? doc.body.innerText : doc.documentElement.innerText;
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Look for specific booking-related content
    const relevantSections = this.findRelevantSections(doc);
    if (relevantSections.length > 0) {
      text = relevantSections.join('\n\n');
    }
    
    return text;
  }

  findRelevantSections(doc) {
    const relevantSelectors = [
      '[class*="booking"]',
      '[class*="reservation"]',
      '[class*="confirmation"]',
      '[class*="itinerary"]',
      '[class*="trip"]',
      '[class*="travel"]',
      '[id*="booking"]',
      '[id*="reservation"]',
      '[id*="confirmation"]',
      'main',
      'article',
      '.content',
      '#content'
    ];
    
    const sections = [];
    
    for (const selector of relevantSelectors) {
      try {
        const elements = doc.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.innerText?.trim();
          if (text && text.length > 50 && text.length < 5000) {
            sections.push(text);
          }
        });
        
        if (sections.length > 0) break; // Use first successful selector
      } catch (e) {
        // Continue if selector fails
      }
    }
    
    return sections;
  }

  async extractFromPdf(file) {
    // Dynamic import to avoid loading PDF.js unless needed
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configure worker - use the worker from public directory
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  async extractFromDocument(file, type) {
    try {
      // For text-based files, try to read as text
      if (type === 'text' || type === 'rtf') {
        return await file.text();
      }
      
      // For binary formats, indicate that manual conversion is needed
      if (type === 'docx') {
        throw new Error('DOCX files are not yet supported. Please convert to PDF, TXT, or paste the text content manually.');
      }
      
      if (type === 'spreadsheet') {
        throw new Error('Spreadsheet files are not yet supported. Please export as CSV or paste the data as text.');
      }
      
      if (type === 'image') {
        throw new Error('Image files are not yet supported. Please use OCR tools to extract text or paste the text content manually.');
      }
      
      // Fallback: try to read as text
      try {
        return await file.text();
      } catch (textError) {
        throw new Error(`Unable to extract text from ${type} file. Please convert to a supported format (PDF, TXT) or paste the content manually.`);
      }
    } catch (error) {
      throw new Error(`Failed to extract content from document: ${error.message}`);
    }
  }

  // Test methods for development
  async testWithSample(sampleKey) {
    const { samplePdfTexts } = await import('../testData/samplePdfTexts');
    const sampleText = samplePdfTexts[sampleKey] || samplePdfTexts.hotelBooking;
    
    return this.importFromSource(sampleText, 'text');
  }
}

// Export singleton instance
export const aiImportService = new AIImportService();
