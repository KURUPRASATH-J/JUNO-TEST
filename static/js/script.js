class ChatbotUI {
    constructor() {
        // --- Auth guard: redirect to login if not authenticated ---
        this.authToken = localStorage.getItem('juno_auth_token');
        this.userEmail = localStorage.getItem('juno_user_name') || localStorage.getItem('juno_user_email') || 'User';
        if (!this.authToken) {
            window.location.replace('/');
            return;
        }

        // Auto-detect API base URL for different deployment environments
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.apiBase = 'http://localhost:7860/api';
        } else {
            // For Hugging Face Spaces or other deployments, use relative path
            this.apiBase = '/api';
        }
        this.isTyping = false;
        this.hasDocuments = false;
        this.conversations = [];
        this.currentConversationId = null;
        this.isStreaming = false;

        // Speech recognition properties
        this.recognition = null;
        this.isRecording = false;
        this.isListening = false;

        // Sidebar state
        this.activeTab = 'recents';
        this.pinnedChats = JSON.parse(localStorage.getItem('juno_pinned_chats') || '[]');
        this.archivedChats = JSON.parse(localStorage.getItem('juno_archived_chats') || '[]');
        this.searchQuery = '';
        this.settingsExpanded = false;
        this.activeContextMenu = null;

        // Feature 3: Thinking animation text cycling
        this.thinkingTextInterval = null;
        this.thinkingTexts = ['Thinking...', 'Analyzing...', 'Composing...', 'Reasoning...'];
        this.thinkingTextIndex = 0;

        // Feature 5: Persona state
        this.activePersona = localStorage.getItem('juno_active_persona') || 'default';

        // Feature 6: Streaming state
        this.streamingAbortController = null;

        // Feature 1: Liked messages tracking
        this.likedMessages = [];
        this.dislikedMessages = [];

        // Feature 4: Prompt Library Data
        this.promptLibrary = [
            { category: 'writing', icon: '✍️', title: 'Write an Essay', desc: 'Draft a well-structured essay on any topic', prompt: 'Write a comprehensive essay about ' },
            { category: 'writing', icon: '📧', title: 'Professional Email', desc: 'Compose a polished business email', prompt: 'Write a professional email about ' },
            { category: 'writing', icon: '📝', title: 'Blog Post', desc: 'Create an engaging blog post', prompt: 'Write an engaging blog post about ' },
            { category: 'writing', icon: '📋', title: 'Cover Letter', desc: 'Draft a compelling cover letter', prompt: 'Write a cover letter for a position as ' },
            { category: 'code', icon: '💻', title: 'Code Review', desc: 'Review and improve your code', prompt: 'Review and improve the following code:\n\n' },
            { category: 'code', icon: '🐛', title: 'Debug Code', desc: 'Find and fix bugs in your code', prompt: 'Debug the following code and explain the issues:\n\n' },
            { category: 'code', icon: '📐', title: 'Design Pattern', desc: 'Implement a software design pattern', prompt: 'Explain and implement the following design pattern: ' },
            { category: 'code', icon: '⚡', title: 'Optimize Code', desc: 'Optimize code for performance', prompt: 'Optimize the following code for better performance:\n\n' },
            { category: 'research', icon: '🔍', title: 'Research Summary', desc: 'Summarize research on a topic', prompt: 'Provide a comprehensive research summary on ' },
            { category: 'research', icon: '📊', title: 'Data Analysis', desc: 'Analyze and interpret data', prompt: 'Analyze the following data and provide insights:\n\n' },
            { category: 'research', icon: '📈', title: 'Market Analysis', desc: 'Analyze market trends', prompt: 'Provide a detailed market analysis for ' },
            { category: 'creative', icon: '🎨', title: 'Story Starter', desc: 'Generate a creative story beginning', prompt: 'Write a creative story that begins with ' },
            { category: 'creative', icon: '🎭', title: 'Character Profile', desc: 'Create detailed character profiles', prompt: 'Create a detailed character profile for ' },
            { category: 'creative', icon: '🎵', title: 'Song Lyrics', desc: 'Write original song lyrics', prompt: 'Write song lyrics about ' },
            { category: 'business', icon: '💼', title: 'Business Plan', desc: 'Create a business plan outline', prompt: 'Create a detailed business plan outline for ' },
            { category: 'business', icon: '📣', title: 'Marketing Strategy', desc: 'Develop a marketing strategy', prompt: 'Develop a comprehensive marketing strategy for ' },
            { category: 'business', icon: '🤝', title: 'Pitch Deck', desc: 'Create a startup pitch', prompt: 'Create a pitch deck outline for ' },
            { category: 'learning', icon: '📚', title: 'Explain Concept', desc: 'Break down complex topics', prompt: 'Explain the following concept in simple terms: ' },
            { category: 'learning', icon: '🧠', title: 'Quiz Me', desc: 'Test your knowledge with a quiz', prompt: 'Create a 10-question quiz about ' },
            { category: 'learning', icon: '🗺️', title: 'Learning Path', desc: 'Create a study roadmap', prompt: 'Create a detailed learning roadmap for mastering ' },
        ];

        // Feature 5: Personas Data
        this.personas = [
            { id: 'default', icon: '🤖', name: 'Default', desc: 'Balanced, helpful, and versatile assistant', color: '#667eea' },
            { id: 'creative_writer', icon: '🎨', name: 'Creative Writer', desc: 'Artistic, poetic, and metaphor-rich language', color: '#f97316' },
            { id: 'code_expert', icon: '💻', name: 'Code Expert', desc: 'Technical, precise, always includes code', color: '#22c55e' },
            { id: 'researcher', icon: '🔬', name: 'Researcher', desc: 'Academic, citation-heavy, structured analysis', color: '#3b82f6' },
            { id: 'study_buddy', icon: '📚', name: 'Study Buddy', desc: 'Simplified explanations, uses analogies and quizzes', color: '#a855f7' },
            { id: 'business_advisor', icon: '💼', name: 'Business Advisor', desc: 'Professional, strategic, ROI-focused insights', color: '#14b8a6' },
        ];

        this.initializeElements();
        this.attachEventListeners();
        this.configureMarkdown();
        this.applyInitialTheme();
        this.loadConversations();
        this.initializeSpeechRecognition();
        this.displayUserInfo();
        this.initDragAndDrop();
        this.initKeyboardShortcuts();
        this.renderPromptLibrary();
        this.renderPersonaCards();
        this.loadCurrentPersona();
        this.renderDynamicWelcome();
    }

    initializeElements() {
        // Main elements
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.fileInput = document.getElementById('fileInput');
        this.documentStatus = document.getElementById('documentStatus');
        this.welcomeMessage = document.getElementById('welcomeMessage');

        // Buttons
        this.attachBtn = document.getElementById('attachBtn');
        this.memoryBtn = document.getElementById('memoryBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.stopVoiceBtn = document.getElementById('stopVoiceBtn');
        this.conversationsBtn = document.getElementById('conversationsBtn');
        this.shareBtn = document.getElementById('shareBtn');
        this.floatingNewChatBtn = document.getElementById('floatingNewChatBtn');

        // Auth elements
        this.logoutBtn = document.getElementById('logoutBtn');

        // Modal and sidebar
        this.memoryModal = document.getElementById('memoryModal');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.memoryContent = document.getElementById('memoryContent');
        this.sidebar = document.getElementById('sidebar');
        this.closeSidebarBtn = document.getElementById('closeSidebarBtn');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');

        // Sidebar elements
        this.sidebarSearchInput = document.getElementById('sidebarSearchInput');
        this.settingsToggle = document.getElementById('settingsToggle');
        this.settingsBody = document.getElementById('settingsBody');
        this.themeSwitcher = document.getElementById('themeSwitcher');

        // Voice modal and loading
        this.voiceModal = document.getElementById('voiceModal');
        this.loadingOverlay = document.getElementById('loadingOverlay');

        // Feature elements
        this.dropZone = document.getElementById('dropZone');
        this.shortcutsModal = document.getElementById('shortcutsModal');
        this.promptLibraryModal = document.getElementById('promptLibraryModal');
        this.personaSelectorModal = document.getElementById('personaSelectorModal');
        this.personaBadge = document.getElementById('personaBadge');
        this.shareDropdown = document.getElementById('shareDropdown');
    }

    // ══════════════════════════════════════════════════════
    // FEATURE 2: RICH MARKDOWN RENDERING
    // ══════════════════════════════════════════════════════

    configureMarkdown() {
        if (typeof marked !== 'undefined') {
            const renderer = new marked.Renderer();

            // Custom code block renderer with copy button and language header
            renderer.code = function(code, language) {
                // Handle marked v12+ object format
                let codeText = code;
                let lang = language || '';
                if (typeof code === 'object' && code !== null) {
                    codeText = code.text || '';
                    lang = code.lang || '';
                }
                const validLang = lang && hljs.getLanguage(lang) ? lang : '';
                const highlighted = validLang
                    ? hljs.highlight(codeText, { language: validLang }).value
                    : hljs.highlightAuto(codeText).value;
                const displayLang = lang || 'code';
                return `<pre><div class="code-block-header"><span class="code-block-lang">${displayLang}</span><button class="code-copy-btn" onclick="chatbot.copyCodeBlock(this)"><i class="fas fa-copy"></i> Copy</button></div><code class="hljs language-${displayLang}">${highlighted}</code></pre>`;
            };

            marked.setOptions({
                renderer: renderer,
                breaks: true,
                gfm: true,
                headerIds: false
            });
        }
    }

    renderMarkdown(text) {
        if (typeof marked !== 'undefined') {
            try {
                // Step 1: Protect math expressions from markdown parsing
                const mathBlocks = [];
                let processed = text;

                // Protect display math ($$...$$) first — multiline
                processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
                    const idx = mathBlocks.length;
                    mathBlocks.push({ type: 'display', content: math.trim() });
                    return `%%MATH_BLOCK_${idx}%%`;
                });

                // Protect inline math ($...$) — single line, non-greedy
                processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
                    const idx = mathBlocks.length;
                    mathBlocks.push({ type: 'inline', content: math.trim() });
                    return `%%MATH_BLOCK_${idx}%%`;
                });

                // Step 2: Parse markdown on the protected text
                let html = marked.parse(processed);

                // Step 3: Restore math expressions — render with KaTeX if available
                html = html.replace(/%%MATH_BLOCK_(\d+)%%/g, (match, idxStr) => {
                    const idx = parseInt(idxStr);
                    const block = mathBlocks[idx];
                    if (!block) return match;

                    if (typeof katex !== 'undefined') {
                        try {
                            return katex.renderToString(block.content, {
                                displayMode: block.type === 'display',
                                throwOnError: false,
                                output: 'htmlAndMathml'
                            });
                        } catch (e) {
                            console.warn('KaTeX render failed for:', block.content, e);
                            // Fallback: show the raw math in a styled span
                            const tag = block.type === 'display' ? 'div' : 'span';
                            return `<${tag} class="math-fallback">${this.escapeHtml(block.content)}</${tag}>`;
                        }
                    } else {
                        // KaTeX not loaded yet — show readable fallback
                        const tag = block.type === 'display' ? 'div' : 'span';
                        return `<${tag} class="math-fallback">${this.escapeHtml(block.content)}</${tag}>`;
                    }
                });

                return html;
            } catch (e) {
                console.warn('Markdown parse failed, falling back:', e);
                return this.formatMessageFallback(text);
            }
        }
        return this.formatMessageFallback(text);
    }

    formatMessageFallback(text) {
        // Even in fallback mode, try to render math with KaTeX
        let result = text;

        if (typeof katex !== 'undefined') {
            // Render display math
            result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
                try {
                    return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
                } catch (e) { return match; }
            });
            // Render inline math
            result = result.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
                try {
                    return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
                } catch (e) { return match; }
            });
        }

        return result
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    copyCodeBlock(btn) {
        const codeBlock = btn.closest('pre').querySelector('code');
        const text = codeBlock.textContent;
        navigator.clipboard.writeText(text).then(() => {
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                btn.classList.remove('copied');
            }, 2000);
        });
    }

    initializeSpeechRecognition() {
        // Check if speech recognition is supported
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            // Configure recognition settings
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            // Event handlers
            this.recognition.onstart = () => {
                console.log('🎤 Speech recognition started');
                this.isListening = true;
                this.voiceBtn.classList.add('voice-recording');
                this.showVoiceModal();
            };

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                // Update input field with transcription
                this.messageInput.value = finalTranscript + interimTranscript;
                this.autoResizeInput();
                this.updateSendButton();
            };

            this.recognition.onerror = (event) => {
                console.error('🎤 Speech recognition error:', event.error);
                this.showNotification(`Voice recognition error: ${event.error}`, 'error');
                this.stopVoiceRecording();
            };

            this.recognition.onend = () => {
                console.log('🎤 Speech recognition ended');
                this.isListening = false;
                this.stopVoiceRecording();
            };
        } else {
            console.warn('🎤 Speech recognition not supported in this browser');
        }
    }

    attachEventListeners() {
        // Send message events
        this.sendBtn.addEventListener('click', () => this.sendMessage());

        // Shift+Enter for new line
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    return;
                } else {
                    e.preventDefault();
                    this.sendMessage();
                }
            }
        });

        // File upload events
        this.attachBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Voice events
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
        this.stopVoiceBtn.addEventListener('click', () => this.stopVoiceRecording());

        // Close voice modal on click outside
        this.voiceModal.addEventListener('click', (e) => {
            if (e.target === this.voiceModal) {
                this.stopVoiceRecording();
            }
        });

        // Conversations button (Menu button)
        this.conversationsBtn.addEventListener('click', () => this.toggleSidebar());

        // Modal events
        this.memoryBtn.addEventListener('click', () => this.showMemory());
        this.closeModalBtn.addEventListener('click', () => this.hideMemory());
        this.memoryModal.addEventListener('click', (e) => {
            if (e.target === this.memoryModal) this.hideMemory();
        });

        // Clear session
        this.clearBtn.addEventListener('click', () => this.clearSession());

        // Sidebar events
        this.closeSidebarBtn.addEventListener('click', () => this.closeSidebar());
        this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResizeInput();
            this.updateSendButton();
        });

        // Web scraping button
        const scrapeBtn = document.getElementById('scrapeBtn');
        if (scrapeBtn) {
            scrapeBtn.addEventListener('click', () => this.scrapeWebsite());
        }

        // Logout button
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
        }

        // Save conversation button
        const saveConvBtn = document.getElementById('saveConvBtn');
        if (saveConvBtn) {
            saveConvBtn.addEventListener('click', () => this.saveConversation());
        }

        // New conversation button
        const newConvBtn = document.getElementById('newConvBtn');
        if (newConvBtn) {
            newConvBtn.addEventListener('click', () => this.newConversation());
        }

        // Floating new chat button
        if (this.floatingNewChatBtn) {
            this.floatingNewChatBtn.addEventListener('click', () => this.newConversation());
        }

        // Feature 7: Share button → toggle dropdown
        if (this.shareBtn) {
            this.shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleShareDropdown();
            });
        }

        // Feature 7: Share dropdown items
        document.getElementById('shareCopyBtn')?.addEventListener('click', () => this.shareCopyToClipboard());
        document.getElementById('shareMarkdownBtn')?.addEventListener('click', () => this.exportAsMarkdown());
        document.getElementById('sharePdfBtn')?.addEventListener('click', () => this.exportAsPDF());

        // Close share dropdown on outside click
        document.addEventListener('click', (e) => {
            if (this.shareDropdown && !e.target.closest('.share-btn-wrapper')) {
                this.shareDropdown.style.display = 'none';
            }
        });

        // ── Sidebar Search ─────────────────────────────────
        if (this.sidebarSearchInput) {
            this.sidebarSearchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.updateConversationsList();
            });
        }

        // ── Sidebar Tabs (pill style) ──────────────────────
        document.querySelectorAll('.sidebar-tab-pill').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.sidebar-tab-pill').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.getAttribute('data-tab');
                this.updateConversationsList();
            });
        });

        // ── Settings Toggle ────────────────────────────────
        if (this.settingsToggle) {
            this.settingsToggle.addEventListener('click', () => {
                this.settingsExpanded = !this.settingsExpanded;
                this.settingsToggle.classList.toggle('active', this.settingsExpanded);
                this.settingsBody.classList.toggle('active', this.settingsExpanded);
            });
        }

        // ── Theme Switcher ─────────────────────────────────
        if (this.themeSwitcher) {
            this.themeSwitcher.querySelectorAll('.theme-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    const theme = btn.getAttribute('data-theme');
                    this.setThemePreference(theme);
                });
            });
        }

        // ── Close context menu on outside click ────────────
        document.addEventListener('click', (e) => {
            if (this.activeContextMenu && !e.target.closest('.context-menu') && !e.target.closest('.conversation-menu-btn')) {
                this.closeContextMenu();
            }
        });

        // ── System theme change listener ───────────────────
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const pref = localStorage.getItem('theme_preference') || 'light';
            if (pref === 'system') {
                this.applySystemTheme();
            }
        });

        // Feature 4: Prompt Library Button
        const promptLibraryBtn = document.getElementById('promptLibraryBtn');
        if (promptLibraryBtn) {
            promptLibraryBtn.addEventListener('click', () => this.showPromptLibrary());
        }
        document.getElementById('promptLibraryClose')?.addEventListener('click', () => this.hidePromptLibrary());
        this.promptLibraryModal?.addEventListener('click', (e) => {
            if (e.target === this.promptLibraryModal) this.hidePromptLibrary();
        });
        document.getElementById('promptSearchInput')?.addEventListener('input', (e) => {
            this.filterPromptLibrary(e.target.value);
        });

        // Feature 5: Persona buttons
        document.getElementById('personaBtn')?.addEventListener('click', () => this.showPersonaSelector());
        document.getElementById('personaSelectorClose')?.addEventListener('click', () => this.hidePersonaSelector());
        this.personaSelectorModal?.addEventListener('click', (e) => {
            if (e.target === this.personaSelectorModal) this.hidePersonaSelector();
        });
        this.personaBadge?.addEventListener('click', () => this.showPersonaSelector());

        // Feature 8: Shortcuts modal close on click outside
        this.shortcutsModal?.addEventListener('click', (e) => {
            if (e.target === this.shortcutsModal) this.hideShortcutsModal();
        });
    }

    // ══════════════════════════════════════════════════════
    // THEME SYSTEM (Light / Dark / System)
    // ══════════════════════════════════════════════════════

    applyInitialTheme() {
        const pref = localStorage.getItem('theme_preference') || 'light';
        this.setThemePreference(pref, false);
    }

    setThemePreference(pref, save = true) {
        if (save) localStorage.setItem('theme_preference', pref);

        // Update button states
        this.themeSwitcher?.querySelectorAll('.theme-pill').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === pref);
        });

        if (pref === 'system') {
            this.applySystemTheme();
        } else {
            document.body.setAttribute('data-theme', pref);
            // Also save actual theme for legacy code
            localStorage.setItem('theme', pref);
        }
    }

    applySystemTheme() {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = isDark ? 'dark' : 'light';
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    // ══════════════════════════════════════════════════════
    // FEATURE 7: SHARE / EXPORT CONVERSATION
    // ══════════════════════════════════════════════════════

    toggleShareDropdown() {
        if (!this.shareDropdown) return;
        const isVisible = this.shareDropdown.style.display === 'block';
        this.shareDropdown.style.display = isVisible ? 'none' : 'block';
    }

    async shareCopyToClipboard() {
        this.shareDropdown.style.display = 'none';
        const messageDivs = this.messagesContainer.querySelectorAll('.message');
        if (messageDivs.length === 0) {
            this.showNotification('No messages to share', 'info');
            return;
        }

        let chatText = '── JUNO AI Conversation ──\n\n';
        messageDivs.forEach(msg => {
            const isUser = msg.classList.contains('user');
            const textEl = msg.querySelector('.message-text');
            if (textEl) {
                const sender = isUser ? 'You' : 'JUNO AI';
                chatText += `${sender}: ${textEl.textContent.trim()}\n\n`;
            }
        });

        try {
            await navigator.clipboard.writeText(chatText);
            this.showNotification('Chat copied to clipboard!', 'success');
        } catch (err) {
            const ta = document.createElement('textarea');
            ta.value = chatText;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            this.showNotification('Chat copied to clipboard!', 'success');
        }
    }

    exportAsMarkdown() {
        this.shareDropdown.style.display = 'none';
        const messageDivs = this.messagesContainer.querySelectorAll('.message');
        if (messageDivs.length === 0) {
            this.showNotification('No messages to export', 'info');
            return;
        }

        let md = `# JUNO AI Conversation\n\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
        messageDivs.forEach(msg => {
            const isUser = msg.classList.contains('user');
            const textEl = msg.querySelector('.message-text');
            if (textEl) {
                const sender = isUser ? '**You**' : '**JUNO AI**';
                md += `${sender}:\n\n${textEl.textContent.trim()}\n\n---\n\n`;
            }
        });

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `juno-chat-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('Conversation exported as Markdown!', 'success');
    }

    exportAsPDF() {
        this.shareDropdown.style.display = 'none';
        window.print();
    }

    // Quick Action Button Helper
    fillInput(text) {
        this.messageInput.value = text;
        this.updateSendButton();
        this.autoResizeInput();
        this.messageInput.focus();
    }

    // Toggle sidebar method
    toggleSidebar() {
        this.sidebar.classList.toggle('active');
        this.sidebarOverlay.classList.toggle('active');
        if (this.sidebar.classList.contains('active')) {
            this.loadConversations(); // Refresh conversations when opening
        }
    }

    // Loading overlay methods
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('active');
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('active');
        }
    }

    // Voice Recording Methods
    toggleVoiceRecording() {
        if (!this.recognition) {
            this.showNotification('Speech recognition not supported in this browser', 'error');
            return;
        }

        if (this.isRecording) {
            this.stopVoiceRecording();
        } else {
            this.startVoiceRecording();
        }
    }

    startVoiceRecording() {
        if (this.isRecording || !this.recognition) return;

        try {
            this.isRecording = true;
            this.recognition.start();
            console.log('🎤 Starting voice recording...');
        } catch (error) {
            console.error('🎤 Error starting voice recording:', error);
            this.showNotification('Failed to start voice recording', 'error');
            this.isRecording = false;
        }
    }

    stopVoiceRecording() {
        if (!this.isRecording && !this.isListening) return;

        try {
            if (this.recognition) {
                this.recognition.stop();
            }

            this.isRecording = false;
            this.isListening = false;
            this.voiceBtn.classList.remove('voice-recording');
            this.hideVoiceModal();

            console.log('🎤 Voice recording stopped');

            // Auto-send if there's content and user preference
            if (this.messageInput.value.trim()) {
                this.updateSendButton();
                this.messageInput.focus();
            }
        } catch (error) {
            console.error('🎤 Error stopping voice recording:', error);
        }
    }

    showVoiceModal() {
        this.voiceModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideVoiceModal() {
        this.voiceModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        // Use streaming for better UX
        await this.sendMessageWithStreaming(message);
    }

    // ══════════════════════════════════════════════════════
    // CONVERSATION MANAGEMENT
    // ══════════════════════════════════════════════════════

    async loadConversations() {
        try {
            const response = await fetch(`${this.apiBase}/conversations`);
            const data = await response.json();
            if (response.ok) {
                this.conversations = data.conversations;
                this.updateConversationsList();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    updateConversationsList() {
        const conversationsList = document.getElementById('conversationsList');
        if (!conversationsList) return;

        conversationsList.innerHTML = '';

        // Filter conversations based on active tab and search
        let filtered = this.conversations.filter(conv => {
            // Tab filtering
            if (this.activeTab === 'pinned') {
                if (!this.pinnedChats.includes(conv.id)) return false;
            } else if (this.activeTab === 'archived') {
                if (!this.archivedChats.includes(conv.id)) return false;
            } else {
                // Recents: exclude archived
                if (this.archivedChats.includes(conv.id)) return false;
            }

            // Search filtering
            if (this.searchQuery) {
                return conv.title.toLowerCase().includes(this.searchQuery);
            }
            return true;
        });

        if (filtered.length === 0) {
            const emptyLabels = {
                recents: 'No recent conversations',
                pinned: 'No pinned conversations',
                archived: 'No archived conversations'
            };
            const emptyIcons = {
                recents: 'fas fa-comments',
                pinned: 'fas fa-thumbtack',
                archived: 'fas fa-archive'
            };
            conversationsList.innerHTML = `
                <div class="sidebar-empty">
                    <i class="${emptyIcons[this.activeTab]}"></i>
                    ${emptyLabels[this.activeTab]}
                </div>
            `;
            return;
        }

        filtered.forEach(conversation => {
            const isPinned = this.pinnedChats.includes(conversation.id);
            const isArchived = this.archivedChats.includes(conversation.id);

            const conversationItem = document.createElement('div');
            conversationItem.className = 'conversation-item';
            if (conversation.id === this.currentConversationId) {
                conversationItem.classList.add('active');
            }

            conversationItem.innerHTML = `
                ${isPinned ? '<i class="fas fa-thumbtack conversation-pin-icon"></i>' : ''}
                <div class="conversation-info" data-id="${conversation.id}">
                    <div class="conversation-title">${conversation.title}</div>
                    <div class="conversation-meta">${conversation.message_count} messages • ${new Date(conversation.last_updated).toLocaleDateString()}</div>
                </div>
                <button class="conversation-menu-btn" data-id="${conversation.id}" title="More options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            `;

            // Click to load conversation
            const infoEl = conversationItem.querySelector('.conversation-info');
            infoEl.addEventListener('click', () => this.loadConversation(conversation.id));

            // 3-dot menu
            const menuBtn = conversationItem.querySelector('.conversation-menu-btn');
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showContextMenu(e, conversation.id, isPinned, isArchived);
            });

            conversationsList.appendChild(conversationItem);
        });
    }

    // ══════════════════════════════════════════════════════
    // CONTEXT MENU (3-dot menu for each conversation)
    // ══════════════════════════════════════════════════════

    showContextMenu(event, convId, isPinned, isArchived) {
        this.closeContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <button class="context-menu-item" data-action="pin">
                <i class="fas fa-thumbtack"></i> ${isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button class="context-menu-item" data-action="archive">
                <i class="fas fa-archive"></i> ${isArchived ? 'Unarchive' : 'Archive'}
            </button>
            <button class="context-menu-item" data-action="rename">
                <i class="fas fa-pen"></i> Rename
            </button>
            <div class="context-menu-divider"></div>
            <button class="context-menu-item danger" data-action="delete">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;

        // Position the menu
        const rect = event.target.closest('.conversation-menu-btn').getBoundingClientRect();
        menu.style.top = `${rect.bottom + 4}px`;
        menu.style.left = `${Math.min(rect.left, window.innerWidth - 180)}px`;

        // Attach actions
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.getAttribute('data-action');
                this.handleContextAction(action, convId);
                this.closeContextMenu();
            });
        });

        document.body.appendChild(menu);
        this.activeContextMenu = menu;
    }

    closeContextMenu() {
        if (this.activeContextMenu) {
            this.activeContextMenu.remove();
            this.activeContextMenu = null;
        }
    }

    handleContextAction(action, convId) {
        switch (action) {
            case 'pin':
                this.togglePinChat(convId);
                break;
            case 'archive':
                this.toggleArchiveChat(convId);
                break;
            case 'rename':
                this.renameConversationInline(convId);
                break;
            case 'delete':
                this.deleteConversation(convId);
                break;
        }
    }

    togglePinChat(convId) {
        const idx = this.pinnedChats.indexOf(convId);
        if (idx >= 0) {
            this.pinnedChats.splice(idx, 1);
            this.showNotification('Chat unpinned', 'info');
        } else {
            this.pinnedChats.push(convId);
            this.showNotification('Chat pinned', 'success');
        }
        localStorage.setItem('juno_pinned_chats', JSON.stringify(this.pinnedChats));
        this.updateConversationsList();
    }

    toggleArchiveChat(convId) {
        const idx = this.archivedChats.indexOf(convId);
        if (idx >= 0) {
            this.archivedChats.splice(idx, 1);
            this.showNotification('Chat unarchived', 'info');
        } else {
            this.archivedChats.push(convId);
            // Also remove from pinned if archived
            const pIdx = this.pinnedChats.indexOf(convId);
            if (pIdx >= 0) this.pinnedChats.splice(pIdx, 1);
            localStorage.setItem('juno_pinned_chats', JSON.stringify(this.pinnedChats));
            this.showNotification('Chat archived', 'success');
        }
        localStorage.setItem('juno_archived_chats', JSON.stringify(this.archivedChats));
        this.updateConversationsList();
    }

    async renameConversationInline(convId) {
        const conv = this.conversations.find(c => c.id === convId);
        if (!conv) return;

        const newTitle = prompt('Rename conversation:', conv.title);
        if (!newTitle || newTitle === conv.title) return;

        try {
            const response = await fetch(`${this.apiBase}/conversations/${convId}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            });

            if (response.ok) {
                this.showNotification('Conversation renamed', 'success');
                this.loadConversations();
            } else {
                throw new Error('Failed to rename');
            }
        } catch (error) {
            this.showNotification(`Rename failed: ${error.message}`, 'error');
        }
    }

    // ══════════════════════════════════════════════════════
    // MESSAGING (with Features 1, 2, 3, 6)
    // ══════════════════════════════════════════════════════

    async sendMessageWithStreaming(message) {
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.autoResizeInput();
        this.updateSendButton();
        this.showTypingIndicator();

        try {
            const response = await fetch(`${this.apiBase}/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();
            this.hideTypingIndicator();

            if (response.ok) {
                const botMessage = data.response;
                const hasContext = data.has_context;
                const chunks = data.chunks;
                const isStreamable = data.streaming && chunks && chunks.length > 0;

                if (isStreamable) {
                    // Feature 6: Streaming effect
                    await this.addStreamingMessage(botMessage, chunks);
                } else {
                    this.addMessage(botMessage, 'bot');
                }

                // Only show context notification when document context is actually used
                if (hasContext && botMessage.includes('document')) {
                    this.showNotification('Response based on uploaded documents', 'info');
                }
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage(`❌ Error: ${error.message}`, 'bot');
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    // Feature 6: Streaming message with typing effect
    async addStreamingMessage(fullText, chunks) {
        this.isStreaming = true;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot fade-in';
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-avatar bot-avatar">
                <img src="/static/images/juno-avatar.jpg" alt="Bot Avatar">
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    <div class="message-text"><span class="typing-cursor"></span></div>
                </div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;
        this.messagesContainer.appendChild(messageDiv);

        // Add stop button
        const stopBtn = document.createElement('button');
        stopBtn.className = 'stop-generating-btn';
        stopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop generating';
        stopBtn.onclick = () => this.stopGeneration();
        this.messagesContainer.appendChild(stopBtn);

        const textEl = messageDiv.querySelector('.message-text');
        let accumulated = '';

        // Stream chunks
        for (const chunk of chunks) {
            if (!this.isStreaming) break;
            accumulated += chunk;
            textEl.innerHTML = this.renderMarkdown(accumulated) + '<span class="typing-cursor"></span>';
            this.scrollToBottom();
            await this.sleep(30);
        }

        // Clean up: render final markdown, remove cursor, add action buttons
        this.isStreaming = false;
        textEl.innerHTML = this.renderMarkdown(fullText);
        if (typeof hljs !== 'undefined') {
            textEl.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
        stopBtn.remove();
        this.appendActionButtons(messageDiv, fullText);
        this.scrollToBottom();

        // Hide welcome message after first bot message
        if (this.welcomeMessage) {
            this.welcomeMessage.style.display = 'none';
        }
    }

    stopGeneration() {
        this.isStreaming = false;
        const stopBtn = this.messagesContainer.querySelector('.stop-generating-btn');
        if (stopBtn) stopBtn.remove();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender} fade-in`;

        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Create avatar HTML for both user and bot
        let avatarHtml = '';
        if (sender === 'user') {
            avatarHtml = `
                <div class="message-avatar user-avatar">
                    <span class="avatar-text">U</span>
                </div>
            `;
        } else {
            avatarHtml = `
                <div class="message-avatar bot-avatar">
                    <img src="/static/images/juno-avatar.jpg" alt="Bot Avatar">
                </div>
            `;
        }

        // Feature 2: Use markdown rendering for bot messages
        const renderedContent = sender === 'bot' ? this.renderMarkdown(content) : this.escapeHtml(content);

        messageDiv.innerHTML = `
            ${avatarHtml}
            <div class="message-content">
                <div class="message-bubble">
                    <div class="message-text">${renderedContent}</div>
                </div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);

        // Feature 2: Highlight code blocks in bot messages
        if (sender === 'bot' && typeof hljs !== 'undefined') {
            messageDiv.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }

        // Feature 1: Add action buttons to bot messages
        if (sender === 'bot') {
            this.appendActionButtons(messageDiv, content);
        }

        this.scrollToBottom();

        // Hide welcome message after first user message
        if (sender === 'user' && this.welcomeMessage) {
            this.welcomeMessage.style.display = 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ══════════════════════════════════════════════════════
    // FEATURE 1: MESSAGE ACTION BUTTONS
    // ══════════════════════════════════════════════════════

    appendActionButtons(messageDiv, rawContent) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        actionsDiv.innerHTML = `
            <button class="action-btn-sm" title="Copy" onclick="chatbot.copyMessage(this)"><i class="fas fa-copy"></i></button>
            <button class="action-btn-sm" title="Like" onclick="chatbot.likeMessage(this)"><i class="fas fa-thumbs-up"></i></button>
            <button class="action-btn-sm" title="Dislike" onclick="chatbot.dislikeMessage(this)"><i class="fas fa-thumbs-down"></i></button>
            <button class="action-btn-sm" title="Regenerate" onclick="chatbot.regenerateMessage(this)"><i class="fas fa-rotate"></i></button>
            <button class="action-btn-sm" title="Read Aloud" onclick="chatbot.readAloudMessage(this)"><i class="fas fa-volume-up"></i></button>
        `;
        actionsDiv.dataset.rawContent = rawContent;
        const contentDiv = messageDiv.querySelector('.message-content');
        if (contentDiv) {
            contentDiv.appendChild(actionsDiv);
        }
    }

    copyMessage(btn) {
        const actionsDiv = btn.closest('.message-actions');
        const textEl = actionsDiv.parentElement.querySelector('.message-text');
        const text = textEl?.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
            this.showNotification('Message copied!', 'success');
        });
    }

    likeMessage(btn) {
        const isActive = btn.classList.contains('active');
        btn.classList.toggle('active', !isActive);
        // Remove dislike if liking
        const dislikeBtn = btn.nextElementSibling;
        if (dislikeBtn) dislikeBtn.classList.remove('active', 'dislike-active');
        this.showNotification(isActive ? 'Like removed' : 'Thanks for the feedback!', 'info');
    }

    dislikeMessage(btn) {
        const isActive = btn.classList.contains('active');
        btn.classList.toggle('active', !isActive);
        btn.classList.toggle('dislike-active', !isActive);
        // Remove like if disliking
        const likeBtn = btn.previousElementSibling;
        if (likeBtn) likeBtn.classList.remove('active');
        this.showNotification(isActive ? 'Dislike removed' : 'We\'ll try to improve!', 'info');
    }

    regenerateMessage(btn) {
        // Find the last user message
        const messages = this.messagesContainer.querySelectorAll('.message.user');
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg) {
            const text = lastUserMsg.querySelector('.message-text')?.textContent?.trim();
            if (text) {
                // Remove the current bot message
                const botMsg = btn.closest('.message');
                if (botMsg) botMsg.remove();
                this.sendMessageWithStreaming(text);
            }
        }
    }

    readAloudMessage(btn) {
        if ('speechSynthesis' in window) {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                btn.innerHTML = '<i class="fas fa-volume-up"></i>';
                return;
            }
            const textEl = btn.closest('.message-content')?.querySelector('.message-text');
            if (textEl) {
                const utterance = new SpeechSynthesisUtterance(textEl.textContent);
                utterance.rate = 1;
                utterance.pitch = 1;
                utterance.onstart = () => { btn.innerHTML = '<i class="fas fa-stop"></i>'; };
                utterance.onend = () => { btn.innerHTML = '<i class="fas fa-volume-up"></i>'; };
                window.speechSynthesis.speak(utterance);
            }
        } else {
            this.showNotification('Text-to-speech not supported', 'error');
        }
    }

    // ══════════════════════════════════════════════════════
    // FEATURE 3: ADVANCED THINKING ORB ANIMATION
    // ══════════════════════════════════════════════════════

    showTypingIndicator() {
        this.isTyping = true;
        this.sendBtn.disabled = true;
        this.thinkingTextIndex = 0;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing fade-in';
        typingDiv.innerHTML = `
            <div class="message-avatar bot-avatar">
                <img src="/static/images/juno-avatar.jpg" alt="Bot Avatar">
            </div>
            <div class="message-content">
                <div class="thinking-orb-container">
                    <div class="thinking-orb-wrapper">
                        <div class="thinking-orb"></div>
                        <div class="thinking-orb-ring"></div>
                        <div class="thinking-orb-particles">
                            <span></span><span></span><span></span><span></span>
                        </div>
                    </div>
                    <div class="thinking-status">
                        <span class="thinking-status-text">Thinking...</span>
                        <span class="thinking-status-sub">JUNO AI</span>
                    </div>
                </div>
            </div>
        `;

        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();

        // Cycle text
        this.thinkingTextInterval = setInterval(() => {
            this.thinkingTextIndex = (this.thinkingTextIndex + 1) % this.thinkingTexts.length;
            const textEl = typingDiv.querySelector('.thinking-status-text');
            if (textEl) textEl.textContent = this.thinkingTexts[this.thinkingTextIndex];
        }, 2000);
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.sendBtn.disabled = false;
        if (this.thinkingTextInterval) {
            clearInterval(this.thinkingTextInterval);
            this.thinkingTextInterval = null;
        }
        const typingIndicator = this.messagesContainer.querySelector('.typing');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        if (file.type !== 'application/pdf') {
            this.showNotification('Please select a PDF file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        this.showLoading();
        this.showNotification(`Uploading ${file.name}...`, 'info');

        try {
            const response = await fetch(`${this.apiBase}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            this.hideLoading();

            if (response.ok) {
                this.hasDocuments = true;
                this.updateDocumentStatus(`Processed: ${data.filename}`, true);

                // Hide welcome message when document is uploaded
                if (this.welcomeMessage) {
                    this.welcomeMessage.style.display = 'none';
                }

                this.addMessage(
                    `📄 **Document Processed Successfully**\n\n**File:** ${data.filename}\n**Length:** ${data.text_length.toLocaleString()} characters\n\n**Summary:**\n${data.summary}`,
                    'bot'
                );
                this.showNotification('Document processed successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to upload file');
            }

        } catch (error) {
            this.hideLoading();
            this.showNotification(`Upload failed: ${error.message}`, 'error');
        }

        this.fileInput.value = '';
    }

    updateDocumentStatus(message, hasDocuments) {
        const iconClass = hasDocuments ? 'fas fa-file-pdf' : 'fas fa-file-pdf';
        const color = hasDocuments ? 'var(--success-color)' : 'var(--text-muted)';
        this.documentStatus.innerHTML = `<i class="${iconClass}" style="color: ${color};"></i><span>${message}</span>`;
    }

    async showMemory() {
        try {
            const response = await fetch(`${this.apiBase}/memory`);
            const data = await response.json();

            let memoryHtml = `**Session ID:** ${data.session_id}
**Chat History:** ${data.chat_history_length} messages
**Documents Loaded:** ${data.has_vectorstore ? 'Yes' : 'No'}

**Memory Data:**
${JSON.stringify(data.memory, null, 2)}`;

            this.memoryContent.innerHTML = `<pre>${memoryHtml}</pre>`;
            this.memoryModal.classList.add('active');
        } catch (error) {
            this.showNotification(`Failed to load memory: ${error.message}`, 'error');
        }
    }

    hideMemory() {
        this.memoryModal.classList.remove('active');
    }

    async clearSession() {
        if (!confirm('Are you sure you want to clear the current session? This will remove all chat history and uploaded documents.')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/clear`, {
                method: 'POST'
            });

            const data = await response.json();

            if (response.ok) {
                this.hasDocuments = false;
                this.updateDocumentStatus('No documents loaded', false);
                this.showNotification('Session cleared successfully!', 'success');
                this.currentConversationId = null;
                this.loadConversations();
                this.renderDynamicWelcome();
            } else {
                throw new Error(data.error || 'Failed to clear session');
            }

        } catch (error) {
            this.showNotification(`Clear failed: ${error.message}`, 'error');
        }
    }

    async scrapeWebsite() {
        const url = prompt('Enter the website URL to scrape:');
        if (!url) return;

        this.showLoading();
        this.showNotification('Scraping website...', 'info');

        try {
            const response = await fetch(`${this.apiBase}/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();
            this.hideLoading();

            if (response.ok) {
                this.hasDocuments = true;
                this.updateDocumentStatus(`Scraped: ${data.url}`, true);

                // Hide welcome message when content is scraped
                if (this.welcomeMessage) {
                    this.welcomeMessage.style.display = 'none';
                }

                this.addMessage(
                    `🌐 **Website Scraped Successfully**\n\n**URL:** ${data.url}\n**Content Length:** ${data.content_length.toLocaleString()} characters\n\n**Summary:**\n${data.summary}`,
                    'bot'
                );
                this.showNotification('Website scraped successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to scrape website');
            }

        } catch (error) {
            this.hideLoading();
            this.showNotification(`Scraping failed: ${error.message}`, 'error');
        }
    }

    closeSidebar() {
        this.sidebar.classList.remove('active');
        this.sidebarOverlay.classList.remove('active');
    }

    autoResizeInput() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasText || this.isTyping;
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-hide notifications except errors
        if (type !== 'error') {
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, duration);
        } else {
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 7000); // Errors stay longer
        }
    }

    // Conversation management methods
    async saveConversation() {
        const title = prompt('Enter conversation title:') || `Chat ${new Date().toLocaleString()}`;

        try {
            const response = await fetch(`${this.apiBase}/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: title })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Conversation saved successfully!', 'success');
                this.loadConversations();
            } else {
                throw new Error(data.error || 'Failed to save conversation');
            }

        } catch (error) {
            this.showNotification(`Save failed: ${error.message}`, 'error');
        }
    }

    async loadConversation(conversationId) {
        try {
            const response = await fetch(`${this.apiBase}/conversations/${conversationId}`);
            const data = await response.json();

            if (response.ok) {
                this.currentConversationId = conversationId;
                this.messagesContainer.innerHTML = '';

                // Hide welcome message when loading conversation
                if (this.welcomeMessage) {
                    this.welcomeMessage.style.display = 'none';
                }

                // Load messages
                data.conversation.messages.forEach(msg => {
                    this.addMessage(msg.user, 'user');
                    this.addMessage(msg.bot, 'bot');
                });

                this.showNotification('Conversation loaded successfully!', 'success');
                this.updateConversationsList();
                this.closeSidebar();
            } else {
                throw new Error(data.error || 'Failed to load conversation');
            }

        } catch (error) {
            this.showNotification(`Load failed: ${error.message}`, 'error');
        }
    }

    async deleteConversation(conversationId) {
        if (!confirm('Are you sure you want to delete this conversation?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/conversations/${conversationId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                // Also clean up pin/archive state
                this.pinnedChats = this.pinnedChats.filter(id => id !== conversationId);
                this.archivedChats = this.archivedChats.filter(id => id !== conversationId);
                localStorage.setItem('juno_pinned_chats', JSON.stringify(this.pinnedChats));
                localStorage.setItem('juno_archived_chats', JSON.stringify(this.archivedChats));

                this.showNotification('Conversation deleted successfully!', 'success');
                this.loadConversations();

                if (this.currentConversationId === conversationId) {
                    this.currentConversationId = null;
                }
            } else {
                throw new Error(data.error || 'Failed to delete conversation');
            }

        } catch (error) {
            this.showNotification(`Delete failed: ${error.message}`, 'error');
        }
    }

    newConversation() {
        this.currentConversationId = null;
        this.renderDynamicWelcome();
        this.updateConversationsList();
        this.closeSidebar();
        this.showNotification('New conversation started!', 'success');
    }

    // ══════════════════════════════════════════════════════
    // FEATURE 10: DYNAMIC WELCOME SCREEN
    // ══════════════════════════════════════════════════════

    getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
        if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
        return { text: 'Good evening', emoji: '🌙' };
    }

    renderDynamicWelcome() {
        const greeting = this.getTimeGreeting();
        const userName = localStorage.getItem('juno_user_name') || '';
        const displayName = userName ? `, ${userName}` : '';

        this.messagesContainer.innerHTML = `
            <div class="welcome-message" id="welcomeMessage" style="position:relative;">
                <div class="welcome-particles">
                    <span></span><span></span><span></span><span></span><span></span><span></span>
                </div>
                <div class="welcome-icon">
                    <img src="/static/images/juno-logo.jpg" alt="Juno Logo" class="welcome-logo">
                </div>
                <div class="welcome-greeting">${greeting.text}${displayName} ${greeting.emoji}</div>
                <div class="welcome-user-name">How can JUNO AI help you today?</div>

                <div class="feature-grid">
                    <div class="feature-item">
                        <i class="fas fa-file-upload"></i>
                        <span>Upload PDFs</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-brain"></i>
                        <span>Smart Memory</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-globe"></i>
                        <span>Web Scraping</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-microphone"></i>
                        <span>Voice Input</span>
                    </div>
                </div>

                <div class="quick-actions">
                    <button class="quick-btn" onclick="chatbot.fillInput('Summarize this document')">
                        <i class="fas fa-file-text"></i> Summarize Doc
                    </button>
                    <button class="quick-btn" onclick="chatbot.fillInput('Extract key insights from this content')">
                        <i class="fas fa-lightbulb"></i> Key Insights
                    </button>
                    <button class="quick-btn" onclick="chatbot.fillInput('What is the main topic of this document?')">
                        <i class="fas fa-bullseye"></i> Main Topic
                    </button>
                    <button class="quick-btn" onclick="chatbot.fillInput('List the important points mentioned')">
                        <i class="fas fa-list"></i> Key Points
                    </button>
                </div>
            </div>
        `;

        // Re-initialize welcome message reference
        this.welcomeMessage = document.getElementById('welcomeMessage');
    }

    // ══════════════════════════════════════════════════════
    // FEATURE 9: DRAG & DROP FILE UPLOAD
    // ══════════════════════════════════════════════════════

    initDragAndDrop() {
        let dragCounter = 0;

        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (this.dropZone) this.dropZone.classList.add('active');
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                if (this.dropZone) this.dropZone.classList.remove('active');
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            if (this.dropZone) this.dropZone.classList.remove('active');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type === 'application/pdf') {
                    this.processFile(file);
                } else {
                    this.showNotification('Please drop a PDF file', 'error');
                }
            }
        });
    }

    // ══════════════════════════════════════════════════════
    // FEATURE 8: KEYBOARD SHORTCUTS
    // ══════════════════════════════════════════════════════

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+/ → toggle shortcuts modal
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                this.toggleShortcutsModal();
                return;
            }

            // Ctrl+L → clear chat
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.clearSession();
                return;
            }

            // Ctrl+M → toggle sidebar
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                this.toggleSidebar();
                return;
            }

            // Ctrl+K → focus sidebar search
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                if (!this.sidebar.classList.contains('active')) {
                    this.toggleSidebar();
                }
                setTimeout(() => this.sidebarSearchInput?.focus(), 100);
                return;
            }

            // / → open prompt library (when input not focused)
            if (e.key === '/' && document.activeElement !== this.messageInput && !e.ctrlKey) {
                const isInInput = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
                if (!isInInput) {
                    e.preventDefault();
                    this.showPromptLibrary();
                    return;
                }
            }

            // Escape → close any open modal/overlay
            if (e.key === 'Escape') {
                this.hideShortcutsModal();
                this.hidePromptLibrary();
                this.hidePersonaSelector();
                this.hideMemory();
                if (this.shareDropdown) this.shareDropdown.style.display = 'none';
                return;
            }
        });
    }

    toggleShortcutsModal() {
        if (this.shortcutsModal?.classList.contains('active')) {
            this.hideShortcutsModal();
        } else {
            this.showShortcutsModal();
        }
    }

    showShortcutsModal() {
        this.shortcutsModal?.classList.add('active');
    }

    hideShortcutsModal() {
        this.shortcutsModal?.classList.remove('active');
    }

    // ══════════════════════════════════════════════════════
    // FEATURE 4: PROMPT LIBRARY
    // ══════════════════════════════════════════════════════

    renderPromptLibrary() {
        const grid = document.getElementById('promptCategoryGrid');
        if (!grid) return;
        this.renderPromptCards(grid, this.promptLibrary);
    }

    renderPromptCards(container, prompts) {
        container.innerHTML = '';
        prompts.forEach(p => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.setAttribute('data-category', p.category);
            card.innerHTML = `
                <div class="prompt-card-icon">${p.icon}</div>
                <div class="prompt-card-title">${p.title}</div>
                <div class="prompt-card-desc">${p.desc}</div>
            `;
            card.addEventListener('click', () => {
                this.fillInput(p.prompt);
                this.hidePromptLibrary();
            });
            container.appendChild(card);
        });
    }

    filterPromptLibrary(query) {
        const grid = document.getElementById('promptCategoryGrid');
        if (!grid) return;
        const q = query.toLowerCase().trim();
        const filtered = q
            ? this.promptLibrary.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.desc.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.prompt.toLowerCase().includes(q))
            : this.promptLibrary;
        this.renderPromptCards(grid, filtered);
    }

    showPromptLibrary() {
        this.promptLibraryModal?.classList.add('active');
        setTimeout(() => document.getElementById('promptSearchInput')?.focus(), 100);
    }

    hidePromptLibrary() {
        this.promptLibraryModal?.classList.remove('active');
        const searchInput = document.getElementById('promptSearchInput');
        if (searchInput) searchInput.value = '';
        this.renderPromptLibrary(); // Reset filter
    }

    // ══════════════════════════════════════════════════════
    // FEATURE 5: AI PERSONAS / MODES
    // ══════════════════════════════════════════════════════

    renderPersonaCards() {
        const grid = document.getElementById('personaCardsGrid');
        if (!grid) return;
        grid.innerHTML = '';
        this.personas.forEach(p => {
            const card = document.createElement('div');
            card.className = `persona-card${p.id === this.activePersona ? ' active' : ''}`;
            card.setAttribute('data-persona', p.id);
            card.innerHTML = `
                <div class="persona-active-badge">Active</div>
                <div class="persona-card-icon">${p.icon}</div>
                <div class="persona-card-name">${p.name}</div>
                <div class="persona-card-desc">${p.desc}</div>
            `;
            card.addEventListener('click', () => this.setPersona(p.id));
            grid.appendChild(card);
        });
    }

    async setPersona(personaId) {
        this.activePersona = personaId;
        localStorage.setItem('juno_active_persona', personaId);

        // Update UI
        this.renderPersonaCards();
        this.updatePersonaBadge();

        // Call backend to set persona
        try {
            await fetch(`${this.apiBase}/persona`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ persona: personaId })
            });
        } catch (e) {
            console.warn('Failed to set persona on backend:', e);
        }

        const persona = this.personas.find(p => p.id === personaId);
        this.showNotification(`Persona changed to ${persona?.name || personaId}`, 'success');
        this.hidePersonaSelector();
    }

    updatePersonaBadge() {
        if (!this.personaBadge) return;
        const persona = this.personas.find(p => p.id === this.activePersona);
        if (persona && persona.id !== 'default') {
            this.personaBadge.textContent = `${persona.icon} ${persona.name}`;
            this.personaBadge.style.display = 'inline-flex';
        } else {
            this.personaBadge.style.display = 'none';
        }
    }

    async loadCurrentPersona() {
        try {
            const response = await fetch(`${this.apiBase}/persona`);
            if (response.ok) {
                const data = await response.json();
                this.activePersona = data.active_persona || 'default';
                localStorage.setItem('juno_active_persona', this.activePersona);
            }
        } catch (e) {
            console.warn('Failed to load persona from backend:', e);
        }
        this.updatePersonaBadge();
        this.renderPersonaCards();
    }

    showPersonaSelector() {
        this.personaSelectorModal?.classList.add('active');
    }

    hidePersonaSelector() {
        this.personaSelectorModal?.classList.remove('active');
    }

    // ─── Auth Helpers ────────────────────────────────────────
    displayUserInfo() {
        // Display in sidebar user section
        const nameEl = document.getElementById('sidebarUserName');
        const emailEl = document.getElementById('sidebarUserEmail');

        const userName = localStorage.getItem('juno_user_name') || this.userEmail;
        const userEmailRaw = localStorage.getItem('juno_user_email') || '';

        if (nameEl) nameEl.textContent = userName;
        if (emailEl) emailEl.textContent = userEmailRaw || userName;
    }

    async logout() {
        try {
            await fetch(`${this.apiBase}/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
        } catch (e) {
            console.warn('Logout API call failed (non-critical):', e);
        }

        // Clear local session
        localStorage.removeItem('juno_auth_token');
        localStorage.removeItem('juno_user_email');
        localStorage.removeItem('juno_user_provider');

        // Redirect to login
        window.location.replace('/');
    }
}

// Initialize the chatbot when the page loads
let chatbot;
document.addEventListener('DOMContentLoaded', () => {
    chatbot = new ChatbotUI();
});