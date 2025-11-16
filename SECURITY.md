# Security Policy

## 🔒 Sensitive Data Protection

### NEVER Commit These Files

⚠️ **CRITICAL**: The following files contain private keys and secrets:

```
❌ .env
❌ .env.local
❌ smart-contract/.env
❌ relayer/.env
❌ dapp/.env.local
```

### If You Accidentally Committed Secrets

1. **Immediately rotate all keys:**
   - Generate new wallet private keys
   - Create new API keys (Perplexity, etc.)
   - Update all .env files

2. **Remove from Git history:**
   ```bash
   # Use git-filter-repo or BFG Repo-Cleaner
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push (ONLY if no one else has cloned):**
   ```bash
   git push --force --all
   ```

4. **If others have cloned:** The keys are compromised. Rotate immediately.

---

## 🔑 Key Management Best Practices

### Development (Testnet)

- **Never use mainnet keys for testnet**
- Use dedicated testnet wallets
- Keep testnet private keys separate
- Still treat testnet keys as sensitive (for audit trail)

### Production (When Deploying to Mainnet)

- Use hardware wallets (Ledger, Trezor)
- Multi-sig for contract ownership
- Never store mainnet keys in .env files
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)

---

## 🛡️ Current Project Keys

### Testnet Keys (DO NOT COMMIT)

1. **Deployer Wallet:**
   - Private Key: In `smart-contract/.env`
   - Used for: Contract deployment, transactions
   - Status: Testnet only, but still secret

2. **Relayer Wallet:**
   - Private Key: In `relayer/.env`
   - Used for: Oracle fulfillment
   - Status: Testnet only, but still secret

3. **Perplexity API Key:**
   - Key: In `relayer/.env`
   - Used for: AI API calls
   - Status: Has usage limits, keep secret

---

## ✅ What IS Safe to Commit

- ✅ `.env.example` files (with placeholder values)
- ✅ Contract addresses (public on blockchain anyway)
- ✅ RPC URLs (public endpoints)
- ✅ Network IDs, Chain IDs
- ✅ Deployed contract ABIs
- ✅ Documentation

---

## 🔍 Auditing

### Before Every Commit

```bash
# Check for accidentally staged secrets
git diff --cached | grep -E "(PRIVATE_KEY|API_KEY|SECRET)"

# List staged files
git diff --cached --name-only

# Ensure .env files are NOT staged
git status | grep ".env"
```

### GitHub Secret Scanning

This repo should enable:
- Secret scanning
- Push protection
- Dependabot alerts

---

## 📋 Checklist Before Pushing

- [ ] Run `git status` - no .env files listed
- [ ] Check `git diff --cached` - no private keys visible
- [ ] All secrets in .gitignore
- [ ] Only .env.example committed
- [ ] No hardcoded keys in code
- [ ] README doesn't contain secrets

---

## 🚨 Incident Response

If you discover a committed secret:

1. **STOP** - Don't push if you haven't yet
2. **Assess** - Is it already pushed to GitHub?
3. **Rotate** - Generate new keys immediately
4. **Clean** - Remove from Git history
5. **Verify** - Check GitHub doesn't have the secret
6. **Document** - Note what happened and when

---

## 📞 Contact

For security concerns, create a private issue or contact the team directly.

**DO NOT** post private keys or secrets in GitHub issues, even private ones.

