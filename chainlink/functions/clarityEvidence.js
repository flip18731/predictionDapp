// Chainlink Functions JavaScript source for Clarity Protocol
// Fetches evidence-backed verdicts from a news-aware AI API (Perplexity or Gemini)

const apiKey = Secrets.perplexityApiKey || Secrets.geminiApiKey;
if (!apiKey) {
  throw Error("Missing AI API key in Chainlink Functions secrets bucket");
}

const question = Args[0];
if (!question || question.length === 0) {
  throw Error("Question argument is required");
}

const prompt = `You are Clarity Protocol, an AI evidence agent for prediction market resolution. 
Question: ${question}
Instructions:
1. Search trustworthy sources (news, official statements, social media posts with high credibility).
2. Produce a structured JSON object: { "verdict": "Supported/Refuted/Unclear", "summary": string, "sources": [{"title": string, "url": string, "quote": string}] }.
3. Provide 1-3 independent sources with short quotes proving the verdict.
4. Keep summary under 280 characters. Make verdict "Unclear" if evidence is conflicting.
Return ONLY valid JSON.`;

const body = JSON.stringify({
  model: "sonar-medium-online", // or Gemini equivalent
  messages: [
    { role: "system", content: "You surface factual, current data with citations." },
    { role: "user", content: prompt }
  ],
  temperature: 0.2
});

const response = await Functions.makeHttpRequest({
  url: "https://api.perplexity.ai/chat/completions",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  },
  data: body,
  timeout: 30_000
});

if (response.error) {
  throw Error(`Perplexity API error: ${response.error}`);
}

const choice = response.data?.choices?.[0]?.message?.content;
if (!choice) {
  throw Error("No content in API response");
}

let parsed;
try {
  parsed = JSON.parse(choice);
} catch (err) {
  throw Error(`Failed to parse AI JSON: ${err}`);
}

if (!parsed.verdict || !parsed.summary || !Array.isArray(parsed.sources)) {
  throw Error("AI JSON missing required fields");
}

// map to simpler arrays to reduce gas footprint
const compactSources = parsed.sources.slice(0, 3).map((source) => {
  return `${source.title || ""}|${source.url || ""}|${source.quote || ""}`;
});

return Functions.encodeAbi(
  ["string", "string", "string[]"],
  [parsed.verdict, parsed.summary, compactSources]
);
