// Model Fetcher Module
// Handles fetching models from AI provider APIs

import { cachedModels, saveCachedModels } from './model-cache.js';

// Fetch available models from OpenAI API
export async function fetchOpenAIModels(showStatus) {
  const apiKey = document.getElementById('openai-key').value.trim();
  const btn = document.getElementById('fetch-openai-models');
  const select = document.getElementById('openai-model');
  const currentValue = select.value;
  
  if (!apiKey) {
    showStatus('Please enter your OpenAI API key first', 'error');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '⏳ Loading...';
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter for chat models (gpt, o1, o3, chatgpt)
    const chatModels = data.data
      .filter(m => 
        m.id.includes('gpt') || 
        m.id.startsWith('o1') || 
        m.id.startsWith('o3') ||
        m.id.includes('chatgpt')
      )
      .map(m => ({ id: m.id, displayName: m.id }))
      .sort((a, b) => {
        // Sort: gpt-4 and newer first, then by name
        const aScore = a.id.includes('gpt-4') || a.id.includes('gpt-5') || a.id.startsWith('o') ? 0 : 1;
        const bScore = b.id.includes('gpt-4') || b.id.includes('gpt-5') || b.id.startsWith('o') ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return b.id.localeCompare(a.id); // Reverse alphabetical (newer versions first)
      });
    
    // Cache the models
    cachedModels.openai = chatModels;
    await saveCachedModels();
    
    // Clear and repopulate select
    select.innerHTML = '';
    
    chatModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.displayName;
      select.appendChild(option);
    });
    
    // Add custom option at the end
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom Model...';
    select.appendChild(customOption);
    
    // Restore previous selection if it exists, otherwise select first
    const modelIds = chatModels.map(m => m.id);
    if (modelIds.includes(currentValue)) {
      select.value = currentValue;
    } else if (chatModels.length > 0) {
      select.value = chatModels[0].id;
    }
    
    showStatus(`✓ Loaded ${chatModels.length} models from OpenAI`, 'success');
    
  } catch (error) {
    showStatus(`Failed to fetch models: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Fetch';
  }
}

// Fetch available models from Claude/Anthropic API
export async function fetchClaudeModels(showStatus) {
  const apiKey = document.getElementById('claude-key').value.trim();
  const btn = document.getElementById('fetch-claude-models');
  const select = document.getElementById('claude-model');
  const currentValue = select.value;
  
  if (!apiKey) {
    showStatus('Please enter your Claude API key first', 'error');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '⏳ Loading...';
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract and sort models
    const models = data.data
      .map(m => ({
        id: m.id,
        displayName: m.id.replace('claude-', 'Claude ').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }))
      .sort((a, b) => {
        // Sort by model family and version
        const aFamily = a.id.split('-')[1]; // "3", "4", etc.
        const bFamily = b.id.split('-')[1];
        if (aFamily !== bFamily) {
          return bFamily.localeCompare(aFamily); // Newer families first
        }
        return b.id.localeCompare(a.id); // Newer versions first within family
      });
    
    // Cache the models
    cachedModels.claude = models;
    await saveCachedModels();
    
    // Clear and repopulate select
    select.innerHTML = '';
    
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.displayName;
      select.appendChild(option);
    });
    
    // Add custom option at the end
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom Model...';
    select.appendChild(customOption);
    
    // Restore previous selection if it exists
    const modelIds = models.map(m => m.id);
    if (modelIds.includes(currentValue)) {
      select.value = currentValue;
    } else if (models.length > 0) {
      select.value = models[0].id;
    }
    
    showStatus(`✓ Loaded ${models.length} models from Anthropic`, 'success');
    
  } catch (error) {
    showStatus(`Failed to fetch models: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Fetch';
  }
}

// Fetch available models from Groq API
export async function fetchGroqModels(showStatus) {
  const apiKey = document.getElementById('groq-key').value.trim();
  const btn = document.getElementById('fetch-groq-models');
  const select = document.getElementById('groq-model');
  const currentValue = select.value;
  
  if (!apiKey) {
    showStatus('Please enter your Groq API key first', 'error');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '⏳ Loading...';
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter for active models
    const models = data.data
      .filter(m => m.active !== false)
      .map(m => ({ id: m.id, displayName: m.id }))
      .sort((a, b) => a.id.localeCompare(b.id));
    
    // Cache the models
    cachedModels.groq = models;
    await saveCachedModels();
    
    // Clear and repopulate select
    select.innerHTML = '';
    
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.displayName;
      select.appendChild(option);
    });
    
    // Add custom option at the end
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom Model...';
    select.appendChild(customOption);
    
    // Restore previous selection if it exists
    const modelIds = models.map(m => m.id);
    if (modelIds.includes(currentValue)) {
      select.value = currentValue;
    } else if (models.length > 0) {
      select.value = models[0].id;
    }
    
    showStatus(`✓ Loaded ${models.length} models from Groq`, 'success');
    
  } catch (error) {
    showStatus(`Failed to fetch models: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Fetch';
  }
}

// Fetch available models from Google Gemini API
export async function fetchGeminiModels(showStatus) {
  const apiKey = document.getElementById('gemini-key').value.trim();
  const btn = document.getElementById('fetch-gemini-models');
  const select = document.getElementById('gemini-model');
  const currentValue = select.value;
  
  if (!apiKey) {
    showStatus('Please enter your Google AI API key first', 'error');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '⏳ Loading...';
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter for Gemini models that support generateContent
    const models = data.models
      .filter(m => 
        m.name.includes('gemini') && 
        m.supportedGenerationMethods?.includes('generateContent')
      )
      .map(m => ({
        id: m.name.replace('models/', ''),
        displayName: m.displayName || m.name.replace('models/', '')
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    // Cache the models
    cachedModels.gemini = models;
    await saveCachedModels();
    
    // Clear and repopulate select
    select.innerHTML = '';
    
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.displayName;
      select.appendChild(option);
    });
    
    // Add custom option at the end
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom Model...';
    select.appendChild(customOption);
    
    // Restore previous selection if it exists
    const modelIds = models.map(m => m.id);
    if (modelIds.includes(currentValue)) {
      select.value = currentValue;
    } else if (models.length > 0) {
      select.value = models[0].id;
    }
    
    showStatus(`✓ Loaded ${models.length} models from Google AI`, 'success');
    
  } catch (error) {
    showStatus(`Failed to fetch models: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Fetch';
  }
}
