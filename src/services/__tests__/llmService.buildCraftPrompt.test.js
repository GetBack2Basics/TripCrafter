import { llmService } from '../llmService';

describe('llmService.buildCraftPrompt', () => {
  it('includes the TASK instructions and form summary when provided', () => {
    const formData = {
      destinations: 'Tasmania',
      travelDates: '2025-03-01 to 2025-03-07',
      travelers: '2 adults',
      preferredTransport: {},
      mustSeePlaces: 'Cradle Mountain',
      thingsToAvoid: 'Long ferries'
    };

    const prompt = llmService.buildCraftPrompt(formData);

    // The prompt should include the compact form summary
    expect(prompt).toMatch(/FORM SUMMARY:\n/);
    expect(prompt).toMatch(/Destinations: Tasmania/);
    expect(prompt).toMatch(/Travel dates: 2025-03-01 to 2025-03-07/);

    // The prompt must contain the TASK header and key phrases from the user's TASK
    expect(prompt).toMatch(/TASK:/);
    expect(prompt).toMatch(/Step 1 – Preview Table/);
    expect(prompt).toMatch(/Step 2 – JSON Export \(only when user says “give me json”\)/);
    expect(prompt).toMatch(/"type" rules:/);
  });
});
