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
  Loader2,
  Download,
  Calendar,
  Phone,
  MonitorPlay,
  HelpCircle,
  X,
  Check,
  Edit2
} from 'lucide-react';
import { cn } from './lib/utils';
import { 
  getInitialQuestion, 
  getFollowUpQuestion, 
  analyzeInterview, 
  InterviewFeedback,
  parseDocuments,
  DocumentContext
} from './services/gemini';
import { jsPDF } from 'jspdf';
import { TammyBrain, InterviewLevel, InterviewMode, InterviewStage } from './services/tammyBrain';
import { SPECIALISTS, Specialist, BADGES, Badge } from './constants';
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';

// Initialize Brain
const brain = new TammyBrain();

const OnboardingTutorial = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to T.A.M.M.Y.",
      description: "Training Adaptive Mock-interview & Mentorship sYstem. We're here to help you land your dream career at MyComputerCareer.",
      icon: BrainCircuit,
      color: "text-emerald-600 bg-emerald-50"
    },
    {
      title: "Step 1: Setup Your Role",
      description: "Tell us what level of role you're targeting. This helps T.A.M.M.Y. tailor the interview questions to your specific career path.",
      icon: Target,
      color: "text-blue-600 bg-blue-50"
    },
    {
      title: "Step 2: Upload Documents",
      description: "Provide your Resume and a Job Description. Our AI analyzes these to create a hyper-realistic interview scenario.",
      icon: Briefcase,
      color: "text-purple-600 bg-purple-50"
    },
    {
      title: "Step 3: AI Mock Interview",
      description: "Engage in a real-time, voice-enabled mock interview. T.A.M.M.Y. listens, adapts, and probes deeper based on your answers.",
      icon: Mic,
      color: "text-orange-600 bg-orange-50"
    },
    {
      title: "Step 4: Feedback & Reports",
      description: "Get instant, detailed analysis of your performance. We track clarity, confidence, and alignment with recruiter expectations.",
      icon: Award,
      color: "text-rose-600 bg-rose-50"
    },
    {
      title: "Step 5: Advisor Mentorship",
      description: "Once you're ready, connect with a human Career Services Advisor for a final live mock interview and professional sign-off.",
      icon: User,
      color: "text-indigo-600 bg-indigo-50"
    }
  ];

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-zinc-200"
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div className={cn("p-4 rounded-2xl", steps[currentStep].color)}>
              <StepIcon size={32} />
            </div>
            <button 
              onClick={onComplete}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
              {steps[currentStep].title}
            </h2>
            <p className="text-lg text-zinc-600 leading-relaxed">
              {steps[currentStep].description}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentStep ? "w-8 bg-emerald-500" : "w-1.5 bg-zinc-200"
                  )}
                />
              ))}
            </div>
            <button 
              onClick={next}
              className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 group"
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next Step"}
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

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

const ModeCard = ({ 
  mode, 
  title, 
  description, 
  icon: Icon, 
  selected, 
  onClick 
}: { 
  mode: InterviewMode; 
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
        layoutId="selected-mode-indicator"
        className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500"
      />
    )}
  </button>
);

const CameraPreview = ({ isActive, isVideoEnabled }: { isActive: boolean; isVideoEnabled: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isActive && isVideoEnabled) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Camera error:", err));
    } else {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, [isActive, isVideoEnabled]);

  return (
    <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      {(!isActive || !isVideoEnabled) && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
          <VideoOff className="text-zinc-600" size={48} />
        </div>
      )}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
        <div className={cn("w-2 h-2 rounded-full animate-pulse", (isActive && isVideoEnabled) ? "bg-emerald-500" : "bg-zinc-500")} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/80">
          {(isActive && isVideoEnabled) ? "Live Feed" : "Camera Off"}
        </span>
      </div>
    </div>
  );
};

