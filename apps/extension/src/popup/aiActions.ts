import { storage, type Workspace } from '../shared';

// Types for AI interactions
export interface SummarizeRequest {
  text: string;
  workspace: Workspace;
}

export interface SummarizeResponse {
  summary: string;
  key_points: string[];
  actions: string[];
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Summarize content within the context of a specific workspace
 */
export async function summarizeInContext(
  request: SummarizeRequest
): Promise<SummarizeResponse> {
  try {
    // Load settings to get API key and model
    const settings = await storage.getSettings();

    if (!settings.openaiApiKey) {
      throw new Error(
        'OpenAI API key is required. Please configure it in the Options page.'
      );
    }

    // Construct system prompt based on workspace context
    const systemPrompt = constructSystemPrompt(request.workspace);

    // Prepare the OpenAI request
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Please analyze and summarize the following content:\n\n${request.text}`,
      },
    ];

    // Call OpenAI API
    const response = await callOpenAI({
      model: settings.openaiModel || 'gpt-4o',
      messages,
      temperature: 0.3,
      max_tokens: 600,
      apiKey: settings.openaiApiKey,
    });

    // Parse the response
    const result = parseAIResponse(response);

    return result;
  } catch (error) {
    console.error('Failed to summarize content:', error);
    throw new Error(`Summarization failed: ${error.message}`);
  }
}

/**
 * Construct a system prompt based on workspace context
 */
function constructSystemPrompt(workspace: Workspace): string {
  // If workspace has a custom primer, use it as the primary instruction
  if (workspace.contextPrimer) {
    return `You are an AI assistant integrated into a browser workspace called "${workspace.name}".

ANALYSIS INSTRUCTIONS:
${workspace.contextPrimer}

Your task is to analyze the provided content following the instructions above. Structure your response as a JSON object with:
{
  "summary": "Brief summary in the requested style/tone",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "actions": ["Actionable step 1", "Actionable step 2", "Actionable step 3"]
}

Ensure your analysis strictly follows the primer instructions while maintaining the JSON format.`;
  }

  // Fallback to generic workspace-aware prompt
  const basePrompt = `You are an AI assistant integrated into a browser workspace management system called "Multiverse". The user has organized their browsing into themed workspaces, and you help them analyze, summarize, and understand content within the context of their current workspace.

Current workspace: "${workspace.name}"
Workspace description: ${workspace.description || 'No description provided'}

Your task is to analyze content and provide structured insights that help the user make the most of their browsing session within this workspace context. Focus on:
1. Connections between this content and the workspace theme
2. Key insights relevant to ${workspace.name}
3. Actionable next steps the user might take

Please respond with a structured analysis that includes:
- A concise summary (2-3 sentences)
- 3-5 key points extracted from the content
- 2-4 suggested actions the user might take based on this content

Format your response as a JSON object with the following structure:
{
  "summary": "Brief summary here",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "actions": ["Action 1", "Action 2", "Action 3"]
}

Ensure all content is relevant to the "${workspace.name}" workspace context.`;

  return basePrompt;
}

/**
 * Call OpenAI API with proper error handling
 */
async function callOpenAI(params: {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens: number;
  apiKey: string;
}): Promise<OpenAIResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        response_format: { type: 'json_object' }, // Enable JSON mode
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error?.message ||
        `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data: OpenAIResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Please check your internet connection');
    }

    throw error;
  }
}

/**
 * Parse AI response and extract structured data
 */
function parseAIResponse(response: OpenAIResponse): SummarizeResponse {
  try {
    const content = response.choices[0].message.content;

    // Try to parse as JSON first
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (jsonError) {
      // Fallback: try to extract structured data from text
      return parseTextResponse(content);
    }

    // Validate the parsed response has required fields
    if (
      !parsed.summary ||
      !Array.isArray(parsed.key_points) ||
      !Array.isArray(parsed.actions)
    ) {
      return parseTextResponse(content);
    }

    return {
      summary: parsed.summary,
      key_points: parsed.key_points.slice(0, 5), // Limit to 5 points
      actions: parsed.actions.slice(0, 4), // Limit to 4 actions
    };
  } catch (error) {
    console.warn('Failed to parse AI response:', error);
    throw new Error('Failed to parse AI response format');
  }
}

/**
 * Fallback parser for non-JSON responses
 */
function parseTextResponse(content: string): SummarizeResponse {
  try {
    // Try to extract structured information from text
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    let summary = '';
    const key_points: string[] = [];
    const actions: string[] = [];

    let currentSection = '';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('summary') || lowerLine.includes('overview')) {
        currentSection = 'summary';
        continue;
      } else if (
        lowerLine.includes('key point') ||
        lowerLine.includes('main point') ||
        lowerLine.includes('important')
      ) {
        currentSection = 'key_points';
        continue;
      } else if (
        lowerLine.includes('action') ||
        lowerLine.includes('next step') ||
        lowerLine.includes('recommendation')
      ) {
        currentSection = 'actions';
        continue;
      }

      // Extract content based on current section
      if (currentSection === 'summary' && !summary) {
        summary = line.replace(/^(summary|overview):/i, '').trim();
      } else if (currentSection === 'key_points' && key_points.length < 5) {
        const cleanedPoint = line
          .replace(/^[-•*]\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .trim();
        if (cleanedPoint && !cleanedPoint.toLowerCase().includes('key point')) {
          key_points.push(cleanedPoint);
        }
      } else if (currentSection === 'actions' && actions.length < 4) {
        const cleanedAction = line
          .replace(/^[-•*]\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .trim();
        if (cleanedAction && !cleanedAction.toLowerCase().includes('action')) {
          actions.push(cleanedAction);
        }
      }
    }

    // Fallback if structured parsing fails
    if (!summary && lines.length > 0) {
      summary = lines[0];
    }

    if (key_points.length === 0) {
      key_points.push('Content analysis completed');
    }

    if (actions.length === 0) {
      actions.push('Review the summarized content');
    }

    return { summary, key_points, actions };
  } catch (error) {
    console.warn('Fallback parsing failed:', error);
    return {
      summary: 'Analysis completed - see full content for details',
      key_points: ['Content processed successfully'],
      actions: ['Review the analysis results'],
    };
  }
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): boolean {
  return apiKey && apiKey.startsWith('sk-') && apiKey.length > 20;
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Check if content is too long for processing
 */
export function isContentTooLong(
  text: string,
  maxTokens: number = 3000
): boolean {
  return estimateTokens(text) > maxTokens;
}

/**
 * Truncate content to fit within token limits
 */
export function truncateContent(
  text: string,
  maxTokens: number = 3000
): string {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const ratio = maxTokens / estimatedTokens;
  const truncatedLength = Math.floor(text.length * ratio * 0.9); // 90% to be safe

  return (
    text.substring(0, truncatedLength) +
    '\n\n[Content truncated due to length...]'
  );
}
