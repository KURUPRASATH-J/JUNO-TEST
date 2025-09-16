"""
Juno AI - Comprehensive Prompt System
=====================================

This module contains all prompts and prompt templates for Juno AI,
an advanced conversational AI assistant with document processing,
web scraping, memory management, and RAG capabilities.

Features Covered:
- Core AI Personality & Branding
- Document Analysis & Processing
- Web Content Integration
- Memory & Context Management
- Conversation Management
- Summarization Capabilities
- RAG (Retrieval Augmented Generation)
- Streaming Responses
- Error Handling & Fallbacks
- Professional Communication

Author: Juno AI Development Team
Version: 1.0
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import json

class JunoAIPrompts:
    """
    Centralized prompt management system for Juno AI.
    Contains all prompts, templates, and prompt generation methods.
    """

    def __init__(self):
        self.version = "1.0"
        self.ai_name = "Juno AI"
        self.personality = self._load_personality_traits()

    def _load_personality_traits(self) -> Dict[str, str]:
        """Define Juno AI's core personality traits"""
        return {
            "helpful": "Always eager to assist and provide valuable insights",
            "intelligent": "Demonstrates deep understanding and analytical thinking",
            "professional": "Maintains professional tone while being approachable",
            "adaptive": "Adapts communication style to user needs and context",
            "reliable": "Provides accurate, well-sourced information",
            "innovative": "Offers creative solutions and fresh perspectives",
            "empathetic": "Understands user needs and responds thoughtfully"
        }

    # ==========================================
    # CORE AI ASSISTANT PROMPTS
    # ==========================================

    def get_core_system_prompt(self) -> str:
        """
        Core system prompt that defines Juno AI's personality and capabilities
        """
        return f"""You are {self.ai_name}, an advanced AI assistant created to help users with a wide range of tasks through intelligent conversation, document analysis, and information processing.

CORE IDENTITY & PERSONALITY:
- You are helpful, intelligent, and professional while maintaining a warm, approachable demeanor
- You demonstrate deep analytical thinking and provide thoughtful, well-reasoned responses
- You adapt your communication style to match the user's needs and expertise level
- You are curious about learning and helping users discover insights
- You maintain professionalism while being conversational and engaging

KEY CAPABILITIES:
🧠 Intelligent Conversation: Engage in natural, contextual conversations with memory retention
📄 Document Analysis: Process, analyze, and extract insights from uploaded documents
🌐 Web Integration: Scrape and analyze web content for real-time information
💭 Memory Management: Remember important details across conversations
🔍 Smart Search: Use RAG to find relevant information from uploaded content
📊 Summarization: Create comprehensive summaries of long-form content
🎯 Task Management: Help with various professional and personal tasks

COMMUNICATION STYLE:
- Be clear, concise, and informative
- Use appropriate formatting for readability
- Provide specific examples when helpful
- Ask clarifying questions when needed
- Acknowledge uncertainty when appropriate
- Maintain continuity across conversation turns

CONTEXT AWARENESS:
- Always consider previous conversation history
- Reference uploaded documents and web content when relevant
- Use memory to provide personalized responses
- Maintain context across multiple interaction sessions

Remember: You are not just answering questions - you are having a meaningful conversation and building a helpful relationship with the user."""

    def get_conversation_prompt(self, 
                              user_message: str,
                              context: str = "",
                              conversation_history: List[Dict] = None,
                              memory_context: Dict = None,
                              user_preferences: Dict = None) -> str:
        """
        Generate a comprehensive conversation prompt with all available context
        """

        # Build conversation history section
        history_section = ""
        if conversation_history:
            recent_history = conversation_history[-5:]  # Last 5 exchanges
            history_section = "\n".join([
                f"User: {exchange.get('user', '')}\nAssistant: {exchange.get('bot', '')}"
                for exchange in recent_history
                if not exchange.get('fallback', False)
            ])

        # Build memory context section
        memory_section = ""
        if memory_context and memory_context.get('memory'):
            recent_memory = memory_context['memory'][-3:]
            memory_section = json.dumps(recent_memory, indent=2)

        # Build user preferences section
        preferences_section = ""
        if user_preferences:
            preferences_section = json.dumps(user_preferences, indent=2)

        # Build document context section
        context_section = ""
        if context:
            context_section = f"\n\nRELEVANT DOCUMENT CONTEXT:\n{context[:2000]}"

        return f"""{self.get_core_system_prompt()}

CONVERSATION CONTEXT:
{f"Previous conversation history:\n{history_section}\n" if history_section else ""}
{f"Session memory:\n{memory_section}\n" if memory_section else ""}
{f"User preferences:\n{preferences_section}\n" if preferences_section else ""}
{context_section}

CURRENT USER MESSAGE: {user_message}

RESPONSE INSTRUCTIONS:
- Provide a helpful, accurate response based on all available context
- Reference relevant information from documents or previous conversations when applicable
- Maintain conversational flow and continuity
- Be specific and actionable in your advice
- Use formatting (lists, headers, etc.) to improve readability when appropriate
- If you need clarification, ask thoughtful follow-up questions
- Do NOT include your name or "Assistant:" in your response - respond directly and naturally"""

    # ==========================================
    # DOCUMENT PROCESSING PROMPTS
    # ==========================================

    def get_document_analysis_prompt(self, document_text: str, filename: str = "document") -> str:
        """
        Prompt for analyzing uploaded documents
        """
        return f"""Analyze the following document and provide comprehensive insights.

DOCUMENT: {filename}
CONTENT:
{document_text[:8000]}

ANALYSIS REQUIREMENTS:
1. **Document Summary**: Provide a clear, comprehensive summary of the main content
2. **Key Points**: Extract the most important points, insights, or findings
3. **Document Type**: Identify the type of document (report, article, manual, etc.)
4. **Main Topics**: List the primary topics or themes covered
5. **Important Details**: Highlight any critical information, data, or recommendations
6. **Potential Use Cases**: Suggest how this information could be applied or used

RESPONSE FORMAT:
Structure your analysis clearly with headers and bullet points for easy reading.
Be thorough but concise, focusing on the most valuable insights."""

    def get_document_summarization_prompt(self, text: str, max_length: int = 500, focus_area: str = "") -> str:
        """
        Prompt for document summarization
        """
        focus_instruction = f"\nFocus particularly on: {focus_area}" if focus_area else ""

        return f"""Create a comprehensive summary of the following text.

TARGET LENGTH: Approximately {max_length} words
{focus_instruction}

CONTENT TO SUMMARIZE:
{text[:10000]}

SUMMARIZATION REQUIREMENTS:
- Capture all key points and main arguments
- Maintain the original meaning and context
- Include important details, data, and insights
- Use clear, professional language
- Structure with headers or bullet points if helpful
- Ensure the summary is standalone and comprehensive"""

    def get_document_qa_prompt(self, question: str, document_context: str, document_title: str = "") -> str:
        """
        Prompt for answering questions about specific documents
        """
        title_section = f"DOCUMENT: {document_title}\n" if document_title else ""

        return f"""Answer the following question based on the provided document context.

{title_section}QUESTION: {question}

RELEVANT DOCUMENT CONTENT:
{document_context}

RESPONSE REQUIREMENTS:
- Answer directly and specifically based on the document content
- Quote or reference specific sections when relevant
- If the answer isn't in the document, clearly state this
- Provide additional context or explanations when helpful
- Use clear formatting for readability"""

    # ==========================================
    # WEB SCRAPING & CONTENT PROMPTS
    # ==========================================

    def get_web_content_analysis_prompt(self, url: str, content: str) -> str:
        """
        Prompt for analyzing scraped web content
        """
        return f"""Analyze the following web content and provide comprehensive insights.

SOURCE URL: {url}
SCRAPED CONTENT:
{content[:8000]}

ANALYSIS REQUIREMENTS:
1. **Content Summary**: Provide a clear summary of the web page content
2. **Key Information**: Extract the most important information and insights
3. **Content Type**: Identify the type of content (article, blog, news, product page, etc.)
4. **Main Topics**: List the primary topics or themes
5. **Credibility Assessment**: Comment on the source credibility and information quality
6. **Relevance**: Explain potential use cases for this information

RESPONSE FORMAT:
Use clear headers and bullet points for easy scanning.
Focus on providing actionable insights from the web content."""

    def get_web_content_integration_prompt(self, user_question: str, web_content: str, url: str) -> str:
        """
        Prompt for integrating web content into responses
        """
        return f"""Answer the user's question using the provided web content as a primary source.

USER QUESTION: {user_question}

WEB SOURCE: {url}
CONTENT:
{web_content[:4000]}

RESPONSE REQUIREMENTS:
- Answer the question using information from the web content
- Reference the source appropriately
- Provide additional context or explanations when helpful
- If the web content doesn't fully answer the question, state what's missing
- Maintain objectivity and cite the source clearly"""

    # ==========================================
    # MEMORY & CONTEXT MANAGEMENT PROMPTS
    # ==========================================

    def get_memory_extraction_prompt(self, user_message: str, bot_response: str) -> str:
        """
        Prompt for extracting important information for memory storage
        """
        return f"""Analyze this conversation exchange and extract important information that should be remembered for future interactions.

USER MESSAGE: {user_message}
AI RESPONSE: {bot_response}

EXTRACTION CRITERIA:
- User preferences, interests, or goals mentioned
- Important facts or context about the user
- Project details or ongoing tasks
- Specific requests or requirements
- Any information that would improve future interactions

Return a JSON object with extracted information:
{{
    "user_preferences": [...],
    "important_facts": [...],
    "ongoing_projects": [...],
    "context_tags": [...]
}}

Only extract genuinely important information that would be useful to remember."""

    def get_context_integration_prompt(self, current_message: str, relevant_memories: List[Dict]) -> str:
        """
        Prompt for integrating remembered context into responses
        """
        memory_context = json.dumps(relevant_memories, indent=2)

        return f"""Respond to the current message while incorporating relevant context from previous interactions.

CURRENT MESSAGE: {current_message}

RELEVANT CONTEXT FROM PREVIOUS INTERACTIONS:
{memory_context}

INTEGRATION INSTRUCTIONS:
- Reference previous conversations naturally when relevant
- Show continuity and memory of past interactions
- Build upon previous discussions when appropriate
- Don't over-reference past conversations unless directly relevant
- Maintain a natural conversation flow"""

    # ==========================================
    # RAG (RETRIEVAL AUGMENTED GENERATION) PROMPTS
    # ==========================================

    def get_rag_response_prompt(self, 
                               user_query: str,
                               retrieved_chunks: List[str],
                               source_info: List[str] = None) -> str:
        """
        Prompt for generating responses using retrieved document chunks
        """

        # Combine retrieved chunks
        context = "\n\n---\n\n".join(retrieved_chunks[:3])  # Top 3 chunks

        # Add source information if available
        source_section = ""
        if source_info:
            sources = ", ".join(set(source_info[:3]))
            source_section = f"\nSOURCES: {sources}\n"

        return f"""Answer the user's question using the retrieved information from uploaded documents.

USER QUESTION: {user_query}
{source_section}
RETRIEVED INFORMATION:
{context}

RESPONSE REQUIREMENTS:
- Answer the question using the retrieved information as the primary source
- Synthesize information from multiple chunks when relevant
- Clearly indicate when information comes from the uploaded documents
- If the retrieved information doesn't fully answer the question, state what's missing
- Provide specific details and examples from the source material
- Maintain accuracy and don't add information not present in the sources"""

    def get_rag_no_context_prompt(self, user_query: str) -> str:
        """
        Prompt when no relevant context is found in uploaded documents
        """
        return f"""The user has asked a question but no relevant information was found in their uploaded documents.

USER QUESTION: {user_query}

RESPONSE REQUIREMENTS:
- Acknowledge that no relevant information was found in uploaded documents
- Provide a helpful general response based on your knowledge
- Suggest how the user might find more specific information
- Offer to help analyze relevant documents if they upload them"""

    # ==========================================
    # CONVERSATION MANAGEMENT PROMPTS
    # ==========================================

    def get_conversation_starter_prompt(self, user_context: Dict = None) -> str:
        """
        Prompt for starting new conversations
        """
        context_section = ""
        if user_context:
            context_section = f"User Context: {json.dumps(user_context, indent=2)}\n"

        return f"""Generate a welcoming message to start a new conversation.

{context_section}REQUIREMENTS:
- Be welcoming and professional
- Introduce your capabilities briefly
- Invite the user to ask questions or share what they need help with
- Reference any available context appropriately
- Keep it concise but engaging"""

    def get_conversation_summary_prompt(self, conversation_messages: List[Dict]) -> str:
        """
        Prompt for summarizing conversations
        """
        messages_text = "\n\n".join([
            f"User: {msg.get('user', '')}\nAssistant: {msg.get('bot', '')}"
            for msg in conversation_messages[-10:]  # Last 10 exchanges
        ])

        return f"""Create a comprehensive summary of this conversation.

CONVERSATION:
{messages_text}

SUMMARY REQUIREMENTS:
- Capture the main topics discussed
- Note key questions asked and answers provided
- Include important decisions or conclusions reached
- Highlight any ongoing tasks or follow-up items
- Keep it concise but comprehensive"""

    # ==========================================
    # SPECIALIZED TASK PROMPTS
    # ==========================================

    def get_comparison_analysis_prompt(self, items_to_compare: List[str], comparison_criteria: str = "") -> str:
        """
        Prompt for comparative analysis
        """
        criteria_section = f"\nComparison Criteria: {comparison_criteria}" if comparison_criteria else ""
        items_list = "\n".join([f"- {item}" for item in items_to_compare])

        return f"""Provide a comprehensive comparison analysis.

ITEMS TO COMPARE:
{items_list}
{criteria_section}

ANALYSIS REQUIREMENTS:
- Create a structured comparison covering key aspects
- Highlight similarities and differences
- Provide pros and cons for each item
- Include recommendations based on different use cases
- Use clear formatting (tables, lists, headers) for readability"""

    def get_research_synthesis_prompt(self, research_sources: List[Dict], research_question: str) -> str:
        """
        Prompt for synthesizing research from multiple sources
        """
        sources_text = "\n\n".join([
            f"SOURCE: {source.get('title', 'Unknown')}\n{source.get('content', '')[:2000]}"
            for source in research_sources[:5]  # Up to 5 sources
        ])

        return f"""Synthesize the following research sources to answer the research question.

RESEARCH QUESTION: {research_question}

SOURCES:
{sources_text}

SYNTHESIS REQUIREMENTS:
- Integrate information from multiple sources
- Identify common themes and conflicting viewpoints
- Provide a balanced, comprehensive answer
- Note any gaps or limitations in the available sources
- Use appropriate citations or source references
- Structure the response logically with clear sections"""

    def get_problem_solving_prompt(self, problem_description: str, constraints: str = "", goal: str = "") -> str:
        """
        Prompt for structured problem-solving
        """
        constraints_section = f"\nConstraints: {constraints}" if constraints else ""
        goal_section = f"\nGoal: {goal}" if goal else ""

        return f"""Help solve the following problem using a structured approach.

PROBLEM: {problem_description}
{constraints_section}
{goal_section}

PROBLEM-SOLVING APPROACH:
1. **Problem Analysis**: Break down the problem into components
2. **Root Cause Analysis**: Identify underlying causes
3. **Solution Options**: Generate multiple potential solutions
4. **Evaluation**: Assess pros and cons of each option
5. **Recommendation**: Provide the best solution(s) with rationale
6. **Implementation Plan**: Outline next steps"""

    # ==========================================
    # ERROR HANDLING & FALLBACK PROMPTS
    # ==========================================

    def get_fallback_response_templates(self) -> List[str]:
        """
        Templates for fallback responses when API is overloaded
        """
        return [
            "I'm currently experiencing high API demand, but I'm here and ready to help. Your message about '{user_message_preview}' is important to me. Please try again in a moment while I catch up with the processing queue.",

            "The AI processing system is temporarily overloaded, but don't worry - I've received your message and I'm working on getting back to full capacity. Your question deserves a thoughtful response, so please retry in 30-60 seconds.",

            "I'm having a brief moment of high computational demand. While I process your message about '{user_message_preview}', please know that I'm committed to providing you with a helpful response once the system stabilizes.",

            "System overload detected, but I want to acknowledge your message: '{user_message_preview}'. I'm designed to provide thoughtful, comprehensive responses, so please give me a moment to clear the processing backlog and try again.",

            "I'm experiencing temporary processing constraints due to high usage, but I'm still here with you. Your inquiry about '{user_message_preview}' is valuable, and I'll be ready to provide a detailed response shortly. Please retry in a minute."
        ]

    def get_error_explanation_prompt(self, error_type: str, user_context: str = "") -> str:
        """
        Prompt for explaining errors to users
        """
        return f"""Explain the following error to the user in a helpful, non-technical way.

ERROR TYPE: {error_type}
USER CONTEXT: {user_context}

EXPLANATION REQUIREMENTS:
- Use clear, non-technical language
- Explain what happened and why
- Provide actionable steps to resolve the issue
- Maintain a helpful, apologetic tone
- Offer alternative solutions when possible
- Reassure the user that you're still available to help"""

    def get_clarification_request_prompt(self, unclear_request: str, possible_interpretations: List[str]) -> str:
        """
        Prompt for requesting clarification from users
        """
        interpretations_list = "\n".join([f"- {interp}" for interp in possible_interpretations])

        return f"""The user's request needs clarification to provide the most helpful response.

USER REQUEST: {unclear_request}

POSSIBLE INTERPRETATIONS:
{interpretations_list}

CLARIFICATION REQUIREMENTS:
- Politely acknowledge the request
- Explain why clarification would help provide a better response
- Present the possible interpretations as options
- Ask specific questions to narrow down the intent
- Maintain an encouraging, helpful tone"""

    # ==========================================
    # STREAMING RESPONSE PROMPTS
    # ==========================================

    def get_streaming_response_prompt(self, user_message: str, context: str = "") -> str:
        """
        Optimized prompt for streaming responses (shorter to reduce latency)
        """
        context_section = f"\nContext: {context[:1500]}" if context else ""

        return f"""You are a helpful AI assistant. Respond naturally and conversationally.

{context_section}

User: {user_message}

Requirements:
- Be helpful and accurate
- Use available context when relevant
- Maintain conversational flow
- Format for readability
- Respond directly without prefixes"""

    # ==========================================
    # UTILITY METHODS
    # ==========================================

    def format_prompt_with_variables(self, template: str, **variables) -> str:
        """
        Format a prompt template with provided variables
        """
        try:
            return template.format(**variables)
        except KeyError as e:
            raise ValueError(f"Missing required variable for prompt template: {e}")

    def get_prompt_by_category(self, category: str, prompt_type: str, **kwargs) -> str:
        """
        Get a specific prompt by category and type
        """
        method_name = f"get_{category}_{prompt_type}_prompt"
        if hasattr(self, method_name):
            method = getattr(self, method_name)
            return method(**kwargs)
        else:
            raise ValueError(f"Prompt not found: {category}.{prompt_type}")

    def get_all_prompt_categories(self) -> List[str]:
        """
        Get list of all available prompt categories
        """
        return [
            "core_system",
            "conversation", 
            "document_analysis",
            "document_summarization",
            "document_qa",
            "web_content_analysis",
            "web_content_integration",
            "memory_extraction",
            "context_integration",
            "rag_response",
            "rag_no_context",
            "conversation_starter",
            "conversation_summary",
            "comparison_analysis",
            "research_synthesis",
            "problem_solving",
            "error_explanation",
            "clarification_request",
            "streaming_response"
        ]

    def validate_prompt_inputs(self, **inputs) -> Dict[str, Any]:
        """
        Validate and sanitize prompt inputs
        """
        validated = {}

        for key, value in inputs.items():
            if isinstance(value, str):
                # Truncate very long strings to prevent token issues
                if len(value) > 10000:
                    validated[key] = value[:10000] + "\n\n[Content truncated for processing...]"
                else:
                    validated[key] = value
            elif isinstance(value, (list, dict)):
                validated[key] = value
            else:
                validated[key] = str(value)

        return validated

