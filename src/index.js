import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // You'll create this or ensure it's empty
import App from './App';
import reportWebVitals from './reportWebVitals'; // You can keep or remove this file if not needed

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
