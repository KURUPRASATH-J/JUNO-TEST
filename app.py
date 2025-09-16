import os
import json
import uuid
import time
import random
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.schema import Document
import PyPDF2
import io
import base64
from typing import List, Dict, Any
import requests
from bs4 import BeautifulSoup
import re
import pytesseract
from PIL import Image

# Import Juno AI Prompts System
from prompts import juno_prompts, get_main_conversation_prompt, get_document_summary_prompt, get_rag_prompt, get_streaming_prompt, get_fallback_responses

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

class ChatbotWithMemoryAndRAG:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )

        self.vectorstore = None
        self.chat_history = []
        self.memory = {}
        self.session_id = str(uuid.uuid4())
        self.last_rate_limit = None
        self.consecutive_rate_limits = 0

        # Initialize Juno AI Prompts System
        self.prompts = juno_prompts

        print(f"🤖 Juno AI initialized with session ID: {self.session_id}")

    def _retry_with_backoff(self, func, max_retries=5, base_delay=2):
        """Improved retry function with progressive backoff for rate limit handling"""

        # If we recently hit rate limits, wait longer before trying
        if self.last_rate_limit and datetime.now() - self.last_rate_limit < timedelta(seconds=30):
            additional_wait = min(self.consecutive_rate_limits * 5, 30)  # Up to 30 seconds
            print(f"Recent rate limits detected, waiting additional {additional_wait}s")
            time.sleep(additional_wait)

        for attempt in range(max_retries):
            try:
                result = func()
                # Reset rate limit tracking on success
                self.consecutive_rate_limits = 0
                self.last_rate_limit = None
                return result

            except ResourceExhausted as e:
                self.last_rate_limit = datetime.now()
                self.consecutive_rate_limits += 1

                if attempt == max_retries - 1:
                    print(f"Max retries ({max_retries}) exceeded for rate limit")
                    raise e

                # Progressive backoff with jitter: 2s, 6s, 14s, 30s, 62s
                delay = base_delay * (2 ** attempt) + random.uniform(1, 3)  # Add jitter
                delay = min(delay, 60)  # Cap at 60 seconds

                print(f"Rate limit hit (attempt {attempt + 1}/{max_retries}), waiting {delay:.1f}s...")
                time.sleep(delay)

            except GoogleAPIError as e:
                print(f"Google API Error: {e}")
                if "quota" in str(e).lower() or "rate" in str(e).lower():
                    # Treat as rate limit
                    self.last_rate_limit = datetime.now()
                    self.consecutive_rate_limits += 1

                    if attempt == max_retries - 1:
                        raise ResourceExhausted("API quota exceeded")

                    delay = base_delay * (2 ** attempt) + random.uniform(1, 3)
                    delay = min(delay, 60)
                    print(f"API quota issue, waiting {delay:.1f}s...")
                    time.sleep(delay)
                else:
                    raise e

            except Exception as e:
                # For non-rate-limit errors, don't retry
                print(f"Non-retryable error: {e}")
                raise e

    def _fallback_response(self, user_message):
        """Generate a fallback response when API is unavailable using Juno AI prompts"""

        # Use Juno AI fallback response templates
        fallback_templates = get_fallback_responses()

        # Select a template and personalize it
        template = random.choice(fallback_templates)
        response = template.format(
            user_message_preview=user_message[:50]
        )

        # Add to chat history so conversation continues
        self.chat_history.append({
            "user": user_message,
            "bot": response,
            "timestamp": datetime.now().isoformat(),
            "fallback": True
        })

        return response

    def extract_text_from_pdf(self, pdf_content):
        """Extract text content from PDF bytes with OCR fallback"""
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
            text = ""

            for page in pdf_reader.pages:
                page_text = page.extract_text()
                # Check if extracted text is substantial
                if page_text and len(page_text.strip()) > 10:  # Heuristic to check for actual content
                    text += page_text + "\n"
                else:
                    # Attempt OCR if text extraction is poor
                    try:
                        # Iterate through images on the page for OCR
                        for image_file_object in page.images:
                            img = Image.open(io.BytesIO(image_file_object.data))
                            ocr_text = pytesseract.image_to_string(img)
                            if ocr_text:
                                text += ocr_text + "\n"
                    except Exception as ocr_error:
                        # OCR can fail if no images, etc. Silently pass.
                        print(f"OCR fallback failed for a page: {ocr_error}")
                        pass

            return text
        except Exception as e:
            return f"Error extracting PDF: {str(e)}"

    def process_document(self, text_content, filename="document"):
        """Process document text and create vector store"""
        try:
            # Split text into chunks
            chunks = self.text_splitter.split_text(text_content)

            # Create documents
            documents = [
                Document(
                    page_content=chunk,
                    metadata={"source": filename, "chunk_id": i}
                )
                for i, chunk in enumerate(chunks)
            ]

            # Create or update vector store
            if self.vectorstore is None:
                self.vectorstore = Chroma.from_documents(
                    documents=documents,
                    embedding=self.embeddings,
                    collection_name=f"collection_{self.session_id}"
                )
            else:
                self.vectorstore.add_documents(documents)

            return f"Successfully processed {len(chunks)} chunks from {filename}"
        except Exception as e:
            return f"Error processing document: {str(e)}"

    def retrieve_relevant_context(self, query, k=3):
        """Retrieve relevant context from vector store"""
        if self.vectorstore is None:
            return ""

        try:
            docs = self.vectorstore.similarity_search(query, k=k)
            context = "\n".join([doc.page_content for doc in docs])
            return context
        except Exception as e:
            return ""

    def summarize_text(self, text, max_length=500):
        """Summarize long text using Juno AI prompts with improved rate limit handling"""
        def _summarize():
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Use Juno AI document summarization prompt
            prompt = self.prompts.get_document_summarization_prompt(text, max_length)

            response = model.generate_content(prompt)
            return response.text

        try:
            return self._retry_with_backoff(_summarize)
        except (ResourceExhausted, GoogleAPIError):
            return f"📄 Document uploaded successfully ({len(text)} characters). \n\n✨ **Juno AI Note:** Summary temporarily unavailable due to high API usage, but the document content is fully searchable and ready for your questions!"
        except Exception as e:
            return f"Error summarizing text: {str(e)}"

    def generate_response(self, user_message, context=""):
        """Generate response using Juno AI prompts with improved rate limit handling"""
        def _generate():
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Build conversation context for Juno AI
            conversation_history = []
            if self.chat_history:
                recent_history = self.chat_history[-3:]  # Last 3 exchanges
                for exchange in recent_history:
                    if not exchange.get('fallback', False):  # Skip fallback responses
                        conversation_history.append({
                            'user': exchange['user'],
                            'bot': exchange['bot'],
                            'timestamp': exchange.get('timestamp', '')
                        })

            # Use Juno AI conversation prompt with full context
            prompt = self.prompts.get_conversation_prompt(
                user_message=user_message,
                context=context,
                conversation_history=conversation_history,
                memory_context=self.memory
            )

            response = model.generate_content(prompt)
            return response.text

        try:
            bot_response = self._retry_with_backoff(_generate)

            # Update chat history
            self.chat_history.append({
                "user": user_message,
                "bot": bot_response,
                "timestamp": datetime.now().isoformat()
            })

            # Update memory with important information
            self.update_memory(user_message, bot_response)

            return bot_response

        except (ResourceExhausted, GoogleAPIError):
            return self._fallback_response(user_message)
        except Exception as e:
            return f"Error generating response: {str(e)}"

    def update_memory(self, user_message, bot_response):
        """Update session memory with important information"""
        # Simple memory update - in production, you'd want more sophisticated extraction
        current_time = datetime.now().isoformat()

        if "memory" not in self.memory:
            self.memory["memory"] = []

        self.memory["memory"].append({
            "user": user_message,
            "bot": bot_response,
            "timestamp": current_time
        })

        # Keep only last 10 interactions in memory
        if len(self.memory["memory"]) > 10:
            self.memory["memory"] = self.memory["memory"][-10:]

    def scrape_web_content(self, url):
        """Scrape content from a web URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }

            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()

            # Get text content
            text = soup.get_text()

            # Clean up text
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)

            return text[:10000]  # Limit to 10000 characters
        except Exception as e:
            return f"Error scraping URL: {str(e)}"

    def analyze_web_content(self, url, content):
        """Analyze scraped web content using Juno AI prompts"""
        def _analyze():
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Use Juno AI web content analysis prompt
            prompt = self.prompts.get_web_content_analysis_prompt(url, content)

            response = model.generate_content(prompt)
            return response.text

        try:
            return self._retry_with_backoff(_analyze)
        except (ResourceExhausted, GoogleAPIError):
            return f"🌐 **Web Content Scraped Successfully**\n\n**URL:** {url}\n**Content Length:** {len(content)} characters\n\n**Juno AI Note:** Analysis temporarily unavailable due to high API usage, but the content has been processed and is ready for your questions!"
        except Exception as e:
            return f"Error analyzing web content: {str(e)}"

    def generate_rag_response(self, user_query, context, sources=None):
        """Generate RAG response using Juno AI prompts"""
        def _generate_rag():
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Split context into chunks for better handling
            context_chunks = [context[i:i+2000] for i in range(0, len(context), 2000)]

            # Use Juno AI RAG prompt
            prompt = self.prompts.get_rag_response_prompt(
                user_query=user_query,
                retrieved_chunks=context_chunks[:3],  # Top 3 chunks
                source_info=sources
            )

            response = model.generate_content(prompt)
            return response.text

        try:
            return self._retry_with_backoff(_generate_rag)
        except (ResourceExhausted, GoogleAPIError):
            return self._fallback_response(user_query)
        except Exception as e:
            return f"Error generating RAG response: {str(e)}"

    def save_conversation(self, conversation_id, title=""):
        """Save current conversation to memory"""
        if not title:
            title = f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"

        conversation_data = {
            "id": conversation_id,
            "title": title,
            "messages": self.chat_history,
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat()
        }

        if "conversations" not in self.memory:
            self.memory["conversations"] = {}

        self.memory["conversations"][conversation_id] = conversation_data
        return conversation_data

    def load_conversation(self, conversation_id):
        """Load a specific conversation"""
        if "conversations" in self.memory and conversation_id in self.memory["conversations"]:
            conversation = self.memory["conversations"][conversation_id]
            self.chat_history = conversation["messages"]
            return conversation
        return None

    def delete_conversation(self, conversation_id):
        """Delete a specific conversation"""
        if "conversations" in self.memory and conversation_id in self.memory["conversations"]:
            del self.memory["conversations"][conversation_id]
            return True
        return False

    def rename_conversation(self, conversation_id, new_title):
        """Rename a conversation"""
        if "conversations" in self.memory and conversation_id in self.memory["conversations"]:
            self.memory["conversations"][conversation_id]["title"] = new_title
            self.memory["conversations"][conversation_id]["last_updated"] = datetime.now().isoformat()
            return True
        return False

    def generate_streaming_response(self, user_message, context=""):
        """Generate streaming response using Juno AI prompts with improved rate limit handling"""
        def _generate_stream():
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Use Juno AI streaming prompt (optimized for speed)
            prompt = self.prompts.get_streaming_response_prompt(user_message, context)

            response = model.generate_content(prompt, stream=True)
            return response

        try:
            return self._retry_with_backoff(_generate_stream, max_retries=3, base_delay=1)
        except (ResourceExhausted, GoogleAPIError):
            return None
        except Exception as e:
            return None

# Initialize Juno AI chatbot
chatbot = ChatbotWithMemoryAndRAG()

@app.route('/')
def serve_frontend():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # Retrieve relevant context
        context = chatbot.retrieve_relevant_context(user_message)

        # Generate response using Juno AI prompts
        if context:
            # Use RAG response for document-based queries
            bot_response = chatbot.generate_rag_response(user_message, context)
        else:
            # Use regular conversation response
            bot_response = chatbot.generate_response(user_message, context)

        return jsonify({
            'response': bot_response,
            'has_context': bool(context),
            'session_id': chatbot.session_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_document():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if file and file.filename.lower().endswith('.pdf'):
            # Read PDF content
            pdf_content = file.read()

            # Extract text
            text_content = chatbot.extract_text_from_pdf(pdf_content)

            if text_content.startswith("Error"):
                return jsonify({'error': text_content}), 400

            # Process document
            result = chatbot.process_document(text_content, file.filename)

            # Generate Juno AI summary
            summary = chatbot.summarize_text(text_content)

            return jsonify({
                'message': result,
                'summary': summary,
                'filename': file.filename,
                'text_length': len(text_content)
            })
        else:
            return jsonify({'error': 'Only PDF files are supported'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/summarize', methods=['POST'])
def summarize_document():
    try:
        data = request.json
        text = data.get('text', '')
        max_length = data.get('max_length', 500)

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Use Juno AI summarization
        summary = chatbot.summarize_text(text, max_length)

        return jsonify({
            'summary': summary,
            'original_length': len(text),
            'summary_length': len(summary)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/memory', methods=['GET'])
def get_memory():
    return jsonify({
        'memory': chatbot.memory,
        'chat_history_length': len(chatbot.chat_history),
        'has_vectorstore': chatbot.vectorstore is not None,
        'session_id': chatbot.session_id
    })

@app.route('/api/clear', methods=['POST'])
def clear_session():
    global chatbot
    chatbot = ChatbotWithMemoryAndRAG()
    return jsonify({'message': 'Juno AI session cleared successfully'})

@app.route('/api/scrape', methods=['POST'])
def scrape_url():
    try:
        data = request.json
        url = data.get('url', '')

        if not url:
            return jsonify({'error': 'No URL provided'}), 400

        # Validate URL format
        if not re.match(r'^https?://', url):
            url = 'https://' + url

        content = chatbot.scrape_web_content(url)

        if content.startswith("Error"):
            return jsonify({'error': content}), 400

        # Process the scraped content
        result = chatbot.process_document(content, f"Web: {url}")

        # Use Juno AI web content analysis
        analysis = chatbot.analyze_web_content(url, content)

        return jsonify({
            'message': result,
            'summary': analysis,
            'url': url,
            'content_length': len(content)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    try:
        data = request.json
        user_message = data.get('message', '')

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # Retrieve relevant context
        context = chatbot.retrieve_relevant_context(user_message)

        # Generate streaming response using Juno AI prompts
        streaming_response = chatbot.generate_streaming_response(user_message, context)

        if streaming_response is None:
            # Fallback to regular response if streaming fails
            if context:
                bot_response = chatbot.generate_rag_response(user_message, context)
            else:
                bot_response = chatbot.generate_response(user_message, context)
            return jsonify({
                'response': bot_response,
                'has_context': bool(context),
                'session_id': chatbot.session_id,
                'streaming': False
            })

        # Collect streaming response
        full_response = ""
        response_chunks = []

        try:
            for chunk in streaming_response:
                if chunk.text:
                    full_response += chunk.text
                    response_chunks.append(chunk.text)
        except (ResourceExhausted, GoogleAPIError):
            # If rate limited during streaming, fallback to regular response
            if context:
                bot_response = chatbot.generate_rag_response(user_message, context)
            else:
                bot_response = chatbot.generate_response(user_message, context)
            return jsonify({
                'response': bot_response,
                'has_context': bool(context),
                'session_id': chatbot.session_id,
                'streaming': False
            })

        # Update chat history
        chatbot.chat_history.append({
            "user": user_message,
            "bot": full_response,
            "timestamp": datetime.now().isoformat()
        })

        # Update memory
        chatbot.update_memory(user_message, full_response)

        return jsonify({
            'response': full_response,
            'chunks': response_chunks,
            'has_context': bool(context),
            'session_id': chatbot.session_id,
            'streaming': True
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    try:
        conversations = []
        if "conversations" in chatbot.memory:
            for conv_id, conv_data in chatbot.memory["conversations"].items():
                conversations.append({
                    'id': conv_id,
                    'title': conv_data['title'],
                    'created_at': conv_data['created_at'],
                    'last_updated': conv_data['last_updated'],
                    'message_count': len(conv_data['messages'])
                })

        # Sort by last updated, newest first
        conversations.sort(key=lambda x: x['last_updated'], reverse=True)

        return jsonify({'conversations': conversations})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/conversations', methods=['POST'])
def save_conversation():
    try:
        data = request.json
        conversation_id = data.get('id', str(uuid.uuid4()))
        title = data.get('title', '')

        conversation = chatbot.save_conversation(conversation_id, title)

        return jsonify({
            'message': 'Conversation saved successfully',
            'conversation': conversation
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/conversations/<conversation_id>', methods=['GET'])
def load_conversation(conversation_id):
    try:
        conversation = chatbot.load_conversation(conversation_id)
        if conversation:
            return jsonify({
                'message': 'Conversation loaded successfully',
                'conversation': conversation
            })
        else:
            return jsonify({'error': 'Conversation not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    try:
        success = chatbot.delete_conversation(conversation_id)
        if success:
            return jsonify({'message': 'Conversation deleted successfully'})
        else:
            return jsonify({'error': 'Conversation not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/conversations/<conversation_id>/rename', methods=['PUT'])
def rename_conversation(conversation_id):
    try:
        data = request.json
        new_title = data.get('title', '')

        if not new_title:
            return jsonify({'error': 'No title provided'}), 400

        success = chatbot.rename_conversation(conversation_id, new_title)
        if success:
            return jsonify({'message': 'Conversation renamed successfully'})
        else:
            return jsonify({'error': 'Conversation not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages/<int:message_index>/edit', methods=['PUT'])
def edit_message(message_index):
    try:
        data = request.json
        new_message = data.get('message', '')

        if not new_message:
            return jsonify({'error': 'No message provided'}), 400

        if 0 <= message_index < len(chatbot.chat_history):
            # Update the user message
            chatbot.chat_history[message_index]['user'] = new_message
            chatbot.chat_history[message_index]['edited'] = True
            chatbot.chat_history[message_index]['edited_at'] = datetime.now().isoformat()

            # Remove subsequent messages (bot response and after)
            chatbot.chat_history = chatbot.chat_history[:message_index + 1]

            return jsonify({
                'message': 'Message edited successfully',
                'updated_history': chatbot.chat_history
            })
        else:
            return jsonify({'error': 'Invalid message index'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Juno AI Server...")
    print("🤖 Advanced AI Assistant with Document Processing, Web Scraping, and Memory")
    print("🌟 Powered by Juno AI Prompts System")
    app.run(debug=False, host='0.0.0.0', port=7860)
