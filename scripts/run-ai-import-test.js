const { aiImportService } = require('../src/services/aiImportService');

(async () => {
  try {
    const res = await aiImportService.testWithSample('hotelBooking');
    console.log('Import result:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Error running import test:', e);
  }
})();
