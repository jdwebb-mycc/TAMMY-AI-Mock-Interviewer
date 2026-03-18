import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Send, 
  ChevronRight, 
  Award, 
  Target, 
  Lightbulb, 
  RefreshCw,
  User,
  Briefcase,
  Zap,
  ShieldCheck,
  BrainCircuit,
  Loader2
} from 'lucide-react';
import { cn } from './lib/utils';
import { 
  getInitialQuestion, 
  getFollowUpQuestion, 
  analyzeInterview, 
  InterviewLevel, 
  InterviewFeedback 
} from './services/gemini';
import { TammyBrain } from './services/tammyBrain';

// Initialize Brain
const brain = new TammyBrain();

// --- Components ---

const LevelCard = ({ 
  level, 
  title, 
  description, 
  icon: Icon, 
  selected, 
  onClick 
}: { 
  level: InterviewLevel; 
  title: string; 
  description: string; 
  icon: any; 
  selected: boolean; 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "relative flex flex-col items-start p-6 rounded-2xl border-2 transition-all duration-300 text-left group",
      selected 
        ? "border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-100" 
        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md"
    )}
  >
    <div className={cn(
      "p-3 rounded-xl mb-4 transition-colors",
      selected ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200"
    )}>
      <Icon size={24} />
    </div>
    <h3 className="text-lg font-semibold text-zinc-900 mb-1">{title}</h3>
    <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
    {selected && (
      <motion.div 
        layoutId="selected-indicator"
        className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500"
      />
    )}
  </button>
);

