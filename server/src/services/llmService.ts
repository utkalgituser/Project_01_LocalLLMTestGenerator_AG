import axios from 'axios';
import { spawn } from 'child_process';

type Provider = 'ollama' | 'lmstudio' | 'groq' | 'openai' | 'claude' | 'gemini';

interface LLMConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const SYSTEM_PROMPT = `You are an expert QA Engineer. 
Given the following Jira requirement, generate comprehensive API test cases and Web Application test cases (both functional and non-functional).
Format your output cleanly in a way that can be easily pasted into a Jira ticket. Use Markdown formatting.
Structure:
- Overview
- API Test Cases (Functional & Non-Functional)
- Web App Test Cases (Functional & Non-Functional)`;

export async function generateTestCases(requirements: string, provider: Provider, config: LLMConfig): Promise<string> {
  const prompt = `JIRA REQUIREMENT:\n${requirements}\n\nPlease generate the test cases.`;

  switch (provider) {
    case 'ollama':
      return await generateOllama(prompt, config);
    case 'lmstudio':
      return await generateLMStudio(prompt, config);
    case 'groq':
      return await generateGroq(prompt, config);
    case 'openai':
      return await generateOpenAI(prompt, config);
    case 'claude':
      return await generateClaude(prompt, config);
    case 'gemini':
      return await generateGemini(prompt, config);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function generateTestCasesStream(
  requirements: string, 
  provider: Provider, 
  config: LLMConfig, 
  onChunk: (chunk: string) => void
): Promise<void> {
  const prompt = `JIRA REQUIREMENT:\n${requirements}\n\nPlease generate the test cases.`;

  if (provider === 'ollama') {
    await generateOllamaStream(prompt, config, onChunk);
  } else {
    // For non-Ollama models right now, we fallback to non-streaming, then send as one chunk
    // Streaming for other providers can be added later
    const fullRes = await generateTestCases(requirements, provider, config);
    onChunk(fullRes);
  }
}

export async function ensureOllamaRunning(baseUrl: string): Promise<void> {
  try {
    // Quick ping to see if server is alive
    await axios.get(`${baseUrl}/api/tags`, { timeout: 5000 });
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
       console.log('Ollama is not responding (Connection Refused). Attempting to start in background...', baseUrl);
       
       const child = spawn('ollama', ['serve'], { 
          detached: true, 
          stdio: 'ignore',
          windowsHide: true,
          shell: true
       });
       child.unref();

       // Wait and poll up to 20 seconds for it to boot
       for (let i = 0; i < 10; i++) {
         await new Promise(resolve => setTimeout(resolve, 2000));
         try {
            await axios.get(`${baseUrl}/api/tags`, { timeout: 2000 });
            console.log('Ollama successfully started automatically.');
            return;
         } catch (e) {}
       }
       throw new Error('Failed to start Ollama automatically. Please open your terminal and run "ollama serve".');
    }
    // If it's a 404 or something else, the server is running but responded with an error, which is fine
  }
}

async function generateOllama(prompt: string, config: LLMConfig): Promise<string> {
  const baseUrl = config.baseUrl || 'http://localhost:11434';
  let model = config.model || 'llama3';
  
  await ensureOllamaRunning(baseUrl);

  // Try to find the exact model, throw error if not found
  try {
     const tagsResp = await axios.get(`${baseUrl}/api/tags`);
     const models = tagsResp.data?.models || [];
     const hasModel = models.some((m: any) => m.name === model || m.name.startsWith(model + ':'));
     
     if (!hasModel) {
        throw new Error(`Ollama model '${model}' not found. Please run 'ollama run ${model}' in your terminal to download it.`);
     }
  } catch (err: any) {
     if (err.message.includes('Ollama model')) throw err;
     // Ignore connection errors here; they will be caught by the actual generation request below
  }

  const response = await axios.post(`${baseUrl}/api/generate`, {
    model,
    system: SYSTEM_PROMPT,
    prompt,
    stream: false,
    options: {
      temperature: 0.2
    }
  }, {
    timeout: 300000 // 5 minute max timeout for slow CPUs
  });
  
  return response.data.response;
}

async function generateOllamaStream(prompt: string, config: LLMConfig, onChunk: (chunk: string) => void): Promise<void> {
  const baseUrl = config.baseUrl || 'http://localhost:11434';
  let model = config.model || 'llama3';
  
  await ensureOllamaRunning(baseUrl);

  // Try to find the exact model, throw error if not found
  try {
     const tagsResp = await axios.get(`${baseUrl}/api/tags`);
     const models = tagsResp.data?.models || [];
     const hasModel = models.some((m: any) => m.name === model || m.name.startsWith(model + ':'));
     if (!hasModel) throw new Error(`Ollama model '${model}' not found. Please run 'ollama run ${model}' in your terminal to download it.`);
  } catch (err: any) {
     if (err.message.includes('Ollama model')) throw err;
  }

  const response = await axios.post(`${baseUrl}/api/generate`, {
    model,
    system: SYSTEM_PROMPT,
    prompt,
    stream: true,
    options: { temperature: 0.2 }
  }, {
    responseType: 'stream',
    timeout: 300000 
  });
  
  return new Promise((resolve, reject) => {
    response.data.on('data', (chunk: Buffer) => {
      try {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            onChunk(parsed.response);
          }
        }
      } catch (e) {
        // partial chunk or parse error, ignore
      }
    });
    response.data.on('end', () => resolve());
    response.data.on('error', (err: any) => reject(err));
  });
}

async function generateLMStudio(prompt: string, config: LLMConfig): Promise<string> {
  // LM Studio exposes an OpenAI-compatible API
  const baseUrl = config.baseUrl || 'http://localhost:1234/v1';
  return await callOpenAICompatibleAPI(baseUrl, config.model || 'local-model', '', prompt);
}

async function generateGroq(prompt: string, config: LLMConfig): Promise<string> {
  if (!config.apiKey) throw new Error("Groq API key is missing");
  const baseUrl = 'https://api.groq.com/openai/v1';
  return await callOpenAICompatibleAPI(baseUrl, config.model || 'llama3-8b-8192', config.apiKey, prompt);
}

async function generateOpenAI(prompt: string, config: LLMConfig): Promise<string> {
  if (!config.apiKey) throw new Error("OpenAI API key is missing");
  const baseUrl = 'https://api.openai.com/v1';
  return await callOpenAICompatibleAPI(baseUrl, config.model || 'gpt-4o', config.apiKey, prompt);
}

async function callOpenAICompatibleAPI(baseUrl: string, model: string, apiKey: string, prompt: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await axios.post(`${baseUrl}/chat/completions`, {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2
  }, { headers });

  return response.data.choices[0].message.content;
}

async function generateClaude(prompt: string, config: LLMConfig): Promise<string> {
  if (!config.apiKey) throw new Error("Anthropic API key is missing");
  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: config.model || 'claude-3-opus-20240229',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: prompt }
    ]
  }, {
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }
  });

  return response.data.content[0].text;
}

async function generateGemini(prompt: string, config: LLMConfig): Promise<string> {
  if (!config.apiKey) throw new Error("Gemini API key is missing");
  const model = config.model || 'gemini-1.5-pro-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
  
  const response = await axios.post(url, {
    system_instruction: {
      parts: { text: SYSTEM_PROMPT }
    },
    contents: [
      { parts: [{ text: prompt }] }
    ]
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  return response.data.candidates[0].content.parts[0].text;
}
