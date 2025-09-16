---
title: Juno AI - Advanced AI Assistant
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
---

# Juno AI - Advanced AI Assistant

🤖 **Juno AI** is an advanced conversational AI assistant with document processing, web scraping, memory management, and RAG (Retrieval Augmented Generation) capabilities.

## Features

- 🧠 **Intelligent Conversation**: Natural conversation with memory retention
- 📄 **Document Processing**: Upload and analyze PDF documents with OCR support
- 🌐 **Web Scraping**: Extract and analyze content from web URLs
- 💭 **Memory Management**: Remembers context across conversations
- 🔍 **RAG Search**: Smart retrieval from uploaded documents
- 🎯 **Multi-Modal Support**: Text, voice input, and document analysis
- 🌙 **Dark/Light Theme**: Customizable interface
- 💾 **Conversation History**: Save and load previous conversations

## Technology Stack

- **Backend**: Flask with Python
- **AI Model**: Google Gemini 1.5 Flash
- **Vector Store**: ChromaDB with HuggingFace embeddings
- **Document Processing**: PyPDF2 with OCR fallback
- **Web Scraping**: BeautifulSoup4
- **Frontend**: Vanilla JavaScript with modern CSS

## How to Use

1. Start a conversation by typing your message
2. Upload PDF documents for analysis and Q&A
3. Use web scraping to analyze online content
4. Access conversation history and memory
5. Switch between light and dark themes

## Environment Variables Required

- `GEMINI_API_KEY`: Your Google Gemini API key

## Local Development

1. Install dependencies: `pip install -r requirements.txt`
2. Set up environment variables
3. Run: `python app.py`

Built with ❤️ using Flask and Google Gemini AI
