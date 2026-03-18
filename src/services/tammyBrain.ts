/**
 * T.A.M.M.Y. — Training Adaptive Mock-interview & Mentorship sYstem
 * Core Brain v1 (TypeScript Implementation)
 */

export enum Competency {
  TECHNICAL_DEPTH = "Technical Depth",
  PROBLEM_SOLVING = "Problem Solving",
  COMMUNICATION = "Communication",
  LEADERSHIP = "Leadership",
  ADAPTABILITY = "Adaptability",
  CULTURAL_ALIGNMENT = "Cultural Alignment",
  EMOTIONAL_INTELLIGENCE = "Emotional Intelligence"
}

export enum QuestionType {
  INTRODUCTORY = "Introductory",
  TECHNICAL = "Technical",
  BEHAVIORAL = "Behavioral",
  SITUATIONAL = "Situational",
  STRESS_TEST = "Stress Test"
}

export enum InterviewStage {
  PHONE_SCREEN = "Phone Screen",
  OPENING = "Opening",
  CORE = "Core",
  DEEP_DIVE = "Deep Dive",
  CLOSING = "Closing"
}

export interface SpeechMetrics {
  durationSeconds: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  averageSentenceLength?: number;
}

export interface PerceptionResult {
  rawAnswer: string;
  cleanedAnswer: string;
  wordCount: number;
  sentenceCount: number;
  detectedKeywords: string[];
  metrics: SpeechMetrics;
  confidenceSignal: number;
}

export interface InterpretationResult {
  questionType: QuestionType;
  expectedAnswerShape: string;
  targetCompetencies: string[];
  riskNotes: string[];
}

export interface DiscernmentResult {
  clarityScore: number;
  specificityScore: number;
  ownershipScore: number;
  structureScore: number;
  credibilityScore: number;
  confidenceScore: number;
  answerRelevanceScore: number;
  starComponents: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
  };
  flags: string[];
}

export interface EvaluationResult {
  readinessBand: "Entry" | "Junior" | "Mid" | "Senior" | "Executive";
  hireSignalScore: number;
  strengths: string[];
  weaknesses: string[];
  recruiterRiskFlags: string[];
  shouldProbeFurther: boolean;
}

export interface TammyResponse {
  summary: string;
  recruiterFeedback: string;
  coachingFeedback: string;
  followUpQuestion?: string;
  retryPrompt?: string;
}

export interface InterviewQuestion {
  text: string;
  stage: InterviewStage;
}

export interface SessionAnalysis {
  question: InterviewQuestion;
  perception: PerceptionResult;
  interpretation: InterpretationResult;
  discernment: DiscernmentResult;
  evaluation: EvaluationResult;
  response: TammyResponse;
}

export interface CandidateContext {
  candidateId: string;
  roleTitle: string;
  industry: string;
  seniority: string;
  targetCompetencies: string[];
}

export class TammyMemoryStore {
  private history: Map<string, SessionAnalysis[]> = new Map();

  record(candidateId: string, analysis: SessionAnalysis) {
    const userHistory = this.history.get(candidateId) || [];
    userHistory.push(analysis);
    this.history.set(candidateId, userHistory);
  }

  getHistory(candidateId: string): SessionAnalysis[] {
    return this.history.get(candidateId) || [];
  }

  getTopPatterns(candidateId: string): { pattern: string; count: number }[] {
    const history = this.getHistory(candidateId);
    const patterns = history.flatMap(h => h.discernment.flags);
    const counts = patterns.reduce((acc, p) => {
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);
  }
}

/**
 * The T.A.M.M.Y. Cognitive Engine
 */
export class TammyBrain {
  private memory = new TammyMemoryStore();

  recordAnalysis(candidateId: string, analysis: SessionAnalysis) {
    this.memory.record(candidateId, analysis);
  }

  getPatternReport(candidateId: string) {
    const history = this.memory.getHistory(candidateId);
    const topPatterns = this.memory.getTopPatterns(candidateId);
    const avgScore = history.length > 0
      ? history.reduce((acc, h) => acc + h.evaluation.hireSignalScore, 0) / history.length
      : null;

    return {
      candidateId,
      averageHireSignalScore: avgScore,
      topPatterns,
      historyCount: history.length,
      history,
    };
  }

  static getTargetCompetencies(level: string): Competency[] {
    switch (level) {
      case 'entry':
        return [Competency.TECHNICAL_DEPTH, Competency.ADAPTABILITY];
      case 'junior':
        return [Competency.TECHNICAL_DEPTH, Competency.PROBLEM_SOLVING, Competency.COMMUNICATION];
      case 'mid':
        return [Competency.TECHNICAL_DEPTH, Competency.PROBLEM_SOLVING, Competency.COMMUNICATION, Competency.LEADERSHIP];
      case 'executive':
        return [Competency.LEADERSHIP, Competency.EMOTIONAL_INTELLIGENCE, Competency.CULTURAL_ALIGNMENT];
      case 'behavioral':
        return [Competency.COMMUNICATION, Competency.EMOTIONAL_INTELLIGENCE, Competency.ADAPTABILITY];
      case 'leadership':
        return [Competency.LEADERSHIP, Competency.PROBLEM_SOLVING, Competency.EMOTIONAL_INTELLIGENCE];
      default:
        return [Competency.COMMUNICATION];
    }
  }
}
