# AI Integration Tests

Diese Tests prüfen, ob alle KI-Integrationen (Perplexity, Gemini, OpenAI) korrekt funktionieren.

## Verfügbare Tests

### 1. Vollständige Integrationstests (`ai-integration.test.ts`)

Testet alle drei KI-APIs mit vollständigen Responses und Validierung.

```bash
cd relayer
npm run test:ai
```

**Was wird getestet:**
- ✅ Perplexity AI: Vollständige Resolution mit Verdict, Summary, Sources
- ✅ Gemini AI: Via AI Consensus Engine
- ✅ OpenAI GPT: Via AI Consensus Engine  
- ✅ AI Consensus Engine: Multi-Model Consensus Logic

**Voraussetzungen:**
- `PERPLEXITY_API_KEY` muss gesetzt sein (erforderlich)
- `GEMINI_API_KEY` optional (wird übersprungen wenn nicht vorhanden)
- `OPENAI_API_KEY` optional (wird übersprungen wenn nicht vorhanden)

### 2. Schnelle Connectivity Tests (`ai-integration-simple.test.ts`)

Testet nur die API-Verbindungen mit minimalen Requests (schneller, weniger API-Calls).

```bash
cd relayer
npm run test:ai-simple
```

**Was wird getestet:**
- ✅ Perplexity API: Endpoint-Erreichbarkeit
- ✅ Gemini API: Endpoint-Erreichbarkeit
- ✅ OpenAI API: Endpoint-Erreichbarkeit

**Vorteil:** Schnell, weniger API-Calls, gut für schnelle Checks

## Setup

1. Stelle sicher, dass `.env` Datei im `relayer/` Verzeichnis existiert:

```env
PERPLEXITY_API_KEY=your_perplexity_key  # Erforderlich
GEMINI_API_KEY=your_gemini_key          # Optional
OPENAI_API_KEY=your_openai_key          # Optional
```

2. Installiere Dependencies:

```bash
cd relayer
npm install
```

3. Führe Tests aus:

```bash
# Vollständige Tests (empfohlen für Hackathon-Demo)
npm run test:ai

# Schnelle Connectivity Tests
npm run test:ai-simple
```

## Erwartete Ergebnisse

### Alle APIs konfiguriert:
```
✅ Perplexity      PASSED
✅ Gemini          PASSED  
✅ OpenAI          PASSED
✅ AIConsensus     PASSED
```

### Nur Perplexity konfiguriert:
```
✅ Perplexity      PASSED
⏭️  Gemini          SKIPPED (GEMINI_API_KEY not configured)
⏭️  OpenAI          SKIPPED (OPENAI_API_KEY not configured)
✅ AIConsensus     PASSED (works with Perplexity only)
```

## Troubleshooting

**"Invalid API key" Error:**
- Überprüfe, ob der API Key korrekt in `.env` gesetzt ist
- Stelle sicher, dass der Key aktiv ist und Credits vorhanden sind

**"Timeout" Error:**
- Netzwerk-Problem oder API-Down
- Versuche es später erneut

**"No response" Error:**
- API hat ungültige Response zurückgegeben
- Prüfe API-Status auf den jeweiligen Provider-Websites

## Hackathon Compliance

Diese Tests erfüllen die Hackathon-Anforderung:
- ✅ **Req B (Prototype): AI Integration** - Verifiziert dass alle KI-APIs korrekt integriert sind
- ✅ **Tests vorhanden** - Dokumentation und Test-Skripte für Jurys

