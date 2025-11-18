import axios from 'axios';
import { config } from './config';

export interface AIResponse {
  verdict: string;
  summary: string;
  sources: Array<{
    title: string;
    url: string;
    quote: string;
  }>;
}

export class PerplexityClient {
  private apiKey: string;
  private apiUrl = 'https://api.perplexity.ai/chat/completions';
  // FIX: Increased timeout from 15s to 30s for demo stability (some API calls take longer)
  private timeout = 30000; // 30 seconds

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getResolution(question: string): Promise<AIResponse> {
    console.log('📡 Calling Perplexity API...');
    console.log('Question:', question);

    const prompt = `You are Clarity Protocol, an AI evidence agent for prediction market resolution.

Question: ${question}

Instructions:
1. Search trustworthy sources (news, official statements, social media posts with high credibility).
2. Produce a structured JSON object: { "verdict": "Supported/Refuted/Unclear", "summary": string, "sources": [{"title": string, "url": string, "quote": string}] }.
3. Provide 1-3 independent sources with short quotes proving the verdict.
4. Keep summary under 280 characters. Make verdict "Unclear" if evidence is conflicting.

Return ONLY valid JSON.`;

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You surface factual, current data with citations. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: this.timeout
        }
      );

      const content = response.data.choices[0].message.content;
      console.log('📥 API Response received');
      
      // Try to parse JSON from response
      let parsed: AIResponse;
      try {
        // Sometimes the AI wraps JSON in markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        const jsonString = jsonMatch[1] || content;
        parsed = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', content);
        throw new Error(`Invalid JSON response from AI: ${parseError}`);
      }

      // FIX: Validate structure - ensure sources array exists and is not empty
      if (!parsed.verdict || !parsed.summary || !Array.isArray(parsed.sources)) {
        throw new Error('AI response missing required fields (verdict, summary, sources)');
      }

      // FIX: Ensure sources array has at least one valid source
      if (parsed.sources.length === 0) {
        console.warn('⚠️ No sources provided by AI, adding default "Unclear" verdict');
        parsed.sources = [{
          title: 'Insufficient Evidence',
          url: '',
          quote: 'AI could not find sufficient sources to support or refute the question'
        }];
        parsed.verdict = 'Unclear';
      }

      // FIX: Validate and normalize each source
      parsed.sources = parsed.sources
        .filter(source => source && typeof source === 'object')
        .map(source => ({
          title: (source.title || 'Unknown').substring(0, 100), // Limit length
          url: (source.url || '').substring(0, 200), // Limit length
          quote: (source.quote || '').substring(0, 200) // Limit length
        }))
        .slice(0, 3); // Max 3 sources

      // Validate verdict
      const validVerdicts = ['Supported', 'Refuted', 'Unclear'];
      const normalizedVerdict = parsed.verdict.trim();
      if (!validVerdicts.includes(normalizedVerdict)) {
        console.warn(`⚠️ Invalid verdict "${parsed.verdict}", defaulting to "Unclear"`);
        parsed.verdict = 'Unclear';
      } else {
        parsed.verdict = normalizedVerdict;
      }

      // FIX: Ensure summary is within length limit
      if (parsed.summary.length > 280) {
        parsed.summary = parsed.summary.substring(0, 277) + '...';
      }

      console.log('✅ Response parsed successfully');
      console.log('Verdict:', parsed.verdict);
      console.log('Sources:', parsed.sources.length);

      return parsed;

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Perplexity API error:', error.response?.data || error.message);
        // FIX: Better error message for demo
        if (error.code === 'ECONNABORTED') {
          throw new Error(`Perplexity API timeout (${this.timeout}ms). Try again or check network.`);
        }
        if (error.response?.status === 429) {
          throw new Error('Perplexity API rate limit exceeded. Please wait before retrying.');
        }
        throw new Error(`Perplexity API failed: ${error.response?.status} ${error.message}`);
      }
      throw error;
    }
  }
}

// Singleton instance
export const perplexityClient = new PerplexityClient(config.perplexityApiKey);
