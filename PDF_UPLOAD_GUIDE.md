# AI Import Feature

## Overview

The TripCrafter app now supports **AI Import** functionality that can automatically parse trip information from multiple sources and convert it into the app's data format. This feature allows users to import booking confirmations, itineraries, and other travel documents from **websites, PDFs, or text** without manual form filling.

## Features

- **🌐 Website URL Import**: Paste booking confirmation URLs and have AI extract trip data
- **📄 PDF Upload**: Upload PDF documents for automatic parsing
- **📝 Text Import**: Paste email confirmations or text directly
- **🤖 AI Parsing**: Leverages LLM to intelligently parse content into structured trip data
- **🎯 Available Everywhere**: AI Import button accessible from all views (Table, List, Form, Map)
- **🔄 Preview & Edit**: Users can review and edit parsed data before adding to their trip
- **📋 Multiple Bookings**: Supports documents containing multiple bookings/dates
- **🛡️ Fallback Parsing**: Works even without API keys using smart pattern matching

## Setup Instructions

### 1. Install Dependencies

The required dependencies are already installed:
- `pdfjs-dist`: For client-side PDF text extraction
- `axios`: For API calls (if needed)

### 2. Configure LLM Service (Optional but Recommended)

#### Option A: OpenAI (Recommended)

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to your `.env` file:
   ```
   REACT_APP_OPENAI_API_KEY=your_actual_api_key_here
   ```

#### Option B: Mock Parser (Default)

If no API key is provided, the system falls back to intelligent pattern matching that can extract:
- Dates in various formats
- Accommodation names
- Locations with addresses
- Booking reference numbers

## File Structure

```
src/
├── components/
│   ├── AIImportButton.js      # Reusable AI Import button
│   └── AIImportModal.js       # Main AI Import modal interface
├── services/
│   ├── aiImportService.js     # Core AI import functionality
│   └── llmService.js          # LLM integration service
├── handlers/
│   └── aiImportHandlers.js    # App.js integration handlers
├── testData/
│   └── samplePdfTexts.js      # Sample data for testing
└── App.js                     # Updated with clean AI Import integration
```

## How It Works

### 1. AI Import Process

1. User clicks the "🤖 AI Import" button (available in all views)
2. User selects import source: Website URL, PDF file, or Text
3. Content is extracted and processed:
   - **URLs**: Web scraping with CORS handling and proxy fallback
   - **PDFs**: Client-side text extraction using PDF.js
   - **Text**: Direct processing of pasted content
4. AI service parses the content into structured data
5. Structured data is displayed for preview and editing
6. User can edit data before accepting
7. Data is added to the trip with proper formatting

### 2. Data Extraction

The AI is instructed to extract:

- **date**: Check-in date in YYYY-MM-DD format
- **location**: Full address or location name
- **accommodation**: Hotel, campsite, ferry name
- **status**: Booked/Unconfirmed/Cancelled/Not booked
- **type**: roofed/camp/enroute (auto-determined)
- **travelTime**: Estimated travel time
- **activities**: Planned activities
- **notes**: Booking numbers, guest details, etc.

### 3. Smart Type Detection

The system automatically determines the `type` field:
- **roofed**: Hotels, motels, resorts, B&Bs
- **camp**: Camping grounds, caravan parks, RV sites
- **enroute**: Ferries, flights, transport, activities

## Usage Guide

### For Users

1. **Access AI Import**: Click the "🤖 AI Import" button (visible in all views)
2. **Choose Source Type**: Select Website URL, PDF File, or Text
3. **Provide Content**: 
   - **URL**: Paste the booking confirmation or travel website URL
   - **PDF**: Upload your booking confirmation PDF
   - **Text**: Paste email content or booking details
4. **Wait for Processing**: AI extracts and parses the content
5. **Review Data**: Check the parsed information in the preview
6. **Edit if Needed**: Modify any fields before accepting
7. **Accept**: Click "🚀 Import with AI" to add the data to your trip

### For Developers

#### Customizing the LLM Prompt

Edit `src/services/llmService.js` to modify the parsing instructions:

```javascript
buildPrompt(text) {
  return `Your custom parsing instructions...
  
  Text to parse:
  ${text}
  
  Return only JSON:`;
}
```

