---------.env----------
FLASK_ENV=development
MISTRAL_API_KEY=enter-your-mistral-api-key
CORS_ORIGINS=http://localhost:3000



-------------main.py------------------
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import logging
from datetime import datetime
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Update CORS configuration
CORS(app, 
     resources={r"/*": {"origins": ["http://localhost:3000"], 
                       "methods": ["GET", "POST", "OPTIONS"],
                       "allow_headers": ["Content-Type", "Authorization"],
                       "supports_credentials": True}},
     expose_headers=["Content-Type", "Authorization"])

# Initialize Mistral API key
MISTRAL_API_KEY = os.environ.get('MISTRAL_API_KEY', 'DRu1QIJlHvGVYo2L9InrNCBfRrUQu8k3')
SYSTEM_MESSAGE = """You are a helpful and knowledgeable AI assistant. Your responses should be clear, accurate, and helpful."""

def init_db():
    """Initialize SQLite database for chat history"""
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS chat_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT,
                  message TEXT,
                  response TEXT,
                  timestamp DATETIME,
                  FOREIGN KEY (username) REFERENCES users(username))''')
    conn.commit()
    conn.close()
    logger.info("Chat database initialized successfully")

# Initialize database on startup
def initialize_app():
    init_db()

# Call initialization when the module loads
initialize_app()

@app.before_request
def setup():
    pass  # Database is already initialized on startup

def save_chat_history(username: str, message: str, response: str):
    """Save chat interaction to database"""
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    try:
        # Check for recent duplicate messages (within last 5 seconds)
        c.execute("""SELECT COUNT(*) FROM chat_history 
                    WHERE username = ? AND message = ? 
                    AND timestamp > datetime('now', '-5 seconds')""",
                    (username, message))
        
        if c.fetchone()[0] > 0:
            logger.warning(f"Duplicate message detected from {username}: {message}")
            return False
            
        # If not duplicate, save the message
        c.execute("""INSERT INTO chat_history (username, message, response, timestamp)
                    VALUES (?, ?, ?, datetime('now'))""",
                    (username, message, response))
        conn.commit()
        return True
    except sqlite3.Error as e:
        logger.error(f"Database error: {str(e)}")
        raise
    finally:
        conn.close()

def get_mistral_response(message: str) -> str:
    """Get response from Mistral API using direct HTTP request"""
    try:
        headers = {
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "mistral-tiny",
            "messages": [
                {"role": "system", "content": SYSTEM_MESSAGE},
                {"role": "user", "content": message}
            ]
        }
        
        logger.info(f"Sending request to Mistral API with message: {message}")
        
        # Make sure we're using HTTPS
        url = "https://api.mistral.ai/v1/chat/completions"
        response = requests.post(
            url,
            headers=headers,
            json=data,
            timeout=30,
            verify=True  # Enforce SSL verification
        )
        
        # Log the response status and headers for debugging
        logger.info(f"Response status: {response.status_code}")
        logger.info(f"Response headers: {response.headers}")
        
        response.raise_for_status()
        result = response.json()
        
        if "choices" in result and len(result["choices"]) > 0:
            response_text = result["choices"][0]["message"]["content"]
            logger.info(f"Successfully got response from Mistral API")
            return response_text
        else:
            logger.error(f"Unexpected API response format: {result}")
            return "I apologize, but I received an unexpected response format. Please try again."
            
    except requests.exceptions.RequestException as e:
        logger.error(f"API request error: {str(e)}")
        if isinstance(e, requests.exceptions.SSLError):
            return "I apologize, but there was a secure connection error. Please try again."
        elif isinstance(e, requests.exceptions.ConnectTimeout):
            return "I apologize, but the request timed out. Please try again."
        else:
            return f"I apologize, but I encountered a connection error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error in get_mistral_response: {str(e)}")
        return "I apologize, but something went wrong. Please try again."
  

def cleanup_database():
    """Remove any test or unwanted posts"""
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    try:
        # Delete the specific unwanted post
        c.execute("""DELETE FROM chat_history 
                    WHERE username = 'admin' AND message = 'hello world'""")
        deleted_count = c.rowcount
        conn.commit()
        logger.info(f"Cleaned up {deleted_count} unwanted messages")
    except sqlite3.Error as e:
        logger.error(f"Database cleanup error: {str(e)}")
        conn.rollback()
    finally:
        conn.close()

# Update chat endpoint with better error handling
@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
        
        message = data['message']
        username = data.get('username', 'anonymous')
        
        # Get response from Mistral with timeout
        try:
            response = get_mistral_response(message)
            if not response:
                raise Exception("Empty response from Mistral API")
                
            # Save to database only if we got a valid response
            if save_chat_history(username, message, response):
                return jsonify({
                    'response': response,
                    'timestamp': datetime.now().isoformat()
                })
            else:
                return jsonify({'error': 'Duplicate message detected'}), 429
                
        except requests.exceptions.Timeout:
            return jsonify({'error': 'Request to Mistral API timed out'}), 504
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Mistral API error: {str(e)}'}), 502
            
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/chat/history', methods=['GET'])
def get_chat_history():
    username = request.args.get('username', 'anonymous')
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    try:
        c.execute("""SELECT message, response, timestamp 
                    FROM chat_history 
                    WHERE username = ? 
                    ORDER BY timestamp DESC""", (username,))
        history = [{'message': row[0], 'response': row[1], 'timestamp': row[2]} 
                  for row in c.fetchall()]
        return jsonify(history)
    except sqlite3.Error as e:
        logger.error(f"Database error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)



----------requirements.txt---------------
flask>=2.0.0
flask-cors>=4.0.0
requests>=2.31.0
python-dotenv>=1.0.0
SQLAlchemy>=2.0.23