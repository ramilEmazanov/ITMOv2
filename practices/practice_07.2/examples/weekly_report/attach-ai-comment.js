// n8n Code: Run Once for All Items. После Basic LLM Chain без Output Parser.
const r = $('Restore Report').first().json;
const answer = $input.first().json;
const comment = answer.text ?? answer.output;
if (typeof comment !== 'string' || !comment.trim()) throw new Error('AI annotation is empty');
return [{ json: { ...r, ai_comment: comment.trim() } }];