const CameraPreview = ({ isActive }: { isActive: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isActive) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Camera error:", err));
    } else {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
  }, [isActive]);

  return (
    <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
          <VideoOff className="text-zinc-600" size={48} />
        </div>
      )}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
        <div className={cn("w-2 h-2 rounded-full animate-pulse", isActive ? "bg-emerald-500" : "bg-zinc-500")} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/80">
          {isActive ? "Live Feed" : "Camera Off"}
        </span>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [step, setStep] = useState<'setup' | 'interview' | 'feedback'>('setup');
  const [level, setLevel] = useState<InterviewLevel>('junior');
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  const MAX_QUESTIONS = 5;

  const startInterview = async () => {
    setIsLoading(true);
    try {
      const q = await getInitialQuestion(level);
      setCurrentQuestion(q);
      setStep('interview');
      setQuestionCount(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!userAnswer.trim()) return;
    
    setIsLoading(true);
    const newHistory = [...history, { question: currentQuestion, answer: userAnswer }];
    setHistory(newHistory);
    setUserAnswer('');

    if (questionCount >= MAX_QUESTIONS) {
      const result = await analyzeInterview(level, newHistory);
      brain.recordAnalysis('user_001', result);
      setFeedback(result);
      setStep('feedback');
    } else {
      const nextQ = await getFollowUpQuestion(level, newHistory.map(h => h.question), userAnswer);
      setCurrentQuestion(nextQ);
      setQuestionCount(prev => prev + 1);
    }
    setIsLoading(false);
  };

  const reset = () => {
    setStep('setup');
    setHistory([]);
    setFeedback(null);
    setQuestionCount(0);
    setCurrentQuestion('');
    setUserAnswer('');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">T.A.M.M.Y.</h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">AI Mock Mentor</p>
            </div>
          </div>
          {step !== 'setup' && (
            <button 
              onClick={reset}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Reset Session
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-extrabold text-zinc-900 mb-4 tracking-tight">
                  Ready for your next big move?
                </h2>
                <p className="text-lg text-zinc-600">
                  Select your interview level and let T.A.M.M.Y. guide you through a realistic simulation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <LevelCard 
                  level="entry"
                  title="Entry Level"
                  description="Perfect for students and recent graduates starting their journey."
                  icon={User}
                  selected={level === 'entry'}
                  onClick={() => setLevel('entry')}
                />
                <LevelCard 
                  level="junior"
                  title="Junior Developer"
                  description="Focus on technical fundamentals and early career growth."
                  icon={Zap}
                  selected={level === 'junior'}
                  onClick={() => setLevel('junior')}
                />
                <LevelCard 
                  level="mid"
                  title="Mid-Level Professional"
                  description="Deeper technical expertise and project management focus."
                  icon={Briefcase}
                  selected={level === 'mid'}
                  onClick={() => setLevel('mid')}
                />
                <LevelCard 
                  level="executive"
                  title="Executive / Leadership"
                  description="High-level strategy, vision, and organizational impact."
                  icon={Award}
                  selected={level === 'executive'}
                  onClick={() => setLevel('executive')}
                />
                <LevelCard 
                  level="behavioral"
                  title="Behavioral Mastery"
                  description="Master the STAR method and soft skills evaluation."
                  icon={ShieldCheck}
                  selected={level === 'behavioral'}
                  onClick={() => setLevel('behavioral')}
                />
                <LevelCard 
                  level="leadership"
                  title="High-Stakes Leadership"
                  description="Intense scenarios for senior management and directors."
                  icon={Target}
                  selected={level === 'leadership'}
                  onClick={() => setLevel('leadership')}
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={startInterview}
                  disabled={isLoading}
                  className="group relative px-12 py-4 bg-zinc-900 text-white rounded-2xl font-semibold text-lg hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-xl shadow-zinc-200"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" /> : "Start Interview"}
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'interview' && (
            <motion.div
              key="interview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Camera & TAMMY */}
              <div className="lg:col-span-7 space-y-6">
                <CameraPreview isActive={true} />
                
                <div className="bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Question {questionCount}/{MAX_QUESTIONS}</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <BrainCircuit size={28} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider">T.A.M.M.Y. says:</h4>
                      <p className="text-xl font-medium text-zinc-800 leading-relaxed italic">
                        "{currentQuestion}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Input & Controls */}
              <div className="lg:col-span-5 flex flex-col h-full">
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col h-full">
                  <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="font-bold text-zinc-900">Your Response</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsRecording(!isRecording)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          isRecording ? "bg-red-100 text-red-600" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        )}
                      >
                        {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your answer here or use the microphone..."
                      className="w-full h-full min-h-[300px] resize-none border-none focus:ring-0 text-lg text-zinc-700 placeholder:text-zinc-300"
                    />
                  </div>

                  <div className="p-6 bg-zinc-50 rounded-b-2xl border-t border-zinc-100">
                    <button
                      onClick={handleNextQuestion}
                      disabled={isLoading || !userAnswer.trim()}
                      className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>
                          {questionCount === MAX_QUESTIONS ? "Finish & Analyze" : "Next Question"}
                          <Send size={18} />
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-zinc-400 mt-4 uppercase tracking-widest">
                      Press Enter to submit
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'feedback' && feedback && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 mb-6 border-4 border-white shadow-xl">
                  <span className="text-4xl font-black">{feedback.overallScore}</span>
                </div>
                <h2 className="text-3xl font-extrabold text-zinc-900 mb-2">Interview Complete!</h2>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-zinc-900 text-white text-[10px] font-mono uppercase tracking-widest rounded-full">
                    Readiness: {feedback.evaluation.readinessBand}
                  </span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-mono uppercase tracking-widest rounded-full">
                    Hire Signal: {Math.round(feedback.evaluation.hireSignalScore * 100)}%
                  </span>
                </div>
                <p className="text-zinc-500 max-w-2xl mx-auto">
                  {feedback.response.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Discernment Metrics */}
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <h3 className="text-xl font-bold mb-6">Discernment Analysis</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Clarity', score: feedback.discernment.clarityScore },
                      { label: 'Specificity', score: feedback.discernment.specificityScore },
                      { label: 'Ownership', score: feedback.discernment.ownershipScore },
                      { label: 'Structure', score: feedback.discernment.structureScore },
                      { label: 'Credibility', score: feedback.discernment.credibilityScore },
                      { label: 'Confidence', score: feedback.discernment.confidenceScore },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-500">{m.label}</span>
                          <span className="font-medium">{Math.round(m.score * 100)}%</span>
                        </div>
                        <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${m.score * 100}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* STAR Method & Flags */}
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <h3 className="text-xl font-bold mb-6">STAR Method Check</h3>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {Object.entries(feedback.discernment.starComponents).map(([key, value]) => (
                      <div key={key} className={cn(
                        "p-3 rounded-xl border flex items-center gap-2 transition-colors",
                        value ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-zinc-50 border-zinc-200 text-zinc-400"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", value ? "bg-emerald-500" : "bg-zinc-300")} />
                        <span className="text-xs font-bold uppercase tracking-wider">{key}</span>
                      </div>
                    ))}
                  </div>
                  
                  {feedback.evaluation.recruiterRiskFlags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">Risk Flags</h4>
                      <div className="flex flex-wrap gap-2">
                        {feedback.evaluation.recruiterRiskFlags.map((flag, i) => (
                          <span key={i} className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100">
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Strengths */}
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                      <Award size={20} />
                    </div>
                    <h3 className="text-xl font-bold">Key Strengths</h3>
                  </div>
                  <ul className="space-y-4">
                    {feedback.evaluation.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-zinc-700 leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                      <Target size={20} />
                    </div>
                    <h3 className="text-xl font-bold">Areas for Growth</h3>
                  </div>
                  <ul className="space-y-4">
                    {feedback.evaluation.weaknesses.map((s, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-zinc-700 leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Mentorship */}
              <div className="bg-zinc-900 text-white p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Lightbulb size={120} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Lightbulb size={24} className="text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold">T.A.M.M.Y.'s Mentorship</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <h4 className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-2">Recruiter Perspective</h4>
                      <p className="text-white/80 leading-relaxed">{feedback.response.recruiterFeedback}</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <h4 className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-2">Coaching Advice</h4>
                      <p className="text-white/80 leading-relaxed">{feedback.response.coachingFeedback}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-8">
                <button
                  onClick={reset}
                  className="px-10 py-4 bg-zinc-200 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-300 transition-colors"
                >
                  Try Another Session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldCheck size={16} />
            <span className="text-xs font-mono uppercase tracking-widest">Secure AI Environment</span>
          </div>
          <p className="text-xs text-zinc-400 font-mono">© 2026 T.A.M.M.Y. INTERVIEW SYSTEMS v1.0.4</p>
        </div>
      </footer>
    </div>
  );
}
