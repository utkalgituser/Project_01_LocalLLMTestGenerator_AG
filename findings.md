# Findings

## Research
- The application will be a Node.js/TypeScript backend with a React frontend.
- It needs to connect to multiple LLM APIs: Ollama, LM Studio, Grok, OpenAI, Claude, and Gemini.

## Discoveries
- Core Purpose: Generate API and web app test cases (both functional and non-functional) based on Jira requirements.
- Input Modality: Users will input Jira requirements via copy-paste into a chat/text interface.
- Output Modality: The tool will generate and format test cases in Jira format. 

## Constraints
- The UI must have a Settings window to configure the different LLM APIs.
- Must halt execution until Blueprint is approved (Protocol 0).
