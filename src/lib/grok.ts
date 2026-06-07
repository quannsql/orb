/**
 * Helper to query Pollinations.ai using the grok-4.3 reasoning model
 * using the API key defined in .env.local.
 */
const MODELS = ["grok-4.3", "openai-large", "qwen-vision-pro", "gpt-5.5"];

export async function queryGrok(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  jsonMode = false
): Promise<string> {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) {
    throw new Error("POLLINATIONS_API_KEY is not configured in .env.local");
  }

  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      console.log(`[queryGrok] Attempting generation using model: ${model}`);
      const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: jsonMode ? { type: "json_object" } : undefined,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Pollinations API error (${response.status}) for model ${model}: ${errText}`);
      }

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        throw new Error(`Invalid response structure from Pollinations API for model ${model}`);
      }

      console.log(`[queryGrok] Successfully generated content using model: ${model}`);
      return data.choices[0].message.content;
    } catch (error: any) {
      console.warn(`[queryGrok] Failed with model ${model}:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error("All models failed to generate response");
}
