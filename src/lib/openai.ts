import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

export const openai = new OpenAI({
  apiKey: apiKey,
});

export const callOpenAI = async (
  prompt: string,
  retries: number = 1,
  retryDelay: number = 500,
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
): Promise<string> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const temperature = options?.temperature ?? 0.7;
      const max_tokens = options?.max_tokens ?? 2000;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature,
        max_tokens,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      return content;
    } catch (error) {
      lastError = error as Error;

      if (attempt < retries - 1) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Failed to call OpenAI API");
};
