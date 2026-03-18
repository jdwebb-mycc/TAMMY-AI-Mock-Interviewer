import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { TammyBrain, SessionAnalysis } from "./tammyBrain";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export type InterviewLevel = 'entry' | 'junior' | 'mid' | 'executive' | 'behavioral' | 'leadership';

export interface InterviewFeedback extends SessionAnalysis {
  overallScore: number;
}

export const getInitialQuestion = async (level: InterviewLevel): Promise<string> => {
  const competencies = TammyBrain.getTargetCompetencies(level);
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are T.A.M.M.Y. (Training Adaptive Mock-interview & Mentorship sYstem). 
    Level: ${level}
    Target Competencies: ${competencies.join(', ')}
    
    Generate the first interview question. 
    Design Goal: Coach first, judge second. 
    Return only the question text.`,
  });
  return response.text || "Tell me about yourself and your background.";
};

export const getFollowUpQuestion = async (
  level: InterviewLevel,
  previousQuestions: string[],
  userAnswer: string
): Promise<string> => {
  const competencies = TammyBrain.getTargetCompetencies(level);
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are T.A.M.M.Y. Core Brain v1.
    Level: ${level}
    Target Competencies: ${competencies.join(', ')}
    Previous Questions: ${previousQuestions.join(' | ')}
    Candidate's Last Answer: "${userAnswer}"
    
    Perception: Analyze the answer for depth and clarity.
    Interpretation: Determine if they met the target competencies.
    Response: Generate a follow-up question that pushes for more "Signal" and less "Distortion".
    
    Return only the question text.`,
  });
  return response.text || "Can you elaborate more on that?";
};

export const analyzeInterview = async (
  level: InterviewLevel,
  history: { question: string; answer: string }[]
): Promise<InterviewFeedback> => {
  const competencies = TammyBrain.getTargetCompetencies(level);
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are T.A.M.M.Y. Core Brain v1 - Evaluation Module.
    Analyze this mock interview for a ${level} position.
    
    Target Competencies: ${competencies.join(', ')}
    
    Interview History:
    ${history.map((h, i) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.answer}`).join('\n\n')}
    
    Provide a detailed feedback report in JSON format conforming to the SessionAnalysis structure.
    Include:
    - overallScore (0-100)
    - question (text, stage)
    - perception (rawAnswer, cleanedAnswer, wordCount, sentenceCount, detectedKeywords, metrics, confidenceSignal)
    - interpretation (questionType, expectedAnswerShape, targetCompetencies, riskNotes)
    - discernment (clarityScore, specificityScore, ownershipScore, structureScore, credibilityScore, confidenceScore, answerRelevanceScore, starComponents, flags)
    - evaluation (readinessBand, hireSignalScore, strengths, weaknesses, recruiterRiskFlags, shouldProbeFurther)
    - response (summary, recruiterFeedback, coachingFeedback)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          question: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              stage: { type: Type.STRING },
            },
            required: ["text", "stage"],
          },
          perception: {
            type: Type.OBJECT,
            properties: {
              rawAnswer: { type: Type.STRING },
              cleanedAnswer: { type: Type.STRING },
              wordCount: { type: Type.NUMBER },
              sentenceCount: { type: Type.NUMBER },
              detectedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              metrics: {
                type: Type.OBJECT,
                properties: {
                  durationSeconds: { type: Type.NUMBER },
                  wordsPerMinute: { type: Type.NUMBER },
                  fillerWordCount: { type: Type.NUMBER },
                },
                required: ["durationSeconds", "wordsPerMinute", "fillerWordCount"],
              },
              confidenceSignal: { type: Type.NUMBER },
            },
            required: ["rawAnswer", "cleanedAnswer", "wordCount", "sentenceCount", "detectedKeywords", "metrics", "confidenceSignal"],
          },
          interpretation: {
            type: Type.OBJECT,
            properties: {
              questionType: { type: Type.STRING },
              expectedAnswerShape: { type: Type.STRING },
              targetCompetencies: { type: Type.ARRAY, items: { type: Type.STRING } },
              riskNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["questionType", "expectedAnswerShape", "targetCompetencies", "riskNotes"],
          },
          discernment: {
            type: Type.OBJECT,
            properties: {
              clarityScore: { type: Type.NUMBER },
              specificityScore: { type: Type.NUMBER },
              ownershipScore: { type: Type.NUMBER },
              structureScore: { type: Type.NUMBER },
              credibilityScore: { type: Type.NUMBER },
              confidenceScore: { type: Type.NUMBER },
              answerRelevanceScore: { type: Type.NUMBER },
              starComponents: {
                type: Type.OBJECT,
                properties: {
                  situation: { type: Type.BOOLEAN },
                  task: { type: Type.BOOLEAN },
                  action: { type: Type.BOOLEAN },
                  result: { type: Type.BOOLEAN },
                },
                required: ["situation", "task", "action", "result"],
              },
              flags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["clarityScore", "specificityScore", "ownershipScore", "structureScore", "credibilityScore", "confidenceScore", "answerRelevanceScore", "starComponents", "flags"],
          },
          evaluation: {
            type: Type.OBJECT,
            properties: {
              readinessBand: { type: Type.STRING },
              hireSignalScore: { type: Type.NUMBER },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              recruiterRiskFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
              shouldProbeFurther: { type: Type.BOOLEAN },
            },
            required: ["readinessBand", "hireSignalScore", "strengths", "weaknesses", "recruiterRiskFlags", "shouldProbeFurther"],
          },
          response: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              recruiterFeedback: { type: Type.STRING },
              coachingFeedback: { type: Type.STRING },
              followUpQuestion: { type: Type.STRING },
              retryPrompt: { type: Type.STRING },
            },
            required: ["summary", "recruiterFeedback", "coachingFeedback"],
          },
        },
        required: ["overallScore", "question", "perception", "interpretation", "discernment", "evaluation", "response"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse feedback", e);
    throw new Error("Failed to analyze interview results.");
  }
};
