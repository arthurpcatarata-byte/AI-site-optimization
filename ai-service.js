const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

function init(apiKey) {
  if (!apiKey) return false;
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('  ✅ Gemini AI connected — real-time analysis enabled');
  return true;
}

function isAvailable() {
  return model !== null;
}

async function analyzeSite(site) {
  if (!model) return null;

  const prompt = `You are an expert real estate and urban development AI analyst. Analyze the following development site and provide feasibility scores and recommendations.

SITE DATA:
- Project Name: ${site.name}
- Location: ${site.location}${site.latitude ? `\n- GPS: ${site.latitude}, ${site.longitude}` : ''}
- Size: ${site.size_sqft} square feet
- Zoning: ${site.zoning}
- Estimated Cost: ₱${Number(site.estimated_cost).toLocaleString()} (Philippine Pesos)
- Cost per sqft: ₱${(site.estimated_cost / site.size_sqft).toFixed(2)}

Respond ONLY with valid JSON (no markdown, no code fences) in this exact format:
{
  "environmental_score": <number 0.0-1.0>,
  "market_score": <number 0.0-1.0>,
  "infrastructure_score": <number 0.0-1.0>,
  "regulatory_score": <number 0.0-1.0>,
  "recommendations": [
    {"icon": "🌿", "title": "<short title>", "text": "<1-2 sentence recommendation>"},
    {"icon": "📊", "title": "<short title>", "text": "<1-2 sentence recommendation>"},
    {"icon": "🏗️", "title": "<short title>", "text": "<1-2 sentence recommendation>"},
    {"icon": "📋", "title": "<short title>", "text": "<1-2 sentence recommendation>"}
  ],
  "summary": "<2-3 sentence overall analysis summary>"
}

Score guidelines:
- environmental_score: Consider flood risk, pollution, green space, sustainability potential for that specific Philippine location
- market_score: Consider local real estate demand, demographic trends, zoning fit for the Philippine market
- infrastructure_score: Consider utility access, roads, public transit, nearby amenities in that area
- regulatory_score: Consider Philippine zoning laws, permit complexity, HLURB/DHSUD regulations for that zoning type

Be realistic and specific to the Philippine context. Use actual knowledge about the location if available.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned);

    // Validate scores are in range
    const clamp = (v) => Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 100) / 100;

    const scores = {
      environmental_score: clamp(parsed.environmental_score),
      market_score: clamp(parsed.market_score),
      infrastructure_score: clamp(parsed.infrastructure_score),
      regulatory_score: clamp(parsed.regulatory_score)
    };

    scores.feasibility_score = Math.round(
      (scores.environmental_score * 0.25 +
       scores.market_score * 0.30 +
       scores.infrastructure_score * 0.25 +
       scores.regulatory_score * 0.20) * 100
    ) / 100;

    // Validate recommendations
    let recommendations = [];
    if (Array.isArray(parsed.recommendations)) {
      recommendations = parsed.recommendations.slice(0, 6).map(r => ({
        icon: String(r.icon || '📌').slice(0, 4),
        title: String(r.title || 'Recommendation').slice(0, 100),
        text: String(r.text || '').slice(0, 500)
      }));
    }

    const summary = typeof parsed.summary === 'string' ? parsed.summary.slice(0, 1000) : '';

    return { ...scores, recommendations, summary, ai_powered: true };
  } catch (err) {
    console.error('  ⚠️  Gemini AI error:', err.message);
    return null;
  }
}

module.exports = { init, isAvailable, analyzeSite };
