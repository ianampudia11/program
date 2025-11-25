import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

/**
 * Proxy endpoint for OpenRouter models API
 * This avoids CORS issues when calling OpenRouter directly from the frontend
 */
router.get('/models', async (req, res) => {
  try {

    const openRouterUrl = 'https://openrouter.ai/api/v1/models';
    

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://powerchat.plus',
      'X-Title': 'PowerChat Plus'
    };


    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (openRouterApiKey) {
      headers['Authorization'] = `Bearer ${openRouterApiKey}`;
    }


    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(openRouterUrl, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenRouter API responded with status: ${response.status}`);
    }

    const data = await response.json();
    

    res.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('OpenRouter API request timed out');
    } else {
      console.error('Error fetching OpenRouter models:', error);
    }
    

    const fallbackModels = {
      data: [
        {
          id: 'openai/gpt-4o-mini',
          name: 'GPT-4o Mini',
          description: 'Fast and efficient model for most tasks',
          pricing: { prompt: '0.00015', completion: '0.0006' },
          context_length: 128000,
          architecture: { modality: 'text' }
        },
        {
          id: 'openai/gpt-4o',
          name: 'GPT-4o',
          description: 'Most capable OpenAI model',
          pricing: { prompt: '0.0025', completion: '0.01' },
          context_length: 128000,
          architecture: { modality: 'text' }
        },
        {
          id: 'anthropic/claude-3-5-sonnet',
          name: 'Claude 3.5 Sonnet',
          description: 'Anthropic\'s most capable model',
          pricing: { prompt: '0.003', completion: '0.015' },
          context_length: 200000,
          architecture: { modality: 'text' }
        },
        {
          id: 'anthropic/claude-3-haiku',
          name: 'Claude 3 Haiku',
          description: 'Fast and efficient Anthropic model',
          pricing: { prompt: '0.00025', completion: '0.00125' },
          context_length: 200000,
          architecture: { modality: 'text' }
        },
        {
          id: 'google/gemini-pro',
          name: 'Gemini Pro',
          description: 'Google\'s advanced language model',
          pricing: { prompt: '0.000125', completion: '0.000375' },
          context_length: 32000,
          architecture: { modality: 'text' }
        },
        {
          id: 'meta-llama/llama-3.1-8b-instruct',
          name: 'Llama 3.1 8B Instruct',
          description: 'Meta\'s open-source instruction-tuned model',
          pricing: { prompt: '0.00018', completion: '0.00018' },
          context_length: 128000,
          architecture: { modality: 'text' }
        },
        {
          id: 'mistralai/mistral-7b-instruct',
          name: 'Mistral 7B Instruct',
          description: 'Mistral\'s efficient instruction-tuned model',
          pricing: { prompt: '0.00025', completion: '0.00025' },
          context_length: 32000,
          architecture: { modality: 'text' }
        }
      ]
    };
    
    res.json(fallbackModels);
  }
});

export default router;
