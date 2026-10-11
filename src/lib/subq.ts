export const MODEL = "subq-snap-preview";

export type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
};

export type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
};

export type ScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export type ImageInput = {
  mediaType: "image/png" | "image/jpeg" | "image/webp";
  base64: string;
};

export type DecideRequest = {
  state: unknown;
  questions: Record<string, Question>;
  images?: ImageInput[];
};

export type NoulAnswer = { type: "noul"; noul: number };

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};

export type ScoreAnswer = {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
};

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export type DecideResponse = {
  model: string;
  answers: Record<string, Answer>;
  usage: { input_tokens: number; output_tokens: number };
};

export function certainty(answer: Answer) {
  return answer.type === "noul" ? Math.max(answer.noul, 1 - answer.noul) : answer.confidence;
}

export function errorMessage(status: number, detail?: string) {
  switch (status) {
    case 401:
      return "SubQ rejected the API key. Check the API value in .env.";
    case 402:
      return "Out of SubQ credits. Top up at console.subq.ai, then try again.";
    case 403:
      return "This API key can't use the requested model.";
    case 413:
    case 422:
      return detail ? `SubQ rejected the request: ${detail}` : "SubQ rejected the request. Check the fields and try again.";
    case 429:
      return "Rate limited by SubQ. Wait a moment, then try again.";
    case 503:
      return "SubQ is temporarily unavailable. Try again in a minute.";
    default:
      return detail ?? "Unable to reach SubQ. Check your connection and try again.";
  }
}
