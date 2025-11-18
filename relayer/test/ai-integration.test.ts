/**
 * COMPLIANCE: AI Integration Tests
 * 
 * Tests all three AI integrations:
 * - Perplexity AI
 * - Google Gemini
 * - OpenAI GPT
 * 
 * Run: npx ts-node test/ai-integration.test.ts
 */

import { PerplexityClient } from '../src/perplexityClient';
import { AIConsensusEngine } from '../src/aiConsensus';
import { config } from '../src/config';
import * as dotenv from 'dotenv';

dotenv.config();

// Test question (simple, verifiable fact)
const TEST_QUESTION = "Is Bitcoin a cryptocurrency?";

interface TestResult {
  api: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  error?: string;
  response?: any;
  duration?: number;
}

const results: TestResult[] = [];

/**
 * Test Perplexity AI Integration
 */
async function testPerplexity(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n📡 Testing Perplexity AI...');
    
    if (!config.perplexityApiKey) {
      return {
        api: 'Perplexity',
        status: 'SKIPPED',
        error: 'PERPLEXITY_API_KEY not configured'
      };
    }

    const client = new PerplexityClient(config.perplexityApiKey);
    const response = await client.getResolution(TEST_QUESTION);
    
    const duration = Date.now() - startTime;
    
    // Validate response structure
    if (!response.verdict || !response.summary || !Array.isArray(response.sources)) {
      throw new Error('Invalid response structure');
    }
    
    const validVerdicts = ['Supported', 'Refuted', 'Unclear'];
    if (!validVerdicts.includes(response.verdict)) {
      throw new Error(`Invalid verdict: ${response.verdict}`);
    }

    console.log('✅ Perplexity AI test PASSED');
    console.log(`   Verdict: ${response.verdict}`);
    console.log(`   Sources: ${response.sources.length}`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      api: 'Perplexity',
      status: 'PASSED',
      response: {
        verdict: response.verdict,
        summaryLength: response.summary.length,
        sourcesCount: response.sources.length
      },
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ Perplexity AI test FAILED:', error.message);
    
    return {
      api: 'Perplexity',
      status: 'FAILED',
      error: error.message,
      duration
    };
  }
}

/**
 * Test Gemini AI Integration (via AI Consensus Engine)
 */
async function testGemini(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n📡 Testing Google Gemini AI...');
    
    if (!config.geminiApiKey) {
      return {
        api: 'Gemini',
        status: 'SKIPPED',
        error: 'GEMINI_API_KEY not configured'
      };
    }

    // Use AI Consensus Engine to test Gemini
    // Create engine with only Perplexity (required) and Gemini
    const engine = new AIConsensusEngine(
      config.perplexityApiKey, // Required - must be configured
      config.geminiApiKey, // This is what we're testing
      undefined // No OpenAI for this test
    );

    // Test via consensus engine - it will call Gemini if configured
    const consensus = await engine.getAIConsensus(TEST_QUESTION);
    
    const duration = Date.now() - startTime;
    
    // Check if Gemini was queried
    const geminiResult = consensus.details.find(d => d.model === 'gemini');
    
    if (!geminiResult) {
      throw new Error('Gemini was not queried in consensus engine');
    }

    // Validate response structure
    if (!geminiResult.response.verdict || !geminiResult.response.summary) {
      throw new Error('Gemini response missing required fields');
    }

    const validVerdicts = ['SUPPORTED', 'REFUTED', 'UNCLEAR'];
    if (!validVerdicts.includes(geminiResult.response.verdict.toUpperCase())) {
      throw new Error(`Invalid Gemini verdict: ${geminiResult.response.verdict}`);
    }

    console.log('✅ Gemini AI test PASSED');
    console.log(`   Verdict: ${geminiResult.response.verdict}`);
    console.log(`   Verified: ${geminiResult.verified}`);
    console.log(`   Sources: ${geminiResult.response.sources?.length || 0}`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      api: 'Gemini',
      status: 'PASSED',
      response: {
        verdict: geminiResult.response.verdict,
        verified: geminiResult.verified,
        sourcesCount: geminiResult.response.sources?.length || 0
      },
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ Gemini AI test FAILED:', error.message);
    
    return {
      api: 'Gemini',
      status: 'FAILED',
      error: error.message,
      duration
    };
  }
}

/**
 * Test OpenAI GPT Integration (via AI Consensus Engine)
 */
