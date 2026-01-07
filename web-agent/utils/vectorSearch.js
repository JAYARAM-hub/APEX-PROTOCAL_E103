function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB || 1);
}

function simpleTokenize(text) {
  return text.toLowerCase().split(/\s+/).filter(t => t.length > 2);
}

function matchIntent(query, options) {
  const queryTokens = simpleTokenize(query);
  const scores = options.map(opt => {
    const optTokens = simpleTokenize(opt.text);
    const matches = queryTokens.filter(t => optTokens.includes(t)).length;
    return { ...opt, score: matches / Math.max(queryTokens.length, 1) };
  });

  return scores.sort((a, b) => b.score - a.score);
}

module.exports = { cosineSimilarity, simpleTokenize, matchIntent };
