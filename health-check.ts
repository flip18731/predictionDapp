/**
 * Health Check Script
 * Prüft ob alle Services korrekt laufen
 */

import { ethers } from 'ethers';
import * as http from 'http';

const RELAYER_CONTRACT = '0xa9BCD7385865fA3855b6ED9D167f337A1FEf1B65';
const FRONTEND_URL = 'http://localhost:3000';
const BNB_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

interface HealthCheck {
  service: string;
  status: 'OK' | 'ERROR' | 'WARNING';
  message: string;
}

const checks: HealthCheck[] = [];

async function checkRPC(): Promise<void> {
  try {
    const provider = new ethers.JsonRpcProvider(BNB_RPC);
    const block = await provider.getBlockNumber();
    checks.push({
      service: 'BNB Chain RPC',
      status: 'OK',
      message: `Connected - Block: ${block}`
    });
  } catch (error: any) {
    checks.push({
      service: 'BNB Chain RPC',
      status: 'ERROR',
      message: `Failed: ${error.message}`
    });
  }
}

async function checkContract(): Promise<void> {
  try {
    const provider = new ethers.JsonRpcProvider(BNB_RPC);
    const code = await provider.getCode(RELAYER_CONTRACT);
    if (code === '0x') {
      checks.push({
        service: 'Smart Contract',
        status: 'ERROR',
        message: 'Contract not found at address'
      });
    } else {
      checks.push({
        service: 'Smart Contract',
        status: 'OK',
        message: `Contract found at ${RELAYER_CONTRACT}`
      });
    }
  } catch (error: any) {
    checks.push({
      service: 'Smart Contract',
      status: 'ERROR',
      message: `Failed: ${error.message}`
    });
  }
}

function checkFrontend(): Promise<void> {
  return new Promise((resolve) => {
    const req = http.get(FRONTEND_URL, { timeout: 5000 }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        checks.push({
          service: 'Frontend (dapp)',
          status: 'OK',
          message: `Running on port 3000 (Status: ${res.statusCode})`
        });
      } else {
        checks.push({
          service: 'Frontend (dapp)',
          status: 'WARNING',
          message: `Unexpected status: ${res.statusCode}`
        });
      }
      resolve();
    });

    req.on('error', (error: any) => {
      if (error.code === 'ECONNREFUSED') {
        checks.push({
          service: 'Frontend (dapp)',
          status: 'ERROR',
          message: 'Not running - Start with: cd dapp && npm run dev'
        });
      } else {
        checks.push({
          service: 'Frontend (dapp)',
          status: 'ERROR',
          message: `Failed: ${error.message}`
        });
      }
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      checks.push({
        service: 'Frontend (dapp)',
        status: 'ERROR',
        message: 'Connection timeout'
      });
      resolve();
    });
  });
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  HEALTH CHECK - Clarity Protocol');
  console.log('═══════════════════════════════════════');
  console.log('');

  await Promise.all([
    checkRPC(),
    checkContract(),
    checkFrontend()
  ]);

  let okCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (const check of checks) {
    const icon = check.status === 'OK' ? '✅' : check.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} ${check.service.padEnd(25)} ${check.message}`);
    
    if (check.status === 'OK') okCount++;
    else if (check.status === 'WARNING') warningCount++;
    else errorCount++;
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`✅ OK: ${okCount} | ⚠️ Warnings: ${warningCount} | ❌ Errors: ${errorCount}`);
  console.log('═══════════════════════════════════════');
  console.log('');

  if (errorCount > 0) {
    console.log('❌ Some services are not running correctly!');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('⚠️  Some warnings detected, but services are running');
    process.exit(0);
  } else {
    console.log('✅ All services are running correctly!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Health check failed:', error);
  process.exit(1);
});

