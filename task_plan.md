# Task Plan

## Blueprint

**Architecture**:
- **Frontend**: React (TypeScript)
- **Backend**: Node.js/Express (TypeScript) to handle API requests and routing.
- **LLM Integrations**: Interfacing with Ollama, LM Studio, Grok, OpenAI, Claude, and Gemini.

**Core Features**:
1. **Chat/Input Interface**: A UI to paste Jira requirements.
   - Left Sidebar: Display "History" of generated cases.
   - Main Window (Top): Readout area for the generated test case output.
   - Main Window (Bottom): Input box to "Ask here..." and paste requirements.
2. **Settings Panel**: Configuration for API keys and endpoint URLs.
   - Vertical list of settings for Ollama, Grok, OpenAI, etc.
   - "Test Connection" button to verify the URLs/keys work.
   - "Save Button" to persist them.
3. **Test Generator Engine**: Prompts the selected LLM to generate test cases.
4. **Output Formatter**: Formats the LLM output into Jira-ready test cases.

**User Flow**:
1. User configures preferred LLM in Settings and may click "Test Connection".
2. User navigates to the main generator page.
3. User pastes Jira requirement details in the bottom input box.
4. System generates and displays comprehensive test cases in the large display area.
5. User copies the formatted test cases to paste into Jira.

(Blueprint Approved)

## Phases, Goals, and Checklists
- [x] Phase 1: Discovery
  - [x] Initialize project documentation
  - [x] Gather requirements from user
  - [x] Draft Blueprint
  - [x] Get Blueprint approved
- [x] Phase 2: Setup and Scaffolding
  - [x] Initialize Express backend
  - [x] Initialize React frontend (Vite, Tailwind v3)
- [x] Phase 3: Core Implementation
  - [x] Build React UI (Main View & Settings View)
  - [x] Build Express API routes (LLM Integrations)
  - [x] Wire up frontend to backend
- [x] Phase 4: Testing and Refinement
  - [x] User manual verification
  - [x] Fix any reported bugs