async function testOpenAI(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n📡 Testing OpenAI GPT...');
    
    if (!config.openaiApiKey) {
      return {
        api: 'OpenAI',
        status: 'SKIPPED',
        error: 'OPENAI_API_KEY not configured'
      };
    }

    // Use AI Consensus Engine to test OpenAI
    // Create engine with only Perplexity (required) and OpenAI
    const engine = new AIConsensusEngine(
      config.perplexityApiKey, // Required - must be configured
      undefined, // No Gemini for this test
      config.openaiApiKey // This is what we're testing
    );

    // Test via consensus engine - it will call OpenAI if configured
    const consensus = await engine.getAIConsensus(TEST_QUESTION);
    
    const duration = Date.now() - startTime;
    
    // Check if OpenAI was queried
    const openaiResult = consensus.details.find(d => d.model === 'openai');
    
    if (!openaiResult) {
      throw new Error('OpenAI was not queried in consensus engine');
    }

    // Validate response structure
    if (!openaiResult.response.verdict || !openaiResult.response.summary) {
      throw new Error('OpenAI response missing required fields');
    }

    const validVerdicts = ['SUPPORTED', 'REFUTED', 'UNCLEAR'];
    if (!validVerdicts.includes(openaiResult.response.verdict.toUpperCase())) {
      throw new Error(`Invalid OpenAI verdict: ${openaiResult.response.verdict}`);
    }

    console.log('✅ OpenAI GPT test PASSED');
    console.log(`   Verdict: ${openaiResult.response.verdict}`);
    console.log(`   Verified: ${openaiResult.verified}`);
    console.log(`   Sources: ${openaiResult.response.sources?.length || 0}`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      api: 'OpenAI',
      status: 'PASSED',
      response: {
        verdict: openaiResult.response.verdict,
        verified: openaiResult.verified,
        sourcesCount: openaiResult.response.sources?.length || 0
      },
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ OpenAI GPT test FAILED:', error.message);
    
    return {
      api: 'OpenAI',
      status: 'FAILED',
      error: error.message,
      duration
    };
  }
}

/**
 * Test AI Consensus Engine with all available models
 */
async function testAIConsensus(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n📡 Testing AI Consensus Engine...');
    
    if (!config.perplexityApiKey) {
      return {
        api: 'AIConsensus',
        status: 'SKIPPED',
        error: 'PERPLEXITY_API_KEY required for consensus engine'
      };
    }

    const engine = new AIConsensusEngine(
      config.perplexityApiKey,
      config.geminiApiKey,
      config.openaiApiKey
    );

    const consensus = await engine.getAIConsensus(TEST_QUESTION);
    
    const duration = Date.now() - startTime;
    
    // Check consensus result
    if (!consensus.isClear) {
      throw new Error(`No consensus reached. Details: ${JSON.stringify(consensus.details)}`);
    }

    if (!consensus.answer) {
      throw new Error('Consensus reached but no answer provided');
    }

    console.log('✅ AI Consensus Engine test PASSED');
    console.log(`   Consensus: ${consensus.isClear}`);
    console.log(`   Verdict: ${consensus.answer.verdict}`);
    console.log(`   Models queried: ${consensus.totalModels}`);
    console.log(`   Consensus count: ${consensus.consensusCount}/${consensus.totalModels}`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      api: 'AIConsensus',
      status: 'PASSED',
      response: {
        verdict: consensus.answer.verdict,
        totalModels: consensus.totalModels,
        consensusCount: consensus.consensusCount,
        isClear: consensus.isClear
      },
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('❌ AI Consensus Engine test FAILED:', error.message);
    
    return {
      api: 'AIConsensus',
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
  console.log('  AI INTEGRATION TESTS');
  console.log('  Clarity Protocol - Compliance Check');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('Test Question:', TEST_QUESTION);
  console.log('');

  // Check API keys
  console.log('API Key Status:');
  console.log(`  Perplexity: ${config.perplexityApiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Gemini: ${config.geminiApiKey ? '✅ Configured' : '❌ Missing (optional)'}`);
  console.log(`  OpenAI: ${config.openaiApiKey ? '✅ Configured' : '❌ Missing (optional)'}`);
  console.log('');

  // Run tests sequentially (to avoid rate limits)
  results.push(await testPerplexity());
  
  // Test Gemini if configured
  if (config.geminiApiKey) {
    results.push(await testGemini());
  } else {
    results.push({
      api: 'Gemini',
      status: 'SKIPPED',
      error: 'GEMINI_API_KEY not configured'
    });
  }
  
  // Test OpenAI if configured
  if (config.openaiApiKey) {
    results.push(await testOpenAI());
  } else {
    results.push({
      api: 'OpenAI',
      status: 'SKIPPED',
      error: 'OPENAI_API_KEY not configured'
    });
  }
  
  // Test AI Consensus Engine (requires at least Perplexity)
  if (config.perplexityApiKey) {
    results.push(await testAIConsensus());
  }

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
    console.error('⚠️  Some tests failed. Please check your API keys and network connection.');
    process.exit(1);
  }

  if (passed === 0) {
    console.error('⚠️  No tests passed. Please configure at least PERPLEXITY_API_KEY.');
    process.exit(1);
  }

  console.log('✅ All configured AI integrations are working correctly!');
  process.exit(0);
}

// Run tests
main().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});

