<!-- Juno AI - Advanced AI Assistant -->

<p align="center">
  <img src="https://em-content.zobj.net/source/microsoft-teams/363/robot_1f916.png" width="100" height="100" alt="Juno AI" />
</p>

<h1 align="center">Juno AI 🤖</h1>
<h3 align="center">The Ultimate Conversational AI, Document Processor, and Web Scraping Assistant</h3>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/KURUPRASATH-J/JUNO-TEST?style=flat-square" alt="License" /></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.10+-blue.svg?style=flat-square" alt="Python version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/AI%20Model-Gemini%201.5%20Flash-8A2BE2?style=flat-square" alt="AI Gemini" /></a>
</p>

---

Juno AI is a state-of-the-art, open-source conversational AI platform featuring robust document processing, web scraping, persistent memory, and advanced Retrieval Augmented Generation (RAG) capabilities. Built for researchers, students, and developers seeking the perfect blend of AI, automation, and open extensibility.

---

## 🚀 Key Features

- **Conversational Memory**: Natural, contextual conversations with persistent memory and summarization.
- **Document Intelligence**: Effortlessly upload, scan, and Q&A on PDFs—OCR included for scanned or image documents.
- **Web Scraping**: Instantly extract and analyze online web pages and content using intelligent scraping.
- **RAG Search**: Ultra-fast, context-aware document search using ChromaDB and HuggingFace vector embeddings.
- **Multi-Modal Interface**: Supports text, voice interactions, and drag-and-drop document uploads.
- **Theme Switching**: Light/Dark mode toggle for all-day productivity.
- **Conversation History**: Autosaves chats for review and learning.
- **API First**: Modular backend and frontend for hacking, extension, or integration.
- **Open Source & Community Driven**: MIT license, hack away and contribute!

---

## 🛠️ Core Tech Stack

| Layer        | Technology Used                         | Details                                      |
|--------------|----------------------------------------|----------------------------------------------|
| **Backend**  | Flask (Python 3.10+)                   | REST API driven, high-performance            |
| **AI Model** | Google Gemini 1.5 Flash                | Advanced LLM for conversational intelligence |
| **Vector DB**| ChromaDB + HuggingFace Embeddings      | Lightning-fast vector search                 |
| **PDF/OCR**  | PyPDF2, OCR (Fallback: Tesseract)      | Accurate document and image text capture     |
| **Web Scrape**| BeautifulSoup4, Requests              | Reliable, flexible data collection           |
| **Frontend** | Vanilla JS, CSS, HTML5                 | Responsive, clean UI for all devices         |
| **Container**| Docker, Dockerfile                     | Hassle-free cloud or local deployment        |

---

## 🎯 Use Cases

- Chatbot for intelligent support
- Research assistant with PDF/web summarization
- Automated Q&A on uploaded documents
- Knowledge search within a corpus
- Programmable AI for workflow automation

---

## 🌈 Beautiful UI

<p align="center">
  <img alt="Juno AI Demo" src="https://placehold.co/700x300/blue/purple?text=Juno+AI+Demo+Screenshot" width="700" />
<br>
  <em>Add your own screenshots or screen recordings here for visual appeal!</em>
</p>

---

## 📝 Getting Started

### 1. Clone the Repo

```sh
git clone https://github.com/KURUPRASATH-J/JUNO-TEST.git
cd JUNO-TEST
```

### 2. Install Backend Dependencies

Requires **Python 3.10+** (recommend using [pyenv](https://github.com/pyenv/pyenv))

```sh
pip install -r requirements.txt
```

### 3. Set Environment Variables

Create a `.env` file at the root or copy `.env.example`.

```
GEMINI_API_KEY=your-google-gemini-api-key
SECRET_KEY=your-very-secret-key
# Add other configuration variables as needed
```

### 4. Run the App

```sh
python app.py
```
For Docker users:

```sh
docker build -t juno-ai .
docker run -p 5000:5000 --env-file .env juno-ai
```

### 5. Open the Frontend

Open your browser at [http://localhost:5000](http://localhost:5000) and enjoy 🥳

---

## ⚡ Example Usage

- **Smart Chat:** “Summarize the uploaded research paper about quantum computing.”
- **Web Scraping:** “Extract and list all <code>&lt;h2&gt;</code> headings from https://en.wikipedia.org/wiki/Artificial_intelligence”
- **Memory:** “What did I discuss about ‘project deadlines’ last week?”
- **Multi-Modal:** Upload a PDF, ask questions, toggle between chat and file modes.

---

## 🧩 Directory Structure

<details>
<summary>Click to expand project folders</summary>

```
.
├── backend/                # AI API and document parsing logic
│   ├── routes/             # API endpoints & services
│   ├── utils/              # Helper libraries & data processing
├── frontend/               # JavaScript, CSS, and HTML UI
├── static/                 # Static files (images, docs, assets)
├── requirements.txt        # Python dependencies
├── app.py                  # Flask launch point
├── .env.example            # Example environment config
├── Dockerfile              # Docker container definition
└── README.md
```
</details>

---

## 🛡️ Security

- API keys and secrets are always secured in `.env` (never committed)
- Rate limiting, XSS, and CSRF protections in backend and frontend
- CORS restrictions for safe web API use

---

## 🔮 Extending Juno AI

- Add new LLM providers in `backend/ai/`
- Build new document parsers in `backend/utils/`
- Tweak UI design in `frontend/`
- Connect to external APIs or plugins for workflow automation

---

## 🗺️ Roadmap

- [ ] 🎥 Add screen recording demo
- [ ] 🤝 Multi-user support & authentication
- [ ] 🪄 Plugin marketplace for custom skills
- [ ] 🖼️ Image-to-text & vision AI features

---

## 🤝 Contributing

We welcome PRs & feature requests!

- Fork, branch, and submit PRs with clear descriptions.
- File issues for bugs or feature ideas
- Discuss on [GitHub Discussions](https://github.com/KURUPRASATH-J/JUNO-TEST/discussions)

> **MIT License** — Feel free to use, build, and share.

---

<p align="center">
  <b>Built with ❤️ by KURUPRASATH-J and contributors</b>
</p>
