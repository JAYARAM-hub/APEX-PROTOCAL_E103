function generatePrompt(userQuery, pages) {
  const pageInfo = pages.map(p => `
URL: ${p.url}
Title: ${p.title}
Links: ${p.links.map(l => l.text).join(', ').slice(0, 200)}
Headings: ${p.headings.map(h => h.text).join(', ').slice(0, 200)}
Buttons: ${p.buttons.map(b => b.text).join(', ').slice(0, 150)}
`).join('\n---\n');

  return `You are a helpful web navigation assistant. 

User Request: "${userQuery}"

Website Structure:
${pageInfo}

Task: Based on the website structure above, provide clear step-by-step instructions to help the user accomplish their request. 

Format your response as numbered steps. For each step, mention:
1. What to click or do
2. Which page or section it's on (if applicable)
3. Why this step is necessary

Be concise and practical. If you cannot find relevant information, say so.

Response:`;
}

module.exports = { generatePrompt };
