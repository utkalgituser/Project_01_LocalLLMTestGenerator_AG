# Local LLM Test Generator

**Local LLM Test Generator** is a powerful React/Express application designed to streamline the software testing lifecycle. By taking simple Jira requirements as input, it securely interfaces with various local and cloud-based Large Language Models (LLMs) to automatically generate comprehensive API and Web Application test cases (both functional and non-functional) in a Jira-friendly Markdown format.

## Table of Contents
- [Features](#features)
- [How to Run the Application](#how-to-run-the-application)
- [How to Use It](#how-to-use-it)
- [Configuration and Settings](#configuration-and-settings)
- [Connecting External Applications and APIs](#connecting-external-applications-and-apis)
- [How LLM Configurations Are Read](#how-llm-configurations-are-read)
- [Ollama Configuration](#ollama-configuration)

---

## Features

- **Multi-LLM Support**: Supports local engines (Ollama, LM Studio) and cloud platforms (Groq, OpenAI, Claude, Gemini).
- **Automated Formatting**: Generates structured, Jira-ready test cases in Markdown.
- **Dynamic Model Fetching**: Automatically fetches and caches (e.g., Groq models are cached for a fortnight) available models for supported providers to allow seamless switching.
- **Auto-Start Server Logic**: For Ollama, the application attempts to automatically spin up the background process if it isn't already running.

---

## How to Run the Application

This project consists of a separate frontend (`client`) and backend (`server`). You will need to start both development servers.

1. **Start the Backend Server**:
   ```bash
   cd server
   npm install
   npm run dev
   ```
   *The server runs on `http://localhost:4000`.*

2. **Start the Frontend Client**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   *The client runs on your Vite-assigned local port (usually `http://localhost:5173`).*

---

## How to Use It

1. **Configure Your LLM Provider**: Upon launching the UI, open the **Settings** modal. Select your preferred provider (e.g., Ollama, OpenAI) and fill out the necessary configuration details (Base URLs, API keys, and model names).
2. **Test the Connection**: In the Settings modal, click **"Test Connection"** to verify that your provided keys and URLs communicate successfully with the LLM backend.
3. **Save Settings**: Click **Save Button** to store your configuration.
4. **Input Requirements**: On the main UI, paste your Jira ticket's acceptance criteria or requirements into the bottom text input box ("Ask here...").
5. **Generate Test Cases**: Submit your prompt. Your selected Model will process the requirement and generate robust API and Web test cases.
6. **Copy & Paste**: Once generation is finished, easily copy the markdown from the main display window directly into your Jira ticket.

---

## Configuration and Settings

Your LLM configurations are primarily handled by the React Frontend UI via the **Settings Modal**. Each provider requires specific fields to connect properly:

- **Local Providers** (No internet required):
  - **Ollama**: Requires a `Base URL` (default: `http://localhost:11434`) and a selected downloaded `Model`.
  - **LM Studio**: Requires an OpenAI-compatible API `Base URL` (default: `http://localhost:1234/v1`).
- **Cloud Providers** (Requires internet and API Keys):
  - **OpenAI / Claude / Gemini / Groq**: Require an `API Key` and the desired `Model` (e.g., `gpt-4o`, `llama3-8b-8192`). 

### Connecting External Applications and APIs
To allow the Test Generator to leverage cloud compute (like OpenAI, Groq, or Claude), you must supply a valid authentication API Key. 
1. Obtain the API Key from your cloud provider's developer console.
2. In this application, open **Settings**.
3. Paste the API key into the respective provider's input field.
4. If connecting to a custom enterprise endpoint, update the Base URL.

For **Groq**, as soon as you enter your API key, the application automatically makes a background call to fetch the latest available LLM models from Groq's API. This list is cached on your browser for up to two weeks (a fortnight), preventing redundant network calls, and giving you an up-to-date dropdown menu for easy model selection.

---

## How LLM Configurations Are Read

1. **Frontend State**: When you fill out your API Keys and Base URLs in the UI, they are captured dynamically via React state. Any modifications override previously selected values.
2. **Dynamic Request Payloads**: When you send a prompt or test a connection, the frontend safely packages your selected provider and its specific configuration block (`LLMConfig` containing `apiKey`, `baseUrl`, and `model`) into a JSON payload.
3. **Backend Parsing via Node.js**: The Express (`server`) receives this payload at its endpoints (e.g., `/api/generate`). 
4. **`llmService.ts` Orchestration**: Your payload runs through a `switch` statement that dynamically directs request processing based on your chosen provider. It attaches your supplied `apiKey` as Bearer Tokens inside HTTP request headers and overrides default routing endpoints with your `baseUrl`. No keys are permanently stored on the backend, ensuring top security standards for your sensitive API Keys.

---

## Ollama Configuration

**Ollama** ("Ulama" by voice dictation) acts as the primary offline provider. 

- **Auto-Bootstrapping**: If your local application tries to generate a test case using Ollama and the service isn't responding, the backend will automatically execute a detached `ollama serve` shadow process to start it.
- **Model Validation**: When you open the UI's settings and look at Ollama, the frontend reaches out to `http://localhost:11434/api/tags`. It fetches all the models you currently have installed locally.
- **Missing Models**: If you select a model not on your machine, or default to one that isn't downloaded, an error prompt will indicate which model failed to generate. In your local terminal, you will need to manually pull the required model:
  ```bash
  ollama run <model_name>
  ```
- **Refreshing**: After downloading a new model, you can click the **Refresh** button inside the Ollama Settings view to bring your newly downloaded model into the active dropdown selection.
