------------index.html------------
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Social Media Chatbot - AI-powered social media assistant" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>Social Media Chatbot</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>




------------index.js------------
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root')
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();





------------App.js------------
import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios defaults
const instagramApiUrl = 'http://localhost:8000';
const chatApiUrl = 'http://localhost:5000';

// Configure axios instances for different APIs
const instagramAxios = axios.create({
  baseURL: instagramApiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});

const chatAxios = axios.create({
  baseURL: chatApiUrl,
  withCredentials: true
});

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await instagramAxios.post('/token', formData);
      
      const token = response.data.access_token;
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      
      instagramAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      chatAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      onLogin();
    } catch (error) {
      alert(error.response?.data?.detail || 'Invalid credentials');
      console.error('Login error:', error);
    }
  };

  return (
    <div className="login-page-bg">
      {/* Abstract SVG background shapes */}
      <svg className="login-bg-svg" width="100%" height="100%" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M0,0 Q600,200 0,900 L0,0 Z" fill="#1b2a41" opacity="0.95"/>
        <ellipse cx="1200" cy="200" rx="220" ry="120" fill="#ffe156" opacity="0.13"/>
        <ellipse cx="300" cy="700" rx="180" ry="100" fill="#43e97b" opacity="0.10"/>
        <ellipse cx="1100" cy="700" rx="140" ry="90" fill="#7f8fd6" opacity="0.10"/>
        <ellipse cx="700" cy="400" rx="90" ry="60" fill="#ffb6b9" opacity="0.10"/>
      </svg>
      <div className="login-bg-glass"></div>
      <div className="login-page-container"> {/* This is the container that gets centered by login-page-bg's flex properties */}
        <div className="login-form-wrapper">
          <h1 className="login-app-title">Social Media Chatbot</h1>
          <form onSubmit={handleSubmit} className="login-form-actual">
            <h2 className="login-form-heading">Login</h2>
            
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="login-button">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Feed() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ image: null, caption: '' });

  React.useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data } = await instagramAxios.get('/feed');
      const postsWithFullUrls = data.map(post => ({
        ...post,
        image: post.image.startsWith('http') ? post.image : `${instagramApiUrl}${post.image}`
      }));
      setPosts(postsWithFullUrls);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleImageChange = (e) => {
    setNewPost({ ...newPost, image: e.target.files[0] });
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (newPost.image) {
      formData.append('image', newPost.image);
    }
    formData.append('caption', newPost.caption);

    try {
      await instagramAxios.post('/post', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setNewPost({ image: null, caption: '' });
      // Clear file input visually (optional, depends on browser behavior or specific component for file input)
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.value = '';
      }
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  return (
    <div className="feed">
      <div className="create-post">
        <h3>Create New Post</h3>
        <form onSubmit={handleSubmitPost}>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          <input
            type="text"
            placeholder="Write a caption..."
            value={newPost.caption}
            onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
          />
          <button type="submit">Post</button>
        </form>
      </div>
      <div className="posts">
        {posts.map((post, index) => (
          <div key={index} className="post">
            <div className="post-header">
              <strong>{post.username}</strong>
            </div>
            <img src={post.image} alt={post.caption} />
            <div className="post-caption">
              <strong>{post.username}</strong> {post.caption}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = React.useRef(null); // For scrolling to bottom

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => { // Scroll to bottom when new messages are added
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage,
          username: localStorage.getItem('username') || 'anonymous'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.response) {
        setMessages(prev => [...prev, { text: data.response, sender: 'bot' }]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        text: `Sorry, I encountered an error. ${error.message}`,
        sender: 'bot',
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot"> {/* This div needs to expand */}
      <div className="chat-messages"> {/* This div will scroll */}
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender} ${msg.isError ? 'isError' : ''}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && <div className="message bot loading">Thinking</div>}
        <div ref={messagesEndRef} /> {/* Invisible element to scroll to */}
      </div>
      <form onSubmit={sendMessage} className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      instagramAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      chatAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`; // Also set for chatAxios
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username'); // Also remove username
    delete instagramAxios.defaults.headers.common['Authorization'];
    delete chatAxios.defaults.headers.common['Authorization']; // Also delete for chatAxios
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app"> {/* Ensure this is flex column */}
      <header className="app-header">
        <h1>Social Media Chatbot</h1>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </header>
      <main className="main-content"> {/* Ensure this grows */}
        <Feed />
        <div className="chatbot-column">
          <h2 className="chatbot-section-title">Chatbot</h2>
          <Chatbot />
        </div>
      </main>
    </div>
  );
}

export default App;







------------App.css------------
/* App.css */

/* Reset and Base Styles (Optional but good practice) */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root, .app {
  height: 100%; /* Ensure root elements can expand to full viewport height */
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #fafafa; /* General background for the app */
  color: #262626;
}

/* App-wide styles */
.app {
  display: flex; /* MODIFIED: Make .app a flex container */
  flex-direction: column; /* MODIFIED: Stack header and main-content vertically */
  min-height: 100vh; /* Fallback if height: 100% on parents isn't enough */
  background-color: #fafafa;
}

.app-header {
  background-color: white;
  padding: 1rem;
  border-bottom: 1px solid #dbdbdb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0; /* MODIFIED: Prevent header from shrinking */
}

.app-header h1 {
  margin: 0;
  color: #262626;
  font-size: 1.5rem;
}

.main-content {
  display: flex; /* Manages Feed and Chatbot-column side-by-side */
  flex-grow: 1; /* MODIFIED: Allow main-content to take remaining vertical space */
  max-width: 1200px;
  width: 100%; /* Take full available width up to max-width */
  margin: 0 auto; /* Centering content block horizontally */
  padding: 20px; /* Inner spacing for content */
  gap: 20px;
  overflow: hidden; /* Prevent content from causing scrollbars on main-content itself due to its children */
}

.feed {
  flex: 2; /* Takes more horizontal space */
  max-width: 600px; /* As per existing design */
  /* background-color: #fff; */ /* Feed items have their own background */
  border-radius: 8px;
  /* box-shadow: 0 2px 4px rgba(0,0,0,0.05); */ /* Optional subtle shadow for feed column */
  overflow-y: auto; /* If feed itself needs to scroll */
  padding: 1rem; /* For internal spacing if create-post isn't full width or needs offset */
}

.create-post {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.create-post form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.create-post input[type="file"] {
  padding: 0.5rem;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
}
.create-post input[type="text"] {
  padding: 0.75rem;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
}
.create-post button {
  padding: 0.75rem 1.5rem;
  background-color: #0095f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}
.create-post button:hover {
  background-color: #0081d6;
}


.post {
  background-color: white;
  border: 1px solid #dbdbdb; /* Consistent with chatbot border */
  border-radius: 8px; /* More consistent radius */
  margin-bottom: 2rem; /* More spacing */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden; /* Ensure image corners adhere to border-radius */
}

.post-header {
  padding: 1rem; /* Increased padding */
  border-bottom: 1px solid #dbdbdb;
  font-weight: 600;
}

.post img {
  width: 100%;
  height: auto;
  display: block; /* Remove any space below image */
}

.post-caption {
  padding: 1rem;
  text-align: left;
  word-wrap: break-word; /* Prevent long words from breaking layout */
}
.post-caption strong {
  margin-right: 0.5em;
}


/* --- Styles for Chatbot Height Expansion --- */
.chatbot-column {
  display: flex;
  flex-direction: column; /* Title above Chatbot component */
  flex: 1; /* Takes remaining horizontal space (or defined proportion) */
  max-width: 400px;
  min-height: 0; /* Allow shrinking if necessary, important for flex children */
}

.chatbot-section-title {
  font-size: 1.75rem;
  color: #262626;
  margin-bottom: 1rem;
  padding-left: 0; /* Align with chatbot component if it has no outer padding */
  font-weight: 600;
  flex-shrink: 0; /* Title should not shrink */
}

.chatbot {
  flex-grow: 1; /* MODIFIED: Make chatbot component grow to fill chatbot-column */
  background-color: white;
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* MODIFIED: Important for containing children correctly */
  /* REMOVED: height: calc(100vh - 150px) or any other fixed height */
  /* REMOVED: padding: 20px; /* Padding will be on inner elements */
}

.chat-messages {
  flex-grow: 1; /* MODIFIED: Allow message area to expand */
  overflow-y: auto; /* Keep for scrolling */
  padding: 1rem; /* Consistent padding inside message area */
  /* REMOVED: max-height, margin-bottom */
}

.message {
  margin-bottom: 1rem; /* Spacing between messages */
  padding: 0.75rem 1rem; /* Padding inside each message bubble */
  border-radius: 12px; /* Softer radius for messages */
  max-width: 85%; /* Slightly more width for messages */
  line-height: 1.4;
  word-wrap: break-word; /* Ensure long words wrap */
}

.message.user {
  background-color: #0095f6;
  color: white;
  margin-left: auto; /* Align to right */
}

.message.bot {
  background-color: #e4e6eb; /* Lighter grey for bot messages */
  color: #050505; /* Darker text for bot messages for contrast */
  margin-right: auto; /* Align to left */
}

.chat-input {
  display: flex;
  padding: 1rem; /* Padding around input and button */
  border-top: 1px solid #dbdbdb;
  gap: 1rem;
  flex-shrink: 0; /* MODIFIED: Prevent input area from shrinking */
  background-color: #f0f2f5; /* Slight distinction for input area */
}

.chat-input input {
  flex-grow: 1;
  padding: 0.75rem;
  border: 1px solid #ccd0d5; /* Slightly different border for input */
  border-radius: 18px; /* Pill shape input */
  background-color: white;
}
.chat-input input:focus {
  border-color: #0095f6;
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 149, 246, 0.2);
}

.chat-input button {
  padding: 0.75rem 1.5rem;
  background-color: #0095f6;
  color: white;
  border: none;
  border-radius: 18px; /* Pill shape button */
  cursor: pointer;
  font-weight: 600;
}

.chat-input button:disabled {
  background-color: #b2dffc;
  cursor: not-allowed;
}
.chat-input button:hover:not(:disabled) {
  background-color: #0081d6;
}

/* --- End of Chatbot Height Expansion Styles --- */


.logout-button {
  padding: 0.5rem 1rem;
  background-color: #ed4956;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}
.logout-button:hover {
  background-color: #c13584;
}

.message.isError {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}

.chatbot .loading { /* Combined with .message.bot for styling if thinking is a bot message */
  color: #666;
  font-style: italic;
}
.chatbot .loading:after {
  content: "...";
  animation: loading 1s infinite steps(3, end);
  display: inline-block; /* Needed for steps animation to show dots one by one */
}

@keyframes loading {
  0% { content: "."; }
  33% { content: ".."; }
  66% { content: "..."; }
}


/* --- Login Page Enhancements --- */
/* --- Modern Abstract Background for Login Page --- */
.login-page-bg {
  min-height: 100vh;
  width: 100vw; /* Full viewport width */
  position: relative; /* For absolute positioning of children */
  overflow: hidden; /* Hide parts of SVG that might extend out */
  /* Solid fallback color or primary gradient color */
  background: #1b2a41; /* Dark blue-gray base for the gradient */
  display: flex; /* To center login-page-container */
  align-items: center;
  justify-content: center;
}

.login-bg-svg {
  position: absolute;
  inset: 0; /* Cover entire .login-page-bg */
  width: 100%; /* SVG should fill its parent */
  height: 100%; /* SVG should fill its parent */
  z-index: 0; /* Behind other content */
  pointer-events: none; /* SVG should not capture mouse events */
}

.login-bg-glass {
  position: absolute;
  inset: 0; /* Cover entire .login-page-bg */
  z-index: 1; /* Above SVG, below form */
  background: rgba(30, 34, 54, 0.35); /* Slightly less opacity for the glass effect */
  backdrop-filter: blur(12px); /* Slightly less blur for performance, adjust as needed */
  pointer-events: none;
}

/* This is the container that gets centered by login-page-bg's flex properties.
   It needs to be on top of the SVG and glass effect. */
.login-page-container {
  position: relative; /* Ensure z-index works */
  z-index: 2; /* Above SVG and glass layer */
  display: flex; /* For centering the form wrapper */
  justify-content: center;
  align-items: center;
  width: 100%; /* Takes full width within the centered .login-page-bg context if needed */
  padding: 20px; /* Padding so form doesn't touch edges on small screens */
  /* background: none; /* IMPORTANT: Make this transparent so SVG & glass effect show through */
  /* min-height can be removed if .login-page-bg handles the 100vh centering */
}

.login-form-wrapper {
  background-color: rgba(255, 255, 255, 0.9); /* Slightly transparent white for a softer look on glass */
  padding: 30px 40px; /* Adjust padding */
  border-radius: 12px; /* More modern radius */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); /* More pronounced shadow for depth */
  width: 100%;
  max-width: 420px; /* Slightly wider form */
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.18); /* Subtle border for the glass card */
}

.login-app-title {
  font-size: 2.25rem; /* Larger app title */
  color: #131722; /* Darker, more contemporary color */
  margin-bottom: 1.5rem; /* Adjust spacing */
  font-weight: 700; /* Bolder title */
}

.login-form-heading {
  font-size: 1.75rem; /* Heading for "Login" */
  color: #333;
  margin-bottom: 2.5rem; /* More space */
  font-weight: 600;
}

.login-form-actual .form-group {
  margin-bottom: 1.75rem; /* Increased space */
  text-align: left;
}

.login-form-actual label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.6rem; /* More space */
  color: #3f4550; /* Slightly adjusted label color */
}

.login-form-actual input[type="text"],
.login-form-actual input[type="password"] {
  width: 100%;
  padding: 0.9rem 1rem; /* More padding */
  border: 1px solid #d1d9e6; /* Softer border */
  border-radius: 8px; /* Consistent radius */
  font-size: 1rem;
  background-color: #f9faff; /* Very light background for inputs */
}
.login-form-actual input[type="text"]:focus,
.login-form-actual input[type="password"]:focus {
  border-color: #0095f6;
  box-shadow: 0 0 0 3px rgba(0, 149, 246, 0.15); /* Adjusted focus shadow */
  outline: none;
  background-color: #fff;
}

.login-button {
  width: 100%;
  padding: 0.9rem; /* Match input padding */
  background-color: #0095f6;
  color: white;
  border: none;
  border-radius: 8px; /* Consistent radius */
  cursor: pointer;
  font-size: 1.05rem; /* Slightly larger font */
  font-weight: 600;
  transition: background-color 0.2s ease, transform 0.1s ease;
}
.login-button:hover {
  background-color: #0081d6;
  transform: translateY(-1px); /* Subtle lift effect */
}
.login-button:active {
  transform: translateY(0px); /* Button press effect */
}


/* Responsive adjustments for smaller screens (Login Page) */
@media (max-width: 600px) {
  .login-form-wrapper {
    padding: 24px; /* Reduce padding on small screens */
    margin: 0 10px; /* Add horizontal margin to prevent touching screen edges */
    max-width: calc(100% - 20px); /* Ensure it fits within viewport padding */
  }
  .login-app-title {
    font-size: 1.8rem;
  }
  .login-form-heading {
    font-size: 1.4rem;
  }
}

/* ...existing code... */

/* Add new background styles */
.app-container {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1b26 0%, #24283b 100%);
  overflow: hidden;
}

.background-shapes {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.shape {
  position: absolute;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(4px);
  border-radius: 50%;
}

.shape-1 {
  width: 300px;
  height: 300px;
  top: -50px;
  left: -50px;
  background: radial-gradient(circle, rgba(41, 98, 255, 0.05), rgba(41, 98, 255, 0.02));
}

.shape-2 {
  width: 500px;
  height: 500px;
  bottom: -100px;
  right: -100px;
  background: radial-gradient(circle, rgba(255, 82, 82, 0.05), rgba(255, 82, 82, 0.02));
}

/* Add subtle glass effect to main content */
.main-content {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  margin: 20px;
  padding: 20px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

/* Enhance post container styling */
.post-container {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  border-radius: 12px;
  transition: transform 0.2s ease;
}

.post-container:hover {
  transform: translateY(-2px);
}

/* Responsive adjustments for main dashboard (general) */
@media (max-width: 768px) { /* Tablet and smaller */
  .main-content {
    flex-direction: column; /* Stack feed and chatbot on smaller screens */
    margin-top: 1rem; /* Reduce top margin */
    padding: 10px; /* Reduce padding */
    gap: 1.5rem; /* Reduce gap */
  }
  .feed, .chatbot-column {
    max-width: 100%; /* Allow them to take full width in column layout */
    flex: none; /* Reset flex factor if needed */
  }
    .chatbot {
      /* Adjust height more conservatively on mobile if full height feels too much */
      /* Or keep flex-grow: 1 if parent chatbot-column allows for good height distribution */
    }
  }






  ------------reportWebVitals.js------------
  const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;








--------index.css--------
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}





----------App.test.js----------
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});






----------manifest.json----------
{
  "name": "Social Media Chatbot",
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}