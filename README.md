Trip Crafter ✈️
Trip Crafter is a collaborative web application designed to help you plan and manage your travel itineraries. It allows users to create, update, and track various details of their trips, including dates, locations, accommodation, and booking statuses. The data is stored publicly within the application, making it easy to share and collaborate with travel companions.

It has been created entirely using LLM's with some tech stacks the author had never used before. The prompts can be seen at https://gemini.google.com/app/9b31fbc8fff71c8c

✨ Features
Add New Trip Items: Easily add detailed entries for each leg of your journey, including dates, locations, accommodation details, and estimated travel times.

Edit Existing Items: Modify any trip detail with a simple click.

Delete Trips: Remove trips or segments you no longer need.

Status Tracking: Keep tabs on your bookings by setting their status to "Booked," "Unconfirmed," or "Cancelled."

Real-time Collaboration: All trip data is stored in a publicly accessible Firebase Firestore collection, allowing everyone with access to the app to view and update the same itinerary in real-time.

Initial Tasmania Trip: The app comes pre-populated with an example Tasmania trip itinerary to get you started!

Responsive Design: Optimized for viewing on various devices (mobile, tablet, desktop).

🛠️ Technologies Used
React: A JavaScript library for building user interfaces.

Firebase Firestore: A NoSQL cloud database used for real-time data storage and synchronization.

Firebase Authentication: Used for anonymous user authentication to enable data persistence.

Tailwind CSS: A utility-first CSS framework for rapid UI development and responsive design.

🚀 Getting Started
This application is designed to be easily deployed using services like Netlify, especially when connected to a GitHub repository.

Prerequisites
You don't need to install anything locally on your computer to run this app, as it's designed for cloud-based development and deployment.

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
