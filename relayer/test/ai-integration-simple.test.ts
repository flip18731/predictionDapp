/**
 * COMPLIANCE: Simple AI Integration Tests
 * 
 * Minimal tests that verify API connectivity without requiring complex responses.
 * Use this if the full test is too slow or hits rate limits.
 * 
 * Run: npx ts-node test/ai-integration-simple.test.ts
 */

import axios from 'axios';
import { config } from '../src/config';
import * as dotenv from 'dotenv';

dotenv.config();

interface SimpleTestResult {
  api: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  error?: string;
  endpoint?: string;
  duration?: number;
}

const results: SimpleTestResult[] = [];

/**
 * Test Perplexity API endpoint connectivity
 */
async function testPerplexityConnectivity(): Promise<SimpleTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n📡 Testing Perplexity API connectivity...');
    
    if (!config.perplexityApiKey) {
      return {
        api: 'Perplexity',
        status: 'SKIPPED',
        error: 'PERPLEXITY_API_KEY not configured'
      };
    }

    const endpoint = 'https://api.perplexity.ai/chat/completions';
    
    // Simple test: minimal request to check API key validity
    const response = await axios.post(
      endpoint,
      {
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: 'Say "test" if you can read this.'
          }
        ],
        max_tokens: 10
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.perplexityApiKey}`
        },
        timeout: 10000 // 10 seconds for connectivity test
      }
    );

    const duration = Date.now() - startTime;

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response structure');
    }

    console.log('✅ Perplexity API connectivity test PASSED');
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Response received: ${response.data.choices[0].message.content.substring(0, 50)}...`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      api: 'Perplexity',
      status: 'PASSED',
      endpoint,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.error('❌ Perplexity API test FAILED: Invalid API key');
        return {
          api: 'Perplexity',
          status: 'FAILED',
          error: 'Invalid API key (401 Unauthorized)',
          endpoint: 'https://api.perplexity.ai/chat/completions',
          duration
        };
      } else if (error.code === 'ECONNABORTED') {
        console.error('❌ Perplexity API test FAILED: Timeout');
        return {
          api: 'Perplexity',
          status: 'FAILED',
          error: 'Request timeout',
          endpoint: 'https://api.perplexity.ai/chat/completions',
          duration
        };
      }
    }
    
    console.error('❌ Perplexity API test FAILED:', error.message);
    return {
      api: 'Perplexity',
      status: 'FAILED',
      error: error.message,
      duration
    };
  }
}

/**
 * Test Gemini API endpoint connectivity
 */
async function testGeminiConnectivity(): Promise<SimpleTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n📡 Testing Gemini API connectivity...');
    
    if (!config.geminiApiKey) {
      return {
        api: 'Gemini',
        status: 'SKIPPED',
        error: 'GEMINI_API_KEY not configured'
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.geminiApiKey}`;
    
    // Simple test: minimal request
    const response = await axios.post(
      endpoint,
      {
        contents: [{
          parts: [{
            text: 'Say "test" if you can read this.'
          }]
        }],
        generationConfig: {
          maxOutputTokens: 10
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const duration = Date.now() - startTime;

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid API response structure');
    }

    console.log('✅ Gemini API connectivity test PASSED');
    console.log(`   Endpoint: ${endpoint.split('?')[0]}...`);
    console.log(`   Response received: ${response.data.candidates[0].content.parts[0].text.substring(0, 50)}...`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      api: 'Gemini',
      status: 'PASSED',
      endpoint: endpoint.split('?')[0],
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400 || error.response?.status === 403) {
        console.error('❌ Gemini API test FAILED: Invalid API key');
        return {
          api: 'Gemini',
          status: 'FAILED',
          error: `Invalid API key (${error.response.status})`,
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro',
          duration
        };
      }
    }
    
    console.error('❌ Gemini API test FAILED:', error.message);
    return {
      api: 'Gemini',
      status: 'FAILED',
      error: error.message,
      duration
    };
  }
}

/**
 * Test OpenAI API endpoint connectivity
 */
async function testOpenAIConnectivity(): Promise<SimpleTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n📡 Testing OpenAI API connectivity...');
    
    if (!config.openaiApiKey) {
      return {
        api: 'OpenAI',
        status: 'SKIPPED',
        error: 'OPENAI_API_KEY not configured'
      };
    }

    const endpoint = 'https://api.openai.com/v1/chat/completions';
    
    // Simple test: minimal request
    const response = await axios.post(
      endpoint,
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Say "test" if you can read this.'
          }
        ],
        max_tokens: 10
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openaiApiKey}`
        },
        timeout: 10000
      }
    );

    const duration = Date.now() - startTime;

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response structure');
    }

    console.log('✅ OpenAI API connectivity test PASSED');
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Response received: ${response.data.choices[0].message.content.substring(0, 50)}...`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      api: 'OpenAI',
      status: 'PASSED',
      endpoint,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.error('❌ OpenAI API test FAILED: Invalid API key');
        return {
          api: 'OpenAI',
          status: 'FAILED',
          error: 'Invalid API key (401 Unauthorized)',
          endpoint: 'https://api.openai.com/v1/chat/completions',
          duration
        };
      }
    }
    
    console.error('❌ OpenAI API test FAILED:', error.message);
    return {
      api: 'OpenAI',
      status: 'FAILED',
      error: error.message,
      duration
    };
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  AI INTEGRATION CONNECTIVITY TESTS');
  console.log('  Clarity Protocol - Quick Check');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('These tests verify API connectivity only.');
  console.log('For full integration tests, run: ai-integration.test.ts');
  console.log('');

  // Check API keys
  console.log('API Key Status:');
  console.log(`  Perplexity: ${config.perplexityApiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Gemini: ${config.geminiApiKey ? '✅ Configured' : '❌ Missing (optional)'}`);
  console.log(`  OpenAI: ${config.openaiApiKey ? '✅ Configured' : '❌ Missing (optional)'}`);
  console.log('');

  // Run tests sequentially
  results.push(await testPerplexityConnectivity());
  results.push(await testGeminiConnectivity());
  results.push(await testOpenAIConnectivity());

  // Print summary
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log('');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    const statusIcon = result.status === 'PASSED' ? '✅' : 
                       result.status === 'FAILED' ? '❌' : '⏭️';
    
    console.log(`${statusIcon} ${result.api.padEnd(20)} ${result.status}`);
    
    if (result.status === 'PASSED' && result.duration) {
      console.log(`   Endpoint: ${result.endpoint}`);
      console.log(`   Duration: ${result.duration}ms`);
    }
    
    if (result.status === 'FAILED' && result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.status === 'SKIPPED' && result.error) {
      console.log(`   Reason: ${result.error}`);
    }
    
    console.log('');

    if (result.status === 'PASSED') passed++;
    else if (result.status === 'FAILED') failed++;
    else skipped++;
  }

  console.log('═══════════════════════════════════════');
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('═══════════════════════════════════════');
  console.log('');

  // Exit with error code if any tests failed
  if (failed > 0) {
    console.error('⚠️  Some tests failed. Please check your API keys.');
    process.exit(1);
  }

  if (passed === 0) {
    console.error('⚠️  No tests passed. Please configure at least PERPLEXITY_API_KEY.');
    process.exit(1);
  }

  console.log('✅ All configured AI integrations are reachable!');
  process.exit(0);
}

// Run tests
main().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});

