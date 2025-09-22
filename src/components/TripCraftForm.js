import React, { useState } from 'react';

function TripCraftForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    // Trip Basics
    destinations: '',
    travelDates: '',
    travelers: '',
    budget: '',
    alreadyBooked: '',
    alreadyBookedDetails: '',

    // Travel Style
    tripPace: 3,
    independence: 3,
    sightseeingVsDowntime: 3,

    // Interests & Priorities
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

    // Logistics & Comfort
    morningStyle: 3,
    travelComfort: 3,
    preferredTransport: {
      rentalCar: false,
      trains: false,
      flights: false,
      guidedTransport: false,
      walking: false
    },
    accommodationStyle: '',
    basePreference: '',

  // Accommodation / travel constraints
  accommodationMix: '', // e.g. "Mostly 3-night stays with some 1-night stays"
  travelTimePreferences: 'mostly_under_2h', // 'mostly_under_2h' | 'flexible_with_long_days' | 'custom'
  travelTimeNotes: '',

    // Food & Special Considerations
    dietaryNeeds: '',
    accessibilityNeeds: '',
    safetyConcerns: '',
    travelingWith: '',

    // Extras
    freeTimeFlexibility: 3,
    hiddenGemsVsAttractions: 3,
    shoppingTime: 3,
    eventsFestivals: 3,

    // Final Notes
    finalNotes: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTransportChange = (transport, checked) => {
    setFormData(prev => ({
      ...prev,
      preferredTransport: {
        ...prev.preferredTransport,
        [transport]: checked
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const RatingScale = ({ label, value, onChange, minLabel = "1", maxLabel = "5" }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500 w-8">{minLabel}</span>
        <input
          type="range"
          min="1"
          max="5"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-xs text-gray-500 w-8">{maxLabel}</span>
        <span className="text-sm font-medium text-indigo-600 w-6">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-indigo-600 mb-2">Craft Your Perfect Trip</h2>
        <p className="text-gray-600">Fill out this form to generate a personalized itinerary using AI.</p>
      </div>

      <div className="space-y-8">
        {/* Trip Basics */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Trip Basics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destination(s)</label>
              <input
                type="text"
                value={formData.destinations}
                onChange={(e) => handleInputChange('destinations', e.target.value)}
                placeholder="e.g., Paris, France or Multiple European cities"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Travel dates (or flexibility)</label>
              <input
                type="text"
                value={formData.travelDates}
                onChange={(e) => handleInputChange('travelDates', e.target.value)}
                placeholder="e.g., July 15-30, 2025 or Flexible in summer"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of travelers & ages</label>
              <input
                type="text"
                value={formData.travelers}
                onChange={(e) => handleInputChange('travelers', e.target.value)}
                placeholder="e.g., 2 adults, 2 children (ages 8, 10)"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget range</label>
              <div className="space-y-2">
                {['Economy', 'Mid-range', 'Luxury'].map(option => (
                  <label key={option} className="flex items-center">
                    <input
                      type="radio"
                      name="budget"
                      value={option}
                      checked={formData.budget === option}
                      onChange={(e) => handleInputChange('budget', e.target.value)}
                      className="mr-2"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Already booked (flights/hotels)?</label>
            <div className="space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="alreadyBooked"
                  value="yes"
                  checked={formData.alreadyBooked === 'yes'}
                  onChange={(e) => handleInputChange('alreadyBooked', e.target.value)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="alreadyBooked"
                  value="no"
                  checked={formData.alreadyBooked === 'no'}
                  onChange={(e) => handleInputChange('alreadyBooked', e.target.value)}
                  className="mr-2"
                />
                No
              </label>
            </div>
            {formData.alreadyBooked === 'yes' && (
              <textarea
                value={formData.alreadyBookedDetails}
                onChange={(e) => handleInputChange('alreadyBookedDetails', e.target.value)}
                placeholder="Details of what's already booked..."
                rows={3}
                className="w-full mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}
          </div>
        </div>

        {/* Travel Style */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">2. Travel Style (Rate 1–5)</h3>
          <RatingScale
            label="Trip pace"
            value={formData.tripPace}
            onChange={(value) => handleInputChange('tripPace', value)}
            minLabel="Very relaxed"
            maxLabel="Very fast-paced"
          />
          <RatingScale
            label="Independence"
            value={formData.independence}
            onChange={(value) => handleInputChange('independence', value)}
            minLabel="Fully guided"
            maxLabel="Fully independent"
          />
          <RatingScale
            label="Sightseeing vs downtime"
            value={formData.sightseeingVsDowntime}
            onChange={(value) => handleInputChange('sightseeingVsDowntime', value)}
            minLabel="All downtime"
            maxLabel="All sightseeing"
          />
        </div>

        {/* Interests & Priorities */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">3. Interests & Priorities (Rate each 1–5)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RatingScale label="History & culture" value={formData.historyCulture} onChange={(value) => handleInputChange('historyCulture', value)} />
            <RatingScale label="Nature & outdoors" value={formData.natureOutdoors} onChange={(value) => handleInputChange('natureOutdoors', value)} />
            <RatingScale label="Food & drink" value={formData.foodDrink} onChange={(value) => handleInputChange('foodDrink', value)} />
            <RatingScale label="Shopping" value={formData.shopping} onChange={(value) => handleInputChange('shopping', value)} />
            <RatingScale label="Nightlife & entertainment" value={formData.nightlifeEntertainment} onChange={(value) => handleInputChange('nightlifeEntertainment', value)} />
            <RatingScale label="Relaxation" value={formData.relaxation} onChange={(value) => handleInputChange('relaxation', value)} />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Other interests</label>
            <input
              type="text"
              value={formData.otherInterests}
              onChange={(e) => handleInputChange('otherInterests', e.target.value)}
              placeholder="e.g., Photography, museums, sports"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {formData.otherInterests && (
              <div className="mt-2">
                <RatingScale label="Rate this interest" value={formData.otherInterestsRating} onChange={(value) => handleInputChange('otherInterestsRating', value)} />
              </div>
            )}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Must-see places or bucket-list experiences</label>
            <textarea
              value={formData.mustSeePlaces}
              onChange={(e) => handleInputChange('mustSeePlaces', e.target.value)}
              placeholder="Specific places, landmarks, or experiences you want to include..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Things to avoid (not interested in)</label>
            <textarea
              value={formData.thingsToAvoid}
              onChange={(e) => handleInputChange('thingsToAvoid', e.target.value)}
              placeholder="Activities, types of attractions, or experiences to skip..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* Logistics & Comfort */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">4. Logistics & Comfort (Rate 1–5)</h3>
          <RatingScale
            label="Preferred morning style"
            value={formData.morningStyle}
            onChange={(value) => handleInputChange('morningStyle', value)}
            minLabel="Sleep in"
            maxLabel="Early riser"
          />
          <RatingScale
            label="Comfort with long travel days"
            value={formData.travelComfort}
            onChange={(value) => handleInputChange('travelComfort', value)}
            minLabel="Avoid long trips"
            maxLabel="Don't mind full-day travel"
          />
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred transport (check all that apply)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { key: 'rentalCar', label: 'Rental car' },
                { key: 'trains', label: 'Trains' },
                { key: 'flights', label: 'Flights' },
                { key: 'guidedTransport', label: 'Guided transport' },
                { key: 'walking', label: 'Walking' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferredTransport[key]}
                    onChange={(e) => handleTransportChange(key, e.target.checked)}
                    className="mr-2"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Accommodation style</label>
            <div className="space-y-2">
              {['Central location', 'Budget further out', 'Resort', 'Airbnb'].map(option => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name="accommodationStyle"
                    value={option}
                    checked={formData.accommodationStyle === option}
                    onChange={(e) => handleInputChange('accommodationStyle', e.target.value)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Accommodation mix (nights per stay)</label>
            <input
              type="text"
              value={formData.accommodationMix}
              onChange={(e) => handleInputChange('accommodationMix', e.target.value)}
              placeholder="e.g., Mostly 3-night stays with some 1-night stays"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-500 mt-1">Give an example mix so the planner prefers multi-night stays where possible.</p>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Typical travel-time preferences</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="radio" name="travelTimePref" value="mostly_under_2h" checked={formData.travelTimePreferences === 'mostly_under_2h'} onChange={(e) => handleInputChange('travelTimePreferences', e.target.value)} className="mr-2" />
                Mostly under 2 hours between sights (short travel), occasional long days allowed
              </label>
              <label className="flex items-center">
                <input type="radio" name="travelTimePref" value="flexible_with_long_days" checked={formData.travelTimePreferences === 'flexible_with_long_days'} onChange={(e) => handleInputChange('travelTimePreferences', e.target.value)} className="mr-2" />
                Flexible — comfortable with multiple long travel days (up to ~8 hours)
              </label>
              <label className="flex items-center">
                <input type="radio" name="travelTimePref" value="custom" checked={formData.travelTimePreferences === 'custom'} onChange={(e) => handleInputChange('travelTimePreferences', e.target.value)} className="mr-2" />
                Custom notes
              </label>
              {formData.travelTimePreferences === 'custom' && (
                <textarea value={formData.travelTimeNotes} onChange={(e) => handleInputChange('travelTimeNotes', e.target.value)} rows={2} className="w-full mt-2 p-2 border rounded" placeholder="Describe your acceptable travel times, example mix, exceptions..." />
              )}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Base preference</label>
            <div className="space-y-2">
              {['One location', 'Move between multiple stops'].map(option => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name="basePreference"
                    value={option}
                    checked={formData.basePreference === option}
                    onChange={(e) => handleInputChange('basePreference', e.target.value)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Food & Special Considerations */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">5. Food & Special Considerations</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dietary needs/restrictions</label>
              <input
                type="text"
                value={formData.dietaryNeeds}
                onChange={(e) => handleInputChange('dietaryNeeds', e.target.value)}
                placeholder="e.g., Vegetarian, gluten-free, allergies"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Accessibility needs</label>
              <input
                type="text"
                value={formData.accessibilityNeeds}
                onChange={(e) => handleInputChange('accessibilityNeeds', e.target.value)}
                placeholder="e.g., Wheelchair accessible, mobility assistance"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Safety concerns (if any)</label>
              <input
                type="text"
                value={formData.safetyConcerns}
                onChange={(e) => handleInputChange('safetyConcerns', e.target.value)}
                placeholder="e.g., Medical conditions, security concerns"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Traveling with</label>
              <div className="space-x-4">
                {['Kids', 'Elderly', 'Pets', 'None'].map(option => (
                  <label key={option} className="inline-flex items-center">
                    <input
                      type="radio"
                      name="travelingWith"
                      value={option}
                      checked={formData.travelingWith === option}
                      onChange={(e) => handleInputChange('travelingWith', e.target.value)}
                      className="mr-2"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Extras */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">6. Extras (Rate 1–5)</h3>
          <RatingScale
            label="Free time flexibility"
            value={formData.freeTimeFlexibility}
            onChange={(value) => handleInputChange('freeTimeFlexibility', value)}
            minLabel="Want everything scheduled"
            maxLabel="Want lots of free time"
          />
          <RatingScale
            label="Hidden gems vs major attractions"
            value={formData.hiddenGemsVsAttractions}
            onChange={(value) => handleInputChange('hiddenGemsVsAttractions', value)}
            minLabel="Only famous sites"
            maxLabel="Prefer hidden/local spots"
          />
          <RatingScale
            label="Shopping time"
            value={formData.shoppingTime}
            onChange={(value) => handleInputChange('shoppingTime', value)}
            minLabel="Not important"
            maxLabel="Very important"
          />
          <RatingScale
            label="Events/festivals"
            value={formData.eventsFestivals}
            onChange={(value) => handleInputChange('eventsFestivals', value)}
            minLabel="Not interested"
            maxLabel="Very interested"
          />
        </div>

        {/* Final Notes */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">7. Final Notes</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Any other requests, expectations, or special touches?</label>
            <textarea
              value={formData.finalNotes}
              onChange={(e) => handleInputChange('finalNotes', e.target.value)}
              placeholder="Share any additional preferences, special occasions, or specific requirements..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold transition duration-200"
          >
            Generate Itinerary
          </button>
        </div>
      </div>
    </div>
  );
}

export default TripCraftForm;