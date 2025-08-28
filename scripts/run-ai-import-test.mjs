import { aiImportService } from '../src/services/aiImportService.js';
import { samplePdfTexts } from '../src/testData/samplePdfTexts.js';

(async () => {
  try {
    const sample = samplePdfTexts.hotelBooking;
    const profile = { adults: 2, children: 0, interests: ['coastal walks', 'wildlife'], diet: 'vegetarian' };
    const res = await aiImportService.importFromSource(sample, 'text', profile);
    console.log('AI import test result:\n', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Error during AI import test:', e);
    process.exit(1);
  }
})();
