/**
 * Clarity Protocol v2: Multi-AI Consensus Engine
 * 
 * Implements Layer 0: Multi-Agent AI Consensus with Chain-of-Thought (CoT)
 * and Self-Verification to prevent hallucinations.
 */

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
  confidence?: number;
  analysis?: string;
  evaluation?: string;
}

export interface ConsensusResult {
  isClear: boolean;
  answer: AIResponse | null;
  consensusCount: number;
  totalModels: number;
  details: {
    model: string;
    response: AIResponse;
    verified: boolean;
  }[];
}

export class AIConsensusEngine {
  private perplexityApiKey: string;
  private geminiApiKey?: string;
  private openaiApiKey?: string;

  constructor(
    perplexityApiKey: string,
    geminiApiKey?: string,
    openaiApiKey?: string
  ) {
    this.perplexityApiKey = perplexityApiKey;
    this.geminiApiKey = geminiApiKey;
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * Create advanced Chain-of-Thought prompt with JSON structure enforcement
   */
  private createAdvancedPrompt(question: string): string {
    return `You are Clarity Protocol, an impartial fact-checking oracle for prediction markets.

Question: ${question}

INSTRUCTIONS - Follow these steps EXACTLY:

1. ANALYSIS: Break down the question into verifiable facts.
2. RESEARCH: Search and cite at least 3 trustworthy, independent sources that support or refute these facts. Provide URLs.
3. EVALUATION: Assess source credibility and identify potential contradictions.
4. CONCLUSION: Based on analysis, provide a final verdict: "SUPPORTED", "REFUTED", or "UNCLEAR".
5. CONFIDENCE: Provide a confidence score from 0-100% for your conclusion.

Return ONLY valid JSON in this exact format:
{
  "analysis": "Step 1: Fact breakdown",
  "evaluation": "Step 3: Source credibility assessment",
  "verdict": "SUPPORTED|REFUTED|UNCLEAR",
  "summary": "Brief explanation (max 280 chars)",
  "confidence": 85,
  "sources": [
    {
      "title": "Source title",
      "url": "https://...",
      "quote": "Relevant quote from source"
    }
  ]
}`;
  }

  /**
   * Self-Verification: Check if AI can reconstruct original question from its answer
   */
  private async selfVerify(
    model: string,
    originalQuestion: string,
    aiResponse: AIResponse
  ): Promise<boolean> {
    const verificationPrompt = `You previously answered this question: "${originalQuestion}"
    
Your answer was: ${JSON.stringify(aiResponse)}

Now, reconstruct the ORIGINAL question you were trying to answer based ONLY on your answer above.

Return ONLY the reconstructed question, nothing else.`;

    try {
      let reconstructedQuestion: string;
      
      if (model === 'perplexity') {
        const response = await this.queryPerplexity(verificationPrompt);
        reconstructedQuestion = response.trim();
      } else if (model === 'gemini' && this.geminiApiKey) {
        const response = await this.queryGemini(verificationPrompt);
        reconstructedQuestion = response.trim();
      } else if (model === 'openai' && this.openaiApiKey) {
        const response = await this.queryOpenAI(verificationPrompt);
        reconstructedQuestion = response.trim();
      } else {
        // Skip verification if model not available
        return true;
      }

      // Check if reconstructed question matches original (fuzzy match)
      const similarity = this.calculateSimilarity(
        originalQuestion.toLowerCase(),
        reconstructedQuestion.toLowerCase()
      );

      // If similarity > 70%, verification passes
      const verified = similarity > 0.7;
      
      if (!verified) {
        console.warn(`⚠️ Self-verification failed for ${model}. Similarity: ${(similarity * 100).toFixed(1)}%`);
        console.warn(`   Original: "${originalQuestion}"`);
        console.warn(`   Reconstructed: "${reconstructedQuestion}"`);
      }

      return verified;
    } catch (error) {
      console.warn(`⚠️ Self-verification error for ${model}:`, error);
      // On error, be conservative and reject
      return false;
    }
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Query Perplexity AI
   */
  private async queryPerplexity(prompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
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
        max_tokens: 1500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.perplexityApiKey}`
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Query Google Gemini AI
   */
  private async queryGemini(prompt: string): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1500
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid Gemini API response structure');
      }

      return response.data.candidates[0].content.parts[0].text;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Gemini API error:', error.response?.data || error.message);
        throw new Error(`Gemini API failed: ${error.response?.status} ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Query OpenAI GPT
   */
  private async queryOpenAI(prompt: string): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a factual evidence agent. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          timeout: 30000
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid OpenAI API response structure');
      }

      return response.data.choices[0].message.content;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('❌ OpenAI API error:', error.response?.data || error.message);
        throw new Error(`OpenAI API failed: ${error.response?.status} ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse AI response to structured format
   */
  private parseAIResponse(content: string): AIResponse | null {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      const jsonString = jsonMatch[1] || content;
      const parsed = JSON.parse(jsonString);

      // Validate structure
      if (!parsed.verdict || !parsed.summary || !Array.isArray(parsed.sources)) {
        return null;
      }

      // Normalize verdict
      const verdict = parsed.verdict.toUpperCase();
      const validVerdicts = ['SUPPORTED', 'REFUTED', 'UNCLEAR'];
      if (!validVerdicts.includes(verdict)) {
        parsed.verdict = 'UNCLEAR';
      } else {
        parsed.verdict = verdict;
      }

      return parsed as AIResponse;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return null;
    }
  }

  /**
   * Main consensus function: Query multiple AIs and find consensus
   */
  async getAIConsensus(question: string): Promise<ConsensusResult> {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🤖 LAYER 0: Multi-AI Consensus Engine');
    console.log('═══════════════════════════════════════');
    console.log('Question:', question);
    console.log('');

    const advancedPrompt = this.createAdvancedPrompt(question);
    const results: { model: string; response: AIResponse; verified: boolean }[] = [];

    // Step 1: Parallel queries to multiple AI models
    console.log('📡 Querying AI models in parallel...');
    const queries: Promise<{ model: string; content: string | null }>[] = [];

    // Always query Perplexity
    queries.push(
      this.queryPerplexity(advancedPrompt)
        .then(content => ({ model: 'perplexity', content }))
        .catch(error => {
          console.error('❌ Perplexity query failed:', error.message);
          throw error;
        })
    );

    // Query Gemini if available
    if (this.geminiApiKey) {
      queries.push(
        this.queryGemini(advancedPrompt)
          .then(content => ({ model: 'gemini', content }))
          .catch(error => {
            console.warn('⚠️ Gemini query failed:', error.message);
            return { model: 'gemini', content: null };
          })
      );
    }

    // Query OpenAI if available
    if (this.openaiApiKey) {
      queries.push(
        this.queryOpenAI(advancedPrompt)
          .then(content => ({ model: 'openai', content }))
          .catch(error => {
            console.warn('⚠️ OpenAI query failed:', error.message);
            return { model: 'openai', content: null };
          })
      );
    }

    // Wait for all queries
    const queryResults = await Promise.all(queries);

    // Step 2: Parse and verify responses
    console.log('');
    console.log('🔍 Parsing and verifying responses...');
    
    for (const { model, content } of queryResults) {
      if (!content) {
        console.warn(`⚠️ ${model}: No response`);
        continue;
      }

      const parsed = this.parseAIResponse(content);
      if (!parsed) {
        console.warn(`⚠️ ${model}: Failed to parse response`);
        continue;
      }

      // Step 3: Self-verification
      console.log(`   Verifying ${model} response...`);
      const verified = await this.selfVerify(model, question, parsed);

      results.push({
        model,
        response: parsed,
        verified
      });

      console.log(`   ${verified ? '✅' : '❌'} ${model}: ${parsed.verdict} (confidence: ${parsed.confidence || 'N/A'}%)`);
    }

    // Step 4: Consensus logic
    console.log('');
    console.log('📊 Consensus Analysis:');
    
    const verifiedResults = results.filter(r => r.verified);
    if (verifiedResults.length === 0) {
      console.error('❌ All responses failed verification!');
      return {
        isClear: false,
        answer: null,
        consensusCount: 0,
        totalModels: results.length,
        details: results
      };
    }

    // Count verdicts
    const verdictCounts: Record<string, number> = {};
    for (const { response } of verifiedResults) {
      const verdict = response.verdict;
      verdictCounts[verdict] = (verdictCounts[verdict] || 0) + 1;
    }

    console.log('   Verdict distribution:', verdictCounts);

    // Consensus threshold: 2 out of 3 (or majority if fewer models)
    const threshold = Math.ceil(verifiedResults.length / 2);
    const consensusVerdict = Object.entries(verdictCounts)
      .find(([_, count]) => count >= threshold)?.[0];

    if (consensusVerdict) {
      // Find the response with highest confidence for the consensus verdict
      const consensusResponse = verifiedResults
        .filter(r => r.response.verdict === consensusVerdict)
        .sort((a, b) => (b.response.confidence || 0) - (a.response.confidence || 0))[0];

      console.log('');
      console.log('✅ CONSENSUS REACHED:', consensusVerdict);
      console.log(`   Agreement: ${verdictCounts[consensusVerdict]}/${verifiedResults.length} models`);
      console.log('');

      return {
        isClear: true,
        answer: consensusResponse.response,
        consensusCount: verdictCounts[consensusVerdict],
        totalModels: verifiedResults.length,
        details: results
      };
    } else {
      console.error('');
      console.error('❌ NO CONSENSUS: Models disagree');
      console.error('   Manual intervention required');
      console.error('');

      return {
        isClear: false,
        answer: null,
        consensusCount: 0,
        totalModels: verifiedResults.length,
        details: results
      };
    }
  }
}