const AdminStudentList = ({ isSuperAdmin, advisors }: { isSuperAdmin?: boolean, advisors: Specialist[] }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = isSuperAdmin 
      ? query(collection(db, 'users'))
      : query(collection(db, 'users'), where('role', '==', 'student'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isSuperAdmin]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div key={u.uid} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-zinc-900">{u.displayName}</p>
              <p className="text-[10px] text-zinc-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest",
                u.role === 'super_admin' ? "bg-purple-100 text-purple-600" :
                u.role === 'admin' ? "bg-red-100 text-red-600" :
                u.role === 'advisor' ? "bg-indigo-100 text-indigo-600" :
                "bg-emerald-100 text-emerald-600"
              )}>
                {u.role || 'student'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Advisor</p>
              <select 
                value={u.assignedAdvisorId || ''}
                onChange={async (e) => {
                  await updateDoc(doc(db, 'users', u.uid), { assignedAdvisorId: e.target.value });
                }}
                className="w-full text-[10px] font-bold bg-white border border-zinc-200 rounded-lg px-2 py-1"
              >
                <option value="">No Advisor</option>
                {advisors.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            {isSuperAdmin && u.email !== 'james.webb@mycomputercareer.com' && (
              <div className="flex-1">
                <p className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Role</p>
                <select 
                  value={u.role || 'student'}
                  onChange={async (e) => {
                    await updateDoc(doc(db, 'users', u.uid), { role: e.target.value });
                  }}
                  className="w-full text-[10px] font-bold bg-white border border-zinc-200 rounded-lg px-2 py-1"
                >
                  <option value="student">Student</option>
                  <option value="advisor">Advisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const PastInterviewsList = ({ userId, onSelectReport }: { userId: string, onSelectReport: (report: any) => void }) => {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'interviews'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setInterviews(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" /></div>;
  if (interviews.length === 0) return (
    <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-zinc-100">
      <p className="text-zinc-400 font-medium">No past interviews found. Start your first session!</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {interviews.map((interview) => (
        <div key={interview.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MonitorPlay size={24} />
            </div>
            <div>
              <h4 className="font-bold text-zinc-900">{interview.level} Interview</h4>
              <p className="text-xs text-zinc-500">
                {interview.timestamp?.toDate().toLocaleDateString()} • Score: {interview.feedback?.overallScore || 'N/A'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => onSelectReport(interview)}
            className="px-4 py-2 text-emerald-600 font-bold hover:bg-emerald-50 rounded-lg transition-colors"
          >
            View Report
          </button>
        </div>
      ))}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [view, setView] = useState<'student' | 'advisor' | 'admin' | 'super_admin'>('student');
  const [step, setStep] = useState<'setup-role' | 'setup-docs' | 'setup-advisor' | 'interview' | 'feedback' | 'scheduling' | 'profile'>('setup-role');
  const [interviewStep, setInterviewStep] = useState<1 | 2>(1); 
  const [level, setLevel] = useState<InterviewLevel>('entry');
  const [mode, setMode] = useState<InterviewMode>('career_alignment');
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [docContext, setDocContext] = useState<DocumentContext | null>(null);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Specialist | null>(null);
  const [advisors, setAdvisors] = useState<Specialist[]>(SPECIALISTS);
  const [editingAdvisor, setEditingAdvisor] = useState<Specialist | null>(null);
  const [newAdvisorName, setNewAdvisorName] = useState('');
  const [urlAdvisor, setUrlAdvisor] = useState<string | null>(null);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ question: string; answer: string }[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState<Badge | null>(null);
  const recognitionRef = useRef<any>(null);

  // Advisor Dashboard State
  const [myStudents, setMyStudents] = useState<any[]>([]);

  const MAX_QUESTIONS = 3;

  useEffect(() => {
    // Check for advisor in URL
    const params = new URLSearchParams(window.location.search);
    const advisorName = params.get('advisor');
    if (advisorName) {
      setUrlAdvisor(advisorName);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          // Create default profile if it doesn't exist
          const newProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            role: 'student',
            currentStage: InterviewStage.AI_PRACTICE,
            assignedAdvisorId: urlAdvisor || null // Automatically assign advisor from link if present
          };
          await setDoc(userDocRef, newProfile);
        }

        let isInitialLoad = true;
        // Listen for profile changes
        const unsubProfile = onSnapshot(userDocRef, async (doc) => {
          if (doc.exists()) {
            const profile = doc.data();
            
            // Ensure James Webb, Timothy Pillard, and Richard Saltares are always super_admin
            const superAdmins = ['james.webb@mycomputercareer.com', 'timothy.pillard@mycomputercareer.com', 'richard.saltares@mycomputercareer.com'];
            if (firebaseUser.email && superAdmins.includes(firebaseUser.email) && profile.role !== 'super_admin') {
              await updateDoc(userDocRef, { role: 'super_admin' });
              return;
            }

            setUserProfile(profile);
            setView(profile.role || 'student');
            
            // Check if onboarding is needed
            if (profile.role === 'student' && !profile.hasCompletedTutorial) {
              setShowTutorial(true);
            }

            // Sync local step with Firestore stage on initial load
            if (isInitialLoad && profile.currentStage) {
              if (profile.currentStage === InterviewStage.RECORDED_INTERVIEW) {
                setStep('feedback');
              } else if (profile.currentStage === InterviewStage.ADVISOR_REQUIRED || profile.currentStage === InterviewStage.LIVE_MOCK_SCHEDULED) {
                setStep('scheduling');
              }
              isInitialLoad = false;
            }

            // If user has an assigned advisor, set it
            if (profile.role === 'student' && profile.assignedAdvisorId) {
              const advisor = advisors.find(s => s.name === profile.assignedAdvisorId);
              if (advisor) setSelectedAdvisor(advisor);
            }
          }
        });

        return () => unsubProfile();
      } else {
        setUserProfile(null);
      }
    });

    // Fetch dynamic advisors
    const qAdvisors = query(collection(db, 'advisors'));
    const unsubAdvisors = onSnapshot(qAdvisors, (snapshot) => {
      const fetchedAdvisors = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        link: doc.data().calendarLink
      }));
      
      const merged = SPECIALISTS.map(s => {
        const override = fetchedAdvisors.find(fa => fa.link === s.link);
        return override || s;
      });
      
      fetchedAdvisors.forEach(fa => {
        if (!merged.find(m => m.link === fa.link)) {
          merged.push(fa);
        }
      });

      setAdvisors(merged);
    });

    return () => {
      unsubscribe();
      unsubAdvisors();
    };
  }, [urlAdvisor, advisors]);

  const handleUpdateAdvisorName = async () => {
    if (!editingAdvisor || !newAdvisorName.trim()) return;
    
    try {
      if (editingAdvisor.id) {
        await updateDoc(doc(db, 'advisors', editingAdvisor.id), {
          name: newAdvisorName.trim()
        });
      } else {
        // Create new doc if it was from constants
        await addDoc(collection(db, 'advisors'), {
          name: newAdvisorName.trim(),
          calendarLink: editingAdvisor.link
        });
      }
      setEditingAdvisor(null);
      setNewAdvisorName('');
    } catch (error) {
      console.error("Error updating advisor name:", error);
    }
  };

  const generateCompletionPDF = (student: any) => {
    const doc = new jsPDF();
    
    // Add border
    doc.setDrawColor(16, 185, 129); // Emerald-500
    doc.setLineWidth(2);
    doc.rect(10, 10, 190, 277);
    
    // Header
    doc.setFontSize(30);
    doc.setTextColor(20, 20, 20);
    doc.text('CERTIFICATE OF COMPLETION', 105, 50, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('This document confirms that', 105, 70, { align: 'center' });
    
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text(student.displayName.toUpperCase(), 105, 90, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('has successfully completed a Mock Interview session with', 105, 110, { align: 'center' });
    
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text('T.A.M.M.Y. AI Mentorship System', 105, 125, { align: 'center' });
    
    // Details
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 150, { align: 'center' });
    doc.text(`Assigned Advisor: ${userProfile?.displayName}`, 105, 160, { align: 'center' });
    doc.text(`Final Performance Score: ${student.lastScore || 'N/A'}`, 105, 170, { align: 'center' });
    
    // Footer
    doc.setFontSize(10);
    doc.text('Training Adaptive Mock-interview & Mentorship sYstem', 105, 250, { align: 'center' });
    
    doc.save(`${student.displayName}_Mock_Interview_Completion.pdf`);
  };

  useEffect(() => {
    if (!user || !userProfile || userProfile.role !== 'student') return;

    let newStage: InterviewStage | null = null;

    switch (step) {
      case 'setup-role':
      case 'setup-docs':
      case 'setup-advisor':
      case 'interview':
        newStage = InterviewStage.AI_PRACTICE;
        break;
      case 'feedback':
        newStage = InterviewStage.RECORDED_INTERVIEW;
        break;
      case 'scheduling':
        newStage = InterviewStage.ADVISOR_REQUIRED;
        break;
      default:
        break;
    }

    if (newStage && userProfile.currentStage !== newStage) {
      updateDoc(doc(db, 'users', user.uid), { currentStage: newStage })
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));
    }
  }, [step, user, userProfile]);

  useEffect(() => {
    if (user && userProfile?.role === 'advisor') {
      const q = query(collection(db, 'users'), where('assignedAdvisorId', '==', userProfile.displayName));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMyStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [user, userProfile]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setUserAnswer(prev => prev + (prev ? ' ' : '') + transcript);
        }
      };

      recognitionRef.current.onend = () => {
        if (isRecording) recognitionRef.current.start();
      };
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      recognitionRef.current?.start();
    } else {
      recognitionRef.current?.stop();
    }
  }, [isRecording]);

  const login = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      setAuthError(error.message);
      console.error("Login failed", error);
    }
  };

  const loginWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const signUpWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const logout = async () => {
    await signOut(auth);
    reset();
  };

  const startInterview = async () => {
    setIsLoading(true);
    try {
      const context = await parseDocuments(resume, jobDescription);
      setDocContext(context);
      const q = await getInitialQuestion(level, mode, interviewStep, context);
      setCurrentQuestion(q);
      setStep('interview');
      setQuestionCount(1);
      
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          currentStage: InterviewStage.RECORDED_INTERVIEW,
          lastInterviewLevel: level,
          lastInterviewMode: mode
        });
      }
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
      if (interviewStep === 1) {
        setInterviewStep(2);
        const q = await getInitialQuestion(level, mode, 2, docContext || undefined);
        setCurrentQuestion(q);
        setQuestionCount(1);
      } else {
        const result = await analyzeInterview(level, mode, newHistory);
        brain.recordAnalysis(user?.uid || 'anonymous', result);
        setFeedback(result);
        setStep('feedback');

        if (user && userProfile) {
          const newPoints = (userProfile.points || 0) + 100 + (result.overallScore * 2);
          const newTotalInterviews = (userProfile.totalInterviews || 0) + 1;
          const currentBadges = userProfile.badges || [];
          const newBadges = [...currentBadges];

          if (newTotalInterviews === 1 && !newBadges.includes('first-step')) newBadges.push('first-step');
          if (result.overallScore > 85 && !newBadges.includes('high-achiever')) newBadges.push('high-achiever');
          if (newTotalInterviews === 5 && !newBadges.includes('consistent')) newBadges.push('consistent');
          if (result.discernment.clarityScore > 90 && !newBadges.includes('clarity-master')) newBadges.push('clarity-master');
          if (result.discernment.confidenceScore > 90 && !newBadges.includes('confidence-pro')) newBadges.push('confidence-pro');
          if (result.discernment.roleAlignment > 90 && !newBadges.includes('alignment-expert')) newBadges.push('alignment-expert');

          // Check for newly earned badges
          const newlyEarned = newBadges.filter(b => !currentBadges.includes(b));
          if (newlyEarned.length > 0) {
            const badge = BADGES.find(b => b.id === newlyEarned[0]);
            if (badge) setEarnedBadge(badge);
          }

          await updateDoc(doc(db, 'users', user.uid), {
            currentStage: InterviewStage.ADVISOR_REQUIRED,
            lastScore: result.overallScore,
            lastHireSignal: result.evaluation.hireSignalScore,
            points: Math.round(newPoints),
            totalInterviews: newTotalInterviews,
            badges: newBadges
          });
          
          // Record interview in Firestore
          await addDoc(collection(db, 'interviews'), {
            userId: user.uid,
            advisorId: selectedAdvisor?.name || 'Unassigned',
            level,
            mode,
            feedback: result,
            history: newHistory,
            timestamp: serverTimestamp()
          });
        }
      }
    } else {
      const nextQ = await getFollowUpQuestion(
        level, 
        mode, 
        newHistory.map(h => h.question), 
        userAnswer,
        docContext || undefined
      );
      setCurrentQuestion(nextQ);
      setQuestionCount(prev => prev + 1);
    }
    setIsLoading(false);
  };

  const downloadFeedback = () => {
    if (!feedback) return;
    const content = `
T.A.M.M.Y. Interview Feedback Report
------------------------------------
Level: ${level}
Mode: ${mode}
Overall Score: ${feedback.overallScore}
Readiness: ${feedback.evaluation.readinessBand}
Hire Signal: ${Math.round(feedback.evaluation.hireSignalScore * 100)}%

Summary:
${feedback.response.summary}

Recruiter Feedback:
${feedback.response.recruiterFeedback}

Coaching Advice:
${feedback.response.coachingFeedback}

Key Strengths:
${feedback.evaluation.strengths.map(s => `- ${s}`).join('\n')}

Areas for Growth:
${feedback.evaluation.weaknesses.map(w => `- ${w}`).join('\n')}
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TAMMY_Feedback_${level}_${mode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep('setup-role');
    setInterviewStep(1);
    setHistory([]);
    setFeedback(null);
    setQuestionCount(0);
    setCurrentQuestion('');
    setUserAnswer('');
  };

  const handleCompleteTutorial = async () => {
    setShowTutorial(false);
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { hasCompletedTutorial: true })
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <AnimatePresence>
        {showTutorial && <OnboardingTutorial onComplete={handleCompleteTutorial} />}
      </AnimatePresence>

      <AnimatePresence>
        {earnedBadge && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-zinc-200 p-8 text-center"
            >
              <div className="w-24 h-24 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-orange-100 animate-bounce">
                {earnedBadge.icon}
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-2">Badge Earned!</h2>
              <p className="text-zinc-500 mb-8">Congratulations! You've earned the <span className="font-bold text-zinc-900">{earnedBadge.name}</span> badge.</p>
              <button 
                onClick={() => setEarnedBadge(null)}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                {(userProfile?.role === 'admin' || userProfile?.role === 'super_admin') && (
                  <select 
                    value={view} 
                    onChange={(e) => setView(e.target.value as any)}
                    className="text-xs font-bold uppercase tracking-widest bg-zinc-100 border-none rounded-lg px-3 py-2"
                  >
                    <option value="student">Student View</option>
                    <option value="advisor">Advisor View</option>
                    <option value="admin">Admin View</option>
                    {userProfile?.role === 'super_admin' && <option value="super_admin">Super Admin View</option>}
                  </select>
                )}
                <button 
                  onClick={() => setShowTutorial(true)}
                  className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  title="Show Tutorial"
                >
                  <HelpCircle size={20} />
                </button>
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 rounded-xl cursor-pointer hover:bg-zinc-200 transition-colors" onClick={() => setStep('profile')}>
                  <div className="flex items-center gap-1.5 mr-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-black uppercase tracking-tight">
                    <Zap size={10} className="fill-current" />
                    {userProfile?.points || 0}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white font-bold">
                    {user.displayName?.[0] || 'U'}
                  </div>
                  <span className="text-xs font-bold text-zinc-700">{user.displayName}</span>
                </div>
                <button 
                  onClick={logout}
                  className="text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={login}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all"
              >
                Sign In
              </button>
            )}
            {step !== 'setup-role' && view === 'student' && (
              <button 
                onClick={reset}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {view === 'advisor' && (
            <motion.div
              key="advisor-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Advisor Dashboard: {userProfile?.displayName}</h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      const inviteLink = `${window.location.origin}${window.location.pathname}?advisor=${encodeURIComponent(userProfile?.displayName || '')}`;
                      navigator.clipboard.writeText(inviteLink);
                      alert('Your personalized invite link has been copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-zinc-800 transition-all"
                  >
                    <Send size={16} /> Copy Invite Link
                  </button>
                  <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm">
                    {myStudents.length} Assigned Students
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {myStudents.map((student) => (
                  <div key={student.uid} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900">{student.displayName}</h3>
                        <p className="text-xs text-zinc-500">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Current Stage</p>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
                          {student.currentStage}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Last Score</p>
                        <span className="font-bold text-zinc-900">{student.lastScore || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={async () => {
                            const q = query(collection(db, 'interviews'), where('userId', '==', student.uid));
                            const snapshot = await getDocs(q);
                            if (!snapshot.empty) {
                              const lastInterview = snapshot.docs.sort((a, b) => b.data().timestamp?.seconds - a.data().timestamp?.seconds)[0].data();
                              setSelectedReport(lastInterview);
                            }
                          }}
                          className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-all"
                        >
                          View Report
                        </button>
                        <button 
                          onClick={() => generateCompletionPDF(student)}
                          className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm font-bold px-4"
                          title="Download Completion Certificate"
                        >
                          <Download size={16} /> Certificate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {(view === 'admin' || view === 'super_admin') && (
            <motion.div
              key="admin-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">{view === 'super_admin' ? 'Super Admin Dashboard' : 'Admin Control Panel'}</h2>
                <button className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all">
                  Add New Advisor
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <h3 className="text-xl font-bold mb-6">Manage Specialists</h3>
                  <div className="space-y-4">
                    {advisors.map((s) => (
                      <div key={s.link} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div className="flex-1 mr-4">
                          {editingAdvisor?.link === s.link ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                value={newAdvisorName}
                                onChange={(e) => setNewAdvisorName(e.target.value)}
                                className="flex-1 px-3 py-1 bg-white border border-zinc-200 rounded-lg text-sm font-bold"
                                autoFocus
                              />
                              <button 
                                onClick={handleUpdateAdvisorName}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                onClick={() => setEditingAdvisor(null)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <RefreshCw className="rotate-45" size={16} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="font-bold text-zinc-900 flex items-center gap-2">
                                {s.name}
                                {userProfile?.role === 'super_admin' && (
                                  <button 
                                    onClick={() => {
                                      setEditingAdvisor(s);
                                      setNewAdvisorName(s.name);
                                    }}
                                    className="p-1 text-zinc-400 hover:text-emerald-600 transition-colors"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                )}
                              </p>
                              <p className="text-xs text-zinc-500 truncate max-w-[200px]">{s.link}</p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const inviteLink = `${window.location.origin}${window.location.pathname}?advisor=${encodeURIComponent(s.name)}`;
                              navigator.clipboard.writeText(inviteLink);
                              alert(`Invite link copied for ${s.name}`);
                            }}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                          >
                            <Send size={14} /> Link
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <h3 className="text-xl font-bold mb-6">{view === 'super_admin' ? 'Manage All Users' : 'Manage Students'}</h3>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    <AdminStudentList isSuperAdmin={view === 'super_admin'} advisors={advisors} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'student' && (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              {step.startsWith('setup') && (
                <div className="max-w-4xl mx-auto">
                  {!user ? (
                    <div className="max-w-md mx-auto">
                      <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 mb-6 shadow-xl shadow-emerald-100/50">
                          <BrainCircuit size={40} />
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 mb-4 tracking-tight">T.A.M.M.Y.</h1>
                        <p className="text-sm font-mono uppercase tracking-[0.2em] text-emerald-600 font-bold mb-6">
                          Training Adaptive Mock-interview & Mentorship sYstem
                        </p>
                        <p className="text-zinc-500 leading-relaxed">
                          Master your interview skills with our AI-driven mentorship platform. 
                          Get real-time feedback, track your progress, and connect with Career Services Advisors.
                        </p>
                      </div>

                      <div className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-2xl shadow-zinc-200/50">
                        <form onSubmit={isSigningUp ? signUpWithEmail : loginWithEmail} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 ml-1">Email Address</label>
                            <input 
                              type="email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                              placeholder="you@example.com"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 ml-1">Password</label>
                            <input 
                              type="password" 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                              placeholder="••••••••"
                              required
                            />
                          </div>
                          
                          {authError && (
                            <p className="text-xs text-red-500 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                              {authError}
                            </p>
                          )}

                          <button 
                            type="submit"
                            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                          >
                            {isSigningUp ? 'Create Account' : 'Sign In'}
                          </button>
                        </form>

                        <div className="relative my-8">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
                          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-zinc-400"><span className="bg-white px-4">Or continue with</span></div>
                        </div>

                        <button 
                          onClick={login}
                          className="w-full py-4 bg-white border border-zinc-200 text-zinc-900 rounded-xl font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-3"
                        >
                          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                          Google Account
                        </button>

                        <p className="text-center mt-8 text-sm text-zinc-500">
                          {isSigningUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                          <button 
                            onClick={() => setIsSigningUp(!isSigningUp)}
                            className="text-emerald-600 font-bold hover:underline"
                          >
                            {isSigningUp ? 'Sign In' : 'Sign Up'}
                          </button>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {step === 'setup-role' && (
                        <div className="space-y-12">
                          <div className="text-center">
                            <h2 className="text-4xl font-extrabold text-zinc-900 mb-4 tracking-tight">Step 1: Select Role Level</h2>
                            <p className="text-lg text-zinc-600">This sets the difficulty and depth of your interview.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                              { id: 'entry', title: 'Entry Level', desc: 'Students & graduates', icon: User },
                              { id: 'mid', title: 'Mid-Level', desc: '3-5 years experience', icon: Briefcase },
                              { id: 'senior', title: 'Senior Level', desc: '5+ years experience', icon: Award },
                              { id: 'leadership', title: 'Leadership', desc: 'Management & Strategy', icon: Target },
                              { id: 'career_change', title: 'Career Change', desc: 'Transitioning to IT', icon: RefreshCw },
                              { id: 'internship', title: 'Internship', desc: 'Student roles', icon: Zap },
                            ].map((l) => (
                              <LevelCard 
                                key={l.id}
                                level={l.id as InterviewLevel}
                                title={l.title}
                                description={l.desc}
                                icon={l.icon}
                                selected={level === l.id}
                                onClick={() => setLevel(l.id as InterviewLevel)}
                              />
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => setStep('setup-docs')} className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold flex items-center gap-2">
                              Next Step <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>
                      )}

                      {step === 'setup-docs' && (
                        <div className="space-y-12">
                          <div className="text-center">
                            <h2 className="text-4xl font-extrabold text-zinc-900 mb-4 tracking-tight">Step 2: Upload Context</h2>
                            <p className="text-lg text-zinc-600">Provide your resume or a job description for a tailored experience.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Resume (Text)</label>
                              <textarea 
                                value={resume}
                                onChange={(e) => setResume(e.target.value)}
                                placeholder="Paste your resume text here..."
                                className="w-full h-64 p-4 rounded-2xl border-2 border-zinc-200 focus:border-emerald-500 focus:ring-0 transition-all"
                              />
                            </div>
                            <div className="space-y-4">
                              <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Job Description (Text)</label>
                              <textarea 
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                placeholder="Paste the job description here..."
                                className="w-full h-64 p-4 rounded-2xl border-2 border-zinc-200 focus:border-emerald-500 focus:ring-0 transition-all"
                              />
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <button onClick={() => setStep('setup-role')} className="px-8 py-3 text-zinc-500 font-bold">Back</button>
                            <button onClick={() => setStep('setup-advisor')} className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold flex items-center gap-2">
                              Next Step <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>
                      )}

                      {step === 'setup-advisor' && (
                        <div className="space-y-12">
                          <div className="text-center">
                            <h2 className="text-4xl font-extrabold text-zinc-900 mb-4 tracking-tight">Step 3: Select Advisor</h2>
                            <p className="text-lg text-zinc-600">Choose the specialist who will receive your reports and coach you.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto p-4 border border-zinc-100 rounded-3xl">
                            {advisors.map((s) => (
                              <button
                                key={s.name}
                                onClick={async () => {
                                  setSelectedAdvisor(s);
                                  if (user) {
                                    await updateDoc(doc(db, 'users', user.uid), { assignedAdvisorId: s.name });
                                  }
                                }}
                                className={cn(
                                  "p-6 rounded-2xl border-2 transition-all text-left",
                                  selectedAdvisor?.name === s.name ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100" : "border-zinc-200 hover:border-zinc-300"
                                )}
                              >
                                <h4 className="font-bold text-zinc-900">{s.name}</h4>
                                <p className="text-xs text-zinc-500">Career Specialist</p>
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between">
                            <button onClick={() => setStep('setup-docs')} className="px-8 py-3 text-zinc-500 font-bold">Back</button>
                            <button 
                              disabled={!selectedAdvisor || isLoading}
                              onClick={startInterview} 
                              className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-200"
                            >
                              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Start AI Interview'} <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>
                      )}

                    </>
                  )}
                </div>
              )}

              {step === 'interview' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Camera & TAMMY */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                      <div className={cn(
                        "px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2",
                        interviewStep === 1 ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500"
                      )}>
                        <Phone size={14} /> Step 1: Phone
                      </div>
                      <div className={cn(
                        "px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2",
                        interviewStep === 2 ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500"
                      )}>
                        <MonitorPlay size={14} /> Step 2: Video
                      </div>
                    </div>

                    <CameraPreview isActive={true} isVideoEnabled={interviewStep === 2} />
                    
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
                              "p-2 rounded-lg transition-colors flex items-center gap-2 px-3",
                              isRecording ? "bg-red-100 text-red-600" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            )}
                          >
                            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                            <span className="text-xs font-bold uppercase tracking-widest">{isRecording ? "Stop Recording" : "Start Recording"}</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 p-6">
                        <textarea
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder={interviewStep === 1 ? "Start recording to transcribe your response..." : "Your video response is being monitored..."}
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
                              {(questionCount === MAX_QUESTIONS && interviewStep === 2) ? "Finish & Analyze" : "Next Question"}
                              <Send size={18} />
                            </>
                          )}
                        </button>
                        <p className="text-center text-[10px] text-zinc-400 mt-4 uppercase tracking-widest">
                          {interviewStep === 1 ? "Audio Only Mode" : "Video + Audio Mode"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'feedback' && feedback && (
                <div className="max-w-5xl mx-auto space-y-8">
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
                    {/* Predictive Readiness */}
                    <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <ShieldCheck className="text-emerald-500" size={20} />
                        Predictive Readiness
                      </h3>
                      <div className="space-y-6">
                        {[
                          { label: 'Phone Screen Readiness', score: feedback.evaluation.passPhoneScreenProb },
                          { label: 'Interview Readiness', score: feedback.evaluation.passInterviewProb },
                          { label: 'Hire Signal Probability', score: feedback.evaluation.hireSignalProb },
                          { label: 'Role Fit Probability', score: feedback.evaluation.roleFitProb },
                        ].map((m) => (
                          <div key={m.label}>
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-zinc-500 font-medium uppercase tracking-wider">{m.label}</span>
                              <span className="font-bold text-emerald-600">{Math.round(m.score * 100)}%</span>
                            </div>
                            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${m.score * 100}%` }}
                                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Career Alignment Intelligence */}
                    <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <BrainCircuit className="text-indigo-500" size={20} />
                        Alignment Intelligence
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        {[
                          { label: 'Direction Clarity', score: feedback.discernment.careerDirectionClarity },
                          { label: 'Goal Specificity', score: feedback.discernment.goalSpecificity },
                          { label: 'Resume Coherence', score: feedback.discernment.resumeCoherence },
                          { label: 'Role Alignment', score: feedback.discernment.roleAlignment },
                          { label: 'Motivation Strength', score: feedback.discernment.motivationStrength },
                          { label: 'Consistency', score: feedback.discernment.consistencyScore },
                        ].map((m) => (
                          <div key={m.label} className="space-y-2">
                            <div className="flex justify-between text-[10px] uppercase tracking-widest text-zinc-400">
                              <span>{m.label}</span>
                              <span className="font-bold text-zinc-900">{Math.round(m.score * 100)}%</span>
                            </div>
                            <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${m.score * 100}%` }}
                                className="h-full bg-indigo-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Recruiter Simulation */}
                    <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <User className="text-zinc-900" size={20} />
                        Recruiter Simulation
                      </h3>
                      <div className="space-y-4">
                        {[
                          { label: 'Industry Language Match', score: feedback.evaluation.industryLanguageMatch },
                          { label: 'Role Keywords Match', score: feedback.evaluation.roleKeywordsMatch },
                          { label: 'Motivation Specificity', score: feedback.evaluation.motivationSpecificity },
                          { label: 'Company Research Signal', score: feedback.evaluation.companyResearchSignal },
                          { label: 'Values Alignment', score: feedback.evaluation.valuesAlignment },
                        ].map((m) => (
                          <div key={m.label} className="flex items-center gap-4">
                            <span className="text-xs text-zinc-500 w-40 shrink-0">{m.label}</span>
                            <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${m.score * 100}%` }}
                                className="h-full bg-zinc-900"
                              />
                            </div>
                            <span className="text-xs font-bold w-10 text-right">{Math.round(m.score * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* STAR Method & Risks */}
                    <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-xl font-bold mb-6">STAR Method & Risks</h3>
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
                          <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">Top Risks Detected</h4>
                          <div className="flex flex-wrap gap-2">
                            {feedback.evaluation.recruiterRiskFlags.map((flag, i) => (
                              <span key={i} className="px-3 py-1.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-red-600" />
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

                  <div className="flex justify-center pt-8 gap-4">
                    <button
                      onClick={downloadFeedback}
                      className="px-10 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                      <Download size={20} />
                      Download Feedback
                    </button>
                    <button
                      onClick={() => setStep('scheduling')}
                      className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      <Calendar size={20} />
                      Schedule Live Interview
                    </button>
                  </div>
                </div>
              )}

          {step === 'scheduling' && (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-8">
                  <Calendar size={40} />
                </div>
                <h2 className="text-4xl font-extrabold text-zinc-900 mb-4 tracking-tight">
                  Step 3: Live Interview Scheduling
                </h2>
                <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
                  You've completed the AI training steps! Now, schedule a 1:1 or Panel Interview with our Career Services Advisors to finalize your preparation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {advisors.map((specialist) => (
                  <div 
                    key={specialist.name}
                    className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900">{specialist.name}</h3>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Career Specialist</p>
                      </div>
                    </div>
                    
                    <a 
                      href={specialist.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={async () => {
                        if (user) {
                          await updateDoc(doc(db, 'users', user.uid), {
                            currentStage: InterviewStage.LIVE_MOCK_SCHEDULED
                          });
                        }
                      }}
                      className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Calendar size={16} />
                      Schedule Now
                    </a>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-6">
                <button
                  onClick={() => setStep('feedback')}
                  className="text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2"
                >
                  <ChevronRight size={16} className="rotate-180" />
                  Back to Feedback
                </button>
                <button
                  onClick={reset}
                  className="text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}

          {step === 'profile' && (
            <div className="max-w-5xl mx-auto space-y-12">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-black text-zinc-900 mb-2">My Profile</h2>
                  <p className="text-zinc-500">Track your interview progress and review past sessions.</p>
                </div>
                <button 
                  onClick={() => setStep('setup-role')}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                >
                  New Interview <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Current Stage</p>
                  <p className="text-xl font-black text-emerald-600">{userProfile?.currentStage || 'Not Started'}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Assigned Advisor</p>
                  <p className="text-xl font-black text-zinc-900">{userProfile?.assignedAdvisorId || 'Unassigned'}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Last Score</p>
                  <p className="text-xl font-black text-indigo-600">{userProfile?.lastScore || 'N/A'}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Total Points</p>
                  <p className="text-xl font-black text-orange-600">{userProfile?.points || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  <h3 className="text-2xl font-bold text-zinc-900">Past Interviews</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <PastInterviewsList userId={user?.uid || ''} onSelectReport={setSelectedReport} />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-zinc-900">Badges & Achievements</h3>
                  <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
                    {userProfile?.badges && userProfile.badges.length > 0 ? (
                      <div className="grid grid-cols-3 gap-4">
                        {userProfile.badges.map((badgeId: string) => {
                          const badge = BADGES.find(b => b.id === badgeId);
                          if (!badge) return null;
                          return (
                            <div key={badgeId} className="flex flex-col items-center text-center group relative">
                              <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform cursor-help">
                                {badge.icon}
                              </div>
                              <span className="text-[10px] font-bold text-zinc-500 mt-2 uppercase tracking-tighter">{badge.name}</span>
                              
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-zinc-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                                <p className="font-bold mb-1">{badge.name}</p>
                                <p className="text-zinc-400 leading-relaxed">{badge.description}</p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-3xl grayscale opacity-30 mx-auto mb-4">
                          🏆
                        </div>
                        <p className="text-sm text-zinc-400 font-medium">Complete interviews to earn badges!</p>
                      </div>
                    )}

                    <div className="pt-6 border-t border-zinc-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Next Milestone</span>
                        <span className="text-xs font-bold text-emerald-600">{(userProfile?.totalInterviews || 0)} / 5</span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500" 
                          style={{ width: `${Math.min(((userProfile?.totalInterviews || 0) / 5) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-2">Complete 5 interviews to earn the <span className="font-bold text-zinc-600">Consistent</span> badge.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>

    {/* Report Modal */}
    {selectedReport && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-8 relative"
        >
          <button 
            onClick={() => setSelectedReport(null)}
            className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <RefreshCw className="rotate-45" size={24} />
          </button>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Award size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-zinc-900">Interview Report</h2>
                <p className="text-zinc-500">{selectedReport.level} • {selectedReport.timestamp?.toDate().toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                  <h3 className="text-lg font-bold mb-4">Overall Performance</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-emerald-600">{selectedReport.feedback?.overallScore}</span>
                    <span className="text-zinc-400 font-bold mb-2">/ 100</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4">Strengths</h3>
                  <ul className="space-y-2">
                    {selectedReport.feedback?.evaluation?.strengths?.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-900 text-white p-6 rounded-2xl">
                  <h3 className="text-lg font-bold mb-4 text-emerald-400">Coaching Advice</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {selectedReport.feedback?.response?.coachingFeedback}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4">Areas for Growth</h3>
                  <ul className="space-y-2">
                    {selectedReport.feedback?.evaluation?.weaknesses?.map((w: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-zinc-100">
              <h3 className="text-xl font-bold mb-6">Interview History</h3>
              <div className="space-y-6">
                {selectedReport.history?.map((item: any, i: number) => (
                  <div key={i} className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
                        <BrainCircuit size={16} />
                      </div>
                      <p className="text-sm font-bold text-zinc-900">{item.question}</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <User size={16} />
                      </div>
                      <p className="text-sm text-zinc-600 italic">"{item.answer}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </main>

      {/* Advisor Report Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-900 text-white">
                <div>
                  <h3 className="text-xl font-bold">Interview Analysis Report</h3>
                  <p className="text-xs text-white/60 uppercase tracking-widest font-mono">
                    {selectedReport.level} • {selectedReport.mode} • {new Date(selectedReport.timestamp?.seconds * 1000).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <RefreshCw className="rotate-45" size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold mb-1">Overall Score</p>
                    <p className="text-4xl font-black text-emerald-900">{selectedReport.feedback.overallScore}</p>
                  </div>
                  <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold mb-1">Hire Signal</p>
                    <p className="text-4xl font-black text-indigo-900">{Math.round(selectedReport.feedback.evaluation.hireSignalScore * 100)}%</p>
                  </div>
                  <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Readiness</p>
                    <p className="text-xl font-black text-zinc-900">{selectedReport.feedback.evaluation.readinessBand}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-lg border-b pb-2">Recruiter Feedback</h4>
                  <p className="text-zinc-700 leading-relaxed italic">"{selectedReport.feedback.response.recruiterFeedback}"</p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-lg border-b pb-2">Coaching Advice</h4>
                  <p className="text-zinc-700 leading-relaxed">"{selectedReport.feedback.response.coachingFeedback}"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-bold text-emerald-600 flex items-center gap-2">
                      <Award size={18} /> Key Strengths
                    </h4>
                    <ul className="space-y-2">
                      {selectedReport.feedback.evaluation.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                          <div className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-amber-600 flex items-center gap-2">
                      <Target size={18} /> Areas for Growth
                    </h4>
                    <ul className="space-y-2">
                      {selectedReport.feedback.evaluation.weaknesses.map((w: string, i: number) => (
                        <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                          <div className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-lg border-b pb-2">Interview Log</h4>
                  <div className="space-y-6">
                    {selectedReport.history.map((h: any, i: number) => (
                      <div key={i} className="space-y-2">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Q{i+1}: {h.question}</p>
                        <p className="p-4 bg-zinc-50 rounded-xl text-sm text-zinc-700 border border-zinc-100">{h.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
