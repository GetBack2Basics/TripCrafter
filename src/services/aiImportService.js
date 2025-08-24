// AI Import service for parsing various content types into trip data format
import { llmService } from './llmService';

export class AIImportService {
  constructor() {
    this.supportedTypes = {
      pdf: 'application/pdf',
      url: 'text/html',
      text: 'text/plain'
    };
  }

  async importFromSource(source, type = 'auto') {
    try {
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
          throw new Error('Unsupported source type');
      }

      if (!content.trim()) {
        throw new Error('No content could be extracted from the source');
      }

      const parsedData = await llmService.parseBookingInformation(content);

      // Validate result: must be array of objects with required fields
      const requiredFields = ["date","location","accommodation","status","type","travelTime","activities","notes"];
      let valid = Array.isArray(parsedData) && parsedData.length > 0 && parsedData.every(item =>
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
      parsedData.forEach((item, index) => {
        if (!item.id) {
          item.id = `ai-import-${Date.now()}-${index}`;
        }
      });

      return {
        success: true,
        data: parsedData,
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
      if (source.type === 'application/pdf') {
        return 'pdf';
      }
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
    
    // Configure worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
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

  // Test methods for development
  async testWithSample(sampleKey) {
    const { samplePdfTexts } = await import('../testData/samplePdfTexts');
    const sampleText = samplePdfTexts[sampleKey] || samplePdfTexts.hotelBooking;
    
    return this.importFromSource(sampleText, 'text');
  }
}

// Export singleton instance
export const aiImportService = new AIImportService();