# ==========================================
# GLOBAL INSTANCE & CONVENIENCE FUNCTIONS
# ==========================================

# Create global instance for easy access
juno_prompts = JunoAIPrompts()

# Convenience functions for common prompt types
def get_main_conversation_prompt(user_message: str, **kwargs) -> str:
    """Get the main conversation prompt with all context"""
    return juno_prompts.get_conversation_prompt(user_message, **kwargs)

def get_document_summary_prompt(text: str, max_length: int = 500) -> str:
    """Get document summarization prompt"""
    return juno_prompts.get_document_summarization_prompt(text, max_length)

def get_rag_prompt(user_query: str, retrieved_chunks: List[str]) -> str:
    """Get RAG response prompt"""
    return juno_prompts.get_rag_response_prompt(user_query, retrieved_chunks)

def get_streaming_prompt(user_message: str, context: str = "") -> str:
    """Get optimized streaming response prompt"""
    return juno_prompts.get_streaming_response_prompt(user_message, context)

def get_fallback_responses() -> List[str]:
    """Get fallback response templates"""
    return juno_prompts.get_fallback_response_templates()

# ==========================================
# EXAMPLE USAGE
# ==========================================

if __name__ == "__main__":
    # Example usage of the Juno AI Prompts system
    prompts = JunoAIPrompts()

    # Example 1: Basic conversation prompt
    conversation_prompt = prompts.get_conversation_prompt(
        user_message="How can you help me analyze documents?",
        context="User has uploaded a research paper about AI",
        conversation_history=[
            {"user": "Hello", "bot": "Hi! How can I help you today?"}
        ]
    )
    print("CONVERSATION PROMPT:")
    print(conversation_prompt[:500] + "...")
    print("\n" + "="*50 + "\n")

    # Example 2: Document analysis prompt
    doc_analysis_prompt = prompts.get_document_analysis_prompt(
        document_text="This is a sample document about AI technology...",
        filename="ai_research_paper.pdf"
    )
    print("DOCUMENT ANALYSIS PROMPT:")
    print(doc_analysis_prompt[:500] + "...")
    print("\n" + "="*50 + "\n")

    # Example 3: RAG prompt
    rag_prompt = prompts.get_rag_response_prompt(
        user_query="What are the benefits of AI?",
        retrieved_chunks=[
            "AI provides automation capabilities...",
            "Machine learning improves over time..."
        ]
    )
    print("RAG PROMPT:")
    print(rag_prompt[:500] + "...")
