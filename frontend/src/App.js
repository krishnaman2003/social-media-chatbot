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