const { llmService } = require('../src/services/llmService');

const formData = {
  destinations: 'paris',
  travelDates: 'Dec 2 to 14',
  travelers: 'Not specified',
  budget: 'Economy',
  alreadyBooked: 'no',
  alreadyBookedDetails: '',
  tripPace: 3,
  independence: 3,
  sightseeingVsDowntime: 3,
  historyCulture: 3,
  natureOutdoors: 3,
  foodDrink: 3,
  shopping: 3,
  nightlifeEntertainment: 3,
  relaxation: 3,
  otherInterests: '',
  otherInterestsRating: 3,
  mustSeePlaces: '',
  thingsToAvoid: '',
  morningStyle: 3,
  travelComfort: 3,
  preferredTransport: {},
  accommodationStyle: '',
  basePreference: '',
  dietaryNeeds: '',
  accessibilityNeeds: '',
  safetyConcerns: '',
  travelingWith: '',
  freeTimeFlexibility: 3,
  hiddenGemsVsAttractions: 3,
  shoppingTime: 3,
  eventsFestivals: 3,
  finalNotes: ''
};

console.log(llmService.buildCraftPrompt(formData));
