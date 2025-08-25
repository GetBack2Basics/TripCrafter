Trip Crafter ✈️ tripcrafter.netlify.app

Trip Crafter is a collaborative web application designed to help you plan and manage your travel itineraries. It allows users to create, update, and track various details of their trips, including dates, locations, accommodation, and booking statuses. The data is stored publicly within the application, making it easy to share and collaborate with travel companions.

It has been created entirely using LLM's with some tech stacks the author had never used before. The initial prompts can be seen at https://gemini.google.com/app/9b31fbc8fff71c8c before it was moved to Codespaces in GitHub with VS Code chat online.


✨ Features

🤖 **AI Import**: Import trip data from booking confirmation URLs, PDF documents, or text using advanced AI parsing - accessible from any view with a single click!

📅 **Trip Management**: Easily add detailed entries for each leg of your journey, including dates, locations, accommodation details, and estimated travel times.

✏️ **Edit & Update**: Modify any trip detail with a simple click and real-time updates.

🗑️ **Trip Organization**: Remove trips or segments you no longer need, reorder items with move up/down buttons.

📊 **Status Tracking**: Keep tabs on your bookings by setting their status to "Booked," "Unconfirmed," "Cancelled," or "Not booked."

🤝 **Real-time Collaboration**: All trip data is stored in a publicly accessible Firebase Firestore collection, allowing everyone with access to the app to view and update the same itinerary in real-time.


🖼️ **Discover Pane**: At the top of your dashboard, see up to 3 locations from your itinerary, each cycling through up to 3 downloaded images every 10 seconds. Use the arrows to scroll through more locations, or let the images cycle automatically. As you scroll your itinerary, the Discover pane updates to show relevant locations. All images are downloaded in advance for reliability and speed.
🗺️ **Interactive Map View**: Visualize your trip route on Google Maps with turn-by-turn directions between locations and automatic travel time calculations.

🏝️ **Sample Trip**: The app comes pre-populated with an example Tasmania trip itinerary to get you started!

📱 **Responsive Design**: Optimized for viewing on various devices (mobile, tablet, desktop).

🔗 **Smart Activity Links**: Automatically generates relevant links based on trip type:
- **Hotels/Motels**: Booking.com search links
- **Camping**: Google Maps search for nearby campsites
- **Activities**: Google search for local attractions and activities

🛠️ Technologies Used

**Frontend:**
- React: A JavaScript library for building user interfaces
- Tailwind CSS: A utility-first CSS framework for rapid UI development and responsive design

**Backend & Data:**
- Firebase Firestore: A NoSQL cloud database used for real-time data storage and synchronization
- Firebase Authentication: Used for anonymous user authentication to enable data persistence

**AI & Processing:**
- OpenAI GPT-4: Advanced AI parsing for trip data extraction (optional)
- PDF.js: Client-side PDF text extraction
- Custom Pattern Matching: Intelligent fallback parsing without API requirements


**Maps & Location:**
- Google Maps API: Integrated for displaying interactive maps and routing between trip locations
- Directions API: Automatic travel time calculations and route optimization
- Geocoding API: Address lookup and location validation (optional)
- **Discover Images:** Uses a script to download up to 3 images per location from Pexels, stored locally in `/public/discover-images/` for fast, reliable display in the Discover pane.

**Deployment:**
- Netlify: Continuous deployment and hosting
- GitHub: Version control and collaboration

🚀 Getting Started
This application is designed to be easily deployed using services like Netlify, especially when connected to a GitHub repository.

Prerequisites
You don't need to install anything locally on your computer to run this app, as it's designed for cloud-based development and deployment.

Google Maps API Setup
1. Get a Google Maps API Key:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/overview)
   - Create a new project or select an existing one
   - Enable the following APIs:
     - Maps JavaScript API
     - Directions API
     - Geocoding API (optional)
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

### 🚀 Deployment with Netlify

