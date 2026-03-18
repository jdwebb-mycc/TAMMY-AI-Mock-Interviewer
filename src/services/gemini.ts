import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { TammyBrain, SessionAnalysis, InterviewLevel, InterviewMode } from "./tammyBrain";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface InterviewFeedback extends SessionAnalysis {
  overallScore: number;
}

export interface DocumentContext {
  roleKeywords: string[];
  skills: string[];
  experience: string[];
  industryTerms: string[];
  responsibilities: string[];
  requiredCompetencies: string[];
  careerDirection: string;
}

export const parseDocuments = async (resume?: string, jd?: string): Promise<DocumentContext> => {
  if (!resume && !jd) {
    return {
      roleKeywords: [],
      skills: [],
      experience: [],
      industryTerms: [],
      responsibilities: [],
      requiredCompetencies: [],
      careerDirection: "General IT Career Path"
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Analyze the following resume and/or job description. 
    Extract key information for a mock interview system.
    
    Resume: ${resume || "Not provided"}
    Job Description: ${jd || "Not provided"}
    
    Return a JSON object with:
    - roleKeywords: array of strings
    - skills: array of strings
    - experience: array of strings (key highlights)
    - industryTerms: array of strings
    - responsibilities: array of strings
    - requiredCompetencies: array of strings
    - careerDirection: string (brief summary)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          roleKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          experience: { type: Type.ARRAY, items: { type: Type.STRING } },
          industryTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
          responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
          requiredCompetencies: { type: Type.ARRAY, items: { type: Type.STRING } },
          careerDirection: { type: Type.STRING },
        },
        required: ["roleKeywords", "skills", "experience", "industryTerms", "responsibilities", "requiredCompetencies", "careerDirection"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse documents", e);
    return {
      roleKeywords: [],
      skills: [],
      experience: [],
      industryTerms: [],
      responsibilities: [],
      requiredCompetencies: [],
      careerDirection: "General IT Career Path"
    };
  }
};

export const getInitialQuestion = async (
  level: InterviewLevel, 
  mode: InterviewMode, 
  step: number,
  docContext?: DocumentContext
): Promise<string> => {
  const competencies = TammyBrain.getTargetCompetencies(level);
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are T.A.M.M.Y. (Training Adaptive Mock-interview & Mentorship sYstem). 
    Level: ${level} (IT Position)
    Mode: ${mode}
    Step: ${step === 1 ? 'Phone Interview' : 'AI Video Interview'}
    Target Competencies: ${competencies.join(', ')}
    
    ${docContext ? `
    Context from Resume/JD:
    - Role Keywords: ${docContext.roleKeywords.join(', ')}
    - Skills: ${docContext.skills.join(', ')}
    - Experience: ${docContext.experience.join(', ')}
    - Industry Terms: ${docContext.industryTerms.join(', ')}
    - Responsibilities: ${docContext.responsibilities.join(', ')}
    - Required Competencies: ${docContext.requiredCompetencies.join(', ')}
    - Career Direction: ${docContext.careerDirection}
    ` : ''}
    
    ${mode === 'career_alignment' ? `
    Focus on these specific narrative questions:
    - Tell me about yourself
    - Walk me through your resume
    - Why this role
    - Why this field
    - What are your goals
    - Why should we hire you
    - What makes you a strong candidate
    - What are your strengths
    - Why this company
    ` : ''}
    ${mode === 'behavioral' ? 'Focus on: STAR method, conflict resolution, teamwork, and past experiences.' : ''}
    ${mode === 'challenge' ? 'Focus on: High-Stakes technical knowledge challenges and domain expertise.' : ''}

    Generate the first interview question. 
    TAMMY checks: Does this make sense? Does this sound real? Is the story coherent? Is the direction clear? Is the candidate focused? Would a recruiter believe this?
    
    Design Goal: Coach first, judge second. 
    Return only the question text.`,
  });
  return response.text || "Tell me about yourself and your background.";
};

export const getFollowUpQuestion = async (
  level: InterviewLevel,
  mode: InterviewMode,
  previousQuestions: string[],
  userAnswer: string,
  docContext?: DocumentContext
): Promise<string> => {
  const competencies = TammyBrain.getTargetCompetencies(level);
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are T.A.M.M.Y. Core Brain v1.
    Level: ${level} (IT Position)
    Mode: ${mode}
    Target Competencies: ${competencies.join(', ')}
    Previous Questions: ${previousQuestions.join(' | ')}
    Candidate's Last Answer: "${userAnswer}"
    
    ${docContext ? `
    Context from Resume/JD:
    - Role Keywords: ${docContext.roleKeywords.join(', ')}
    - Skills: ${docContext.skills.join(', ')}
    - Experience: ${docContext.experience.join(', ')}
    - Industry Terms: ${docContext.industryTerms.join(', ')}
    - Responsibilities: ${docContext.responsibilities.join(', ')}
    - Required Competencies: ${docContext.requiredCompetencies.join(', ')}
    - Career Direction: ${docContext.careerDirection}
    ` : ''}
    
    Perception: Analyze the answer for depth, coherence, and realism.
    Interpretation: Determine if they met the target competencies and if a recruiter would believe the story.
    
    Adaptive Questioning Logic (Apply if applicable):
    - if career_direction_clarity < .5 → ask: "What do you want to do next?"
    - if role_alignment < .5 → ask: "Why this role specifically?"
    - if motivation_strength < .5 → ask: "Why this company?"
    - if resume_coherence < .5 → ask: "Walk me through your resume."
    - if confidence_language < .5 → ask: "What makes you a strong candidate?"
    
    General Rules:
    - if clarity low → ask for shorter version
    - if alignment low → ask why this role
    - if motivation low → ask why this company
    - if coherence low → ask about transition
    - if confidence low → ask for example
    
    Response: Generate a follow-up question that pushes for more "Signal" (clarity of focus) and less "Distortion".
    Force specificity and increase difficulty if the candidate is rambling or using passive language.
    
    Return only the question text.`,
  });
  return response.text || "Can you elaborate more on that?";
};