#### Adding Alternative LLM Services

Extend the `LLMService` class to support other services:

```javascript
async parseBookingInformation(text) {
  if (this.anthropicApiKey) {
    return await this.callAnthropic(prompt);
  } else if (this.ollamaUrl) {
    return await this.callOllama(prompt);
  } else if (this.openaiApiKey) {
    return await this.callOpenAI(prompt);
  } else {
    return this.mockParse(text);
  }
}
```

#### Customizing PDF Text Extraction

Modify `PdfUploader.js` to enhance text extraction:

```javascript
const extractTextFromPdf = async (file) => {
  // Add custom text processing here
  // e.g., OCR for scanned PDFs, table extraction, etc.
};
```

## Supported Import Sources

### ✅ Website URLs
- Booking confirmation pages
- Travel itinerary websites  
- Hotel reservation systems
- Activity booking sites
- Travel agency portals

### ✅ PDF Documents
- Hotel booking confirmations
- Ferry/flight tickets 
- Camping reservations
- Activity bookings
- Multi-day itineraries

### ✅ Text Content
- Email confirmations
- Booking reference numbers
- Copied itinerary text
- Travel details from any source

### Expected Results
- **Website URLs**: Best results with booking confirmations and structured travel sites
- **Text-based PDFs**: Work excellently with standard booking documents
- **Scanned PDFs**: Limited success, manual text entry may be needed
- **Email Text**: Great for confirmation emails and booking details
- **Multiple Bookings**: Automatically detected and separated

## Error Handling

The system includes comprehensive error handling:

- **PDF Reading Errors**: Clear messages for unsupported files
- **LLM API Errors**: Graceful fallback to mock parser
- **Parsing Errors**: User-friendly error messages
- **Network Issues**: Retry logic and offline fallback

## Cost Considerations

### OpenAI Usage
- Uses GPT-4 for best accuracy
- Typical cost: ~$0.01-0.03 per PDF
- Text is pre-processed to minimize token usage

### Alternatives
- **Free Option**: Use the built-in pattern matching
- **Self-hosted**: Integrate with Ollama or local models
- **Other APIs**: Anthropic Claude, Google Gemini, etc.

## Privacy & Security

- **Client-side Processing**: PDF text extraction happens locally
- **API Security**: API keys are environment variables
- **No File Storage**: PDFs are processed and discarded
- **Data Control**: All parsed data is reviewed before saving

## Troubleshooting

### Common Issues

1. **"No text could be extracted"**
   - PDF might be image-based (scanned)
   - Try OCR or manual entry

2. **"LLM returned invalid JSON"**
   - API might be overloaded
   - Falls back to pattern matching automatically

3. **Incorrect parsing**
   - Edit the parsed data before accepting
   - Consider improving the LLM prompt

### Debug Mode

Enable console logging by adding to your browser console:
```javascript
localStorage.setItem('debug_pdf_parsing', 'true');
```

## Future Enhancements

### Planned Features
- OCR support for scanned PDFs
- Multiple file upload
- Template-based parsing for specific providers
- Bulk import from email attachments
- Integration with booking platforms

### Extension Points
- Add custom field extractors
- Implement provider-specific parsers
- Add data validation rules
- Create parsing templates

## API Reference

### PdfUploader Component

```jsx
<PdfUploader
  onParsedData={(data) => {}}    // Callback with parsed data
  onError={(error) => {}}        // Error handling
  onLoading={(loading) => {}}    // Loading state
/>
```

### ParsedDataPreview Component

```jsx
<ParsedDataPreview
  parsedData={data}              // Data to preview
  onAccept={(data) => {}}        // Accept parsed data
  onEdit={(data) => {}}          // Edit data callback
  onCancel={() => {}}            // Cancel/discard
/>
```

### LLMService

```javascript
import { llmService } from './services/llmService';

const result = await llmService.parseBookingInformation(text);
```

## Contributing

To enhance the PDF parsing feature:

1. Test with various PDF formats
2. Improve the LLM prompts for better accuracy
3. Add support for new document types
4. Enhance the pattern matching fallback
5. Add integration tests

For questions or support, please refer to the main project documentation.