#### Repository Setup
Ensure this GitHub repository (https://github.com/GetBack2Basics/TripCrafter) contains the full React project structure (including public/, src/, package.json, etc.).

#### Connect to Netlify
1. Log in to your Netlify account
2. Click "Add new site" → "Import an existing project"
3. Select "GitHub" and authorize Netlify to access this repository
4. Choose the TripCrafter repository
5. Confirm the build settings (usually auto-detected for React):
   - Build command: `npm run build`
   - Publish directory: `build`
6. Add your environment variables in Netlify site settings
7. Click "Deploy site"

#### Access Your App
Netlify will automatically build and deploy your application, providing you with a live URL to share! Subsequent pushes to the main branch will trigger automatic redeployments.

### 💻 Local Development

#### Using GitHub Codespaces (Recommended)
1. Open in Codespaces: On your GitHub repository page, click the "< > Code" button and select "Create codespace on main"
2. Install Dependencies: Once the Codespace loads, open the integrated terminal and run `npm install`
3. Start Development Server: Run `npm start`. Codespaces will prompt you to open the forwarded port in a new browser tab to view the app

#### Traditional Local Development
1. Clone the repository: `git clone https://github.com/GetBack2Basics/TripCrafter.git`
2. Navigate to the project: `cd TripCrafter`
3. Install dependencies: `npm install`
4. Set up environment variables: Copy `.env.example` to `.env` and add your API keys
5. Start the development server: `npm start`
6. Open [http://localhost:3000](http://localhost:3000) to view it in the browser

### 📋 Project Structure
```
scripts/
   download-discover-images.js   # Downloads up to 3 images per location for Discover pane
```
```
TripCrafter/
├── public/                    # Static files
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── AIImportButton.js
│   │   └── AIImportModal.js
│   ├── services/            # Business logic and API services
│   │   ├── aiImportService.js
│   │   └── llmService.js
│   ├── handlers/            # App integration handlers
│   │   └── aiImportHandlers.js
│   ├── testData/           # Sample data for testing
│   │   └── samplePdfTexts.js
│   ├── Trip*.js            # Trip-related components
│   ├── App.js              # Main application component
│   └── index.js            # Application entry point
├── .env.example            # Environment variables template
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

### 🧪 Testing & Development

#### Built-in Test Data
The app includes sample booking data for testing AI Import functionality:
- Hotel booking confirmations
- Ferry tickets
- Camping reservations
- Multi-day itineraries

#### Development Tips
- Use the built-in Help system for user guidance
- Test AI Import with sample data before using real bookings
- Check browser console for debugging information
- Use responsive design testing for mobile compatibility
- To update Discover images, run `node scripts/download-discover-images.js` to fetch the latest images for your trip locations.

### 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository** and create a feature branch
2. **Test your changes** thoroughly with different data sources
3. **Follow the existing code style** and component structure
4. **Update documentation** if you add new features
5. **Submit a pull request** with a clear description of changes

#### Areas for Contribution
- Additional AI parsing improvements
- New import source types (Google Calendar, email integrations, etc.)
- Enhanced map features and route optimization
- Mobile app development
- Accessibility improvements
- Performance optimizations

### 🐛 Troubleshooting

#### Common Issues
1. **Maps not loading**: Check Google Maps API key and enabled APIs
2. **AI Import not working**: Verify OpenAI API key or use pattern matching mode
3. **Build failures**: Ensure all environment variables are set correctly
4. **CORS errors with URLs**: Some websites block cross-origin requests (this is normal)

#### Getting Help
- Check the in-app Help system for user guidance
- Review browser console for technical errors
- Check [Issues](https://github.com/GetBack2Basics/TripCrafter/issues) for known problems
- Create a new issue for bugs or feature requests

### 📄 License & Legal

This project is open source and available under the MIT License. See the LICENSE file for details.

**Third-party Services:**
- Google Maps: Subject to Google's terms of service
- OpenAI: Subject to OpenAI's usage policies
- Firebase: Subject to Google Firebase terms

### 🔄 Versioning

This project uses semantic versioning. Check the version number in the app footer for current release information.

� Getting Started

This application is designed to be easily deployed using services like Netlify, especially when connected to a GitHub repository.

### Prerequisites
You don't need to install anything locally on your computer to run this app, as it's designed for cloud-based development and deployment.

### API Setup (Required for Full Functionality)

#### 1. Google Maps API Setup
1. Get a Google Maps API Key:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/overview)
   - Create a new project or select an existing one
   - Enable the following APIs:
     - Maps JavaScript API
     - Directions API
     - Geocoding API (optional)
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

#### 2. AI Import Setup (Optional but Recommended)
1. Get an OpenAI API Key:
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create an account and generate an API key
   - Note: This enables high-accuracy AI parsing of booking documents
   - Cost: Typically $0.01-0.03 per import

#### 3. Environment Variables Setup
Copy `.env.example` to `.env` and add your API keys:
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

For Netlify deployment, add these environment variables in your Netlify site settings under "Environment variables".

### 🌐 AI Import Feature
The AI Import feature allows you to automatically extract trip data from multiple sources:

**Supported Sources:**
- 🌐 **Website URLs**: Booking confirmation pages, travel sites, itinerary websites
- 📄 **PDF Documents**: Booking confirmations, tickets, itineraries, travel documents
- 📝 **Text Content**: Email confirmations, booking details, copied itinerary text

**How It Works:**
1. Click the "🤖 AI Import" button (available in all views)
2. Choose your import source and provide the content
3. AI processes and extracts structured trip data
4. Review and edit the parsed information
5. Add to your trip with one click

**Setup Options:**
- **With OpenAI API Key**: High-accuracy AI parsing with GPT-4
- **Without API Key**: Intelligent pattern matching (free, good accuracy for standard formats)
- **Offline Capable**: Basic functionality works without internet for text processing

Deployment with Netlify
Repository Setup: Ensure this GitHub repository (https://github.com/GetBack2Basics/TripCrafter) contains the full React project structure (including public/, src/, package.json, etc.).

Connect to Netlify:

Log in to your Netlify account.

Click "Add new site" -> "Import an existing project."

Select "GitHub" and authorize Netlify to access this repository.

Choose the TripCrafter repository.

Confirm the build settings (usually auto-detected for React: Build command npm run build, Publish directory build).

Click "Deploy site."

Access Your App: Netlify will automatically build and deploy your application, providing you with a live URL to share! Subsequent pushes to the main branch will trigger automatic redeployments.

Developing with GitHub Codespaces (Optional)
If you want to contribute or develop without a local setup:

Open in Codespaces: On your GitHub repository page, click the "< > Code" button and select "Create codespace on main".

Install Dependencies: Once the Codespace loads, open the integrated terminal and run npm install.

Start Development Server: Run npm start. Codespaces will prompt you to open the forwarded port in a new browser tab to view the app.

🤝 Contributing
Feel free to fork this repository, make improvements, and submit pull requests.

📄 License
This project is open-source and available under the MIT License.