export const analyzeInterview = async (
  level: InterviewLevel,
  mode: InterviewMode,
  history: { question: string; answer: string }[]
): Promise<InterviewFeedback> => {
  const competencies = TammyBrain.getTargetCompetencies(level);
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are T.A.M.M.Y. Core Brain v1 - Evaluation Module.
    Analyze this mock interview for an IT ${level} position in ${mode} mode.
    
    Target Competencies: ${competencies.join(', ')}
    
    Interview History:
    ${history.map((h, i) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.answer}`).join('\n\n')}
    
    TAMMY checks:
    - Does this make sense?
    - Does this sound real?
    - Is the story coherent?
    - Is the direction clear?
    - Is the candidate focused?
    - Would a recruiter believe this?

    Scoring Model for Hire Score:
    - 0.25 clarity
    - 0.20 alignment
    - 0.15 specificity
    - 0.15 confidence
    - 0.15 credibility
    - 0.10 motivation

    Provide a detailed feedback report in JSON format conforming to the SessionAnalysis structure.
    Include:
    - overallScore (0-100)
    - question (text, stage)
    - perception (rawAnswer, cleanedAnswer, wordCount, sentenceCount, detectedKeywords, metrics, confidenceSignal)
    - interpretation (questionType, expectedAnswerShape, targetCompetencies, riskNotes)
    - discernment (clarityScore, specificityScore, ownershipScore, structureScore, credibilityScore, confidenceScore, answerRelevanceScore, careerDirectionClarity, goalSpecificity, resumeCoherence, roleAlignment, companyAlignment, confidenceLanguage, ownershipLanguage, vaguenessScore, ramblingScore, motivationStrength, consistencyScore, starComponents, flags)
    - evaluation (readinessBand, hireSignalScore, passPhoneScreenProb, passInterviewProb, hireSignalProb, roleFitProb, industryLanguageMatch, roleKeywordsMatch, motivationSpecificity, companyResearchSignal, valuesAlignment, strengths, weaknesses, recruiterRiskFlags, shouldProbeFurther)
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
              careerDirectionClarity: { type: Type.NUMBER },
              goalSpecificity: { type: Type.NUMBER },
              resumeCoherence: { type: Type.NUMBER },
              roleAlignment: { type: Type.NUMBER },
              companyAlignment: { type: Type.NUMBER },
              confidenceLanguage: { type: Type.NUMBER },
              ownershipLanguage: { type: Type.NUMBER },
              vaguenessScore: { type: Type.NUMBER },
              ramblingScore: { type: Type.NUMBER },
              motivationStrength: { type: Type.NUMBER },
              consistencyScore: { type: Type.NUMBER },
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
            required: [
              "clarityScore", "specificityScore", "ownershipScore", "structureScore", "credibilityScore", "confidenceScore", "answerRelevanceScore",
              "careerDirectionClarity", "goalSpecificity", "resumeCoherence", "roleAlignment", "companyAlignment", "confidenceLanguage", "ownershipLanguage",
              "vaguenessScore", "ramblingScore", "motivationStrength", "consistencyScore", "starComponents", "flags"
            ],
          },
          evaluation: {
            type: Type.OBJECT,
            properties: {
              readinessBand: { type: Type.STRING },
              hireSignalScore: { type: Type.NUMBER },
              passPhoneScreenProb: { type: Type.NUMBER },
              passInterviewProb: { type: Type.NUMBER },
              hireSignalProb: { type: Type.NUMBER },
              roleFitProb: { type: Type.NUMBER },
              industryLanguageMatch: { type: Type.NUMBER },
              roleKeywordsMatch: { type: Type.NUMBER },
              motivationSpecificity: { type: Type.NUMBER },
              companyResearchSignal: { type: Type.NUMBER },
              valuesAlignment: { type: Type.NUMBER },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              recruiterRiskFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
              shouldProbeFurther: { type: Type.BOOLEAN },
            },
            required: [
              "readinessBand", "hireSignalScore", "passPhoneScreenProb", "passInterviewProb", "hireSignalProb", "roleFitProb",
              "industryLanguageMatch", "roleKeywordsMatch", "motivationSpecificity", "companyResearchSignal", "valuesAlignment",
              "strengths", "weaknesses", "recruiterRiskFlags", "shouldProbeFurther"
            ],
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
