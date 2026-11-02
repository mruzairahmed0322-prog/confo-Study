import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/contexts/ToastContext';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    marks: number;
}

interface QuizData {
    id: number;
    title: string;
    description: string | null;
    duration_minutes: number;
    total_marks: number;
    has_attempted: boolean;
    attempt_score: number | null;
    questions: QuizQuestion[];
}

interface AttemptResult {
    score: number;
    total_marks: number;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function QuizAttemptPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<AttemptResult | null>(null);
    const submittedRef = useRef(false);

    const { data: quiz, isLoading, error } = useQuery<QuizData>({
        queryKey: ['quiz', id],
        queryFn: () => apiGet(`/quizzes/${id}`),
        enabled: !!id,
    });

    const submitMutation = useMutation({
        mutationFn: () => apiPost<AttemptResult>(`/quizzes/${id}/attempt`, { answers }),
        onSuccess: (data) => {
            submittedRef.current = true;
            setSubmitted(true);
            setResult(data);
            toast('Quiz submitted successfully');
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast(msg ?? 'Submit failed', 'error');
        },
    });

    useEffect(() => {
        if (quiz && !quiz.has_attempted && timeLeft === null) {
            setTimeLeft(quiz.duration_minutes * 60);
        }
    }, [quiz, timeLeft]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || submitted || quiz?.has_attempted) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(timer);
                    if (!submittedRef.current) {
                        submitMutation.mutate();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, submitted, quiz?.has_attempted, submitMutation]);

    const selectAnswer = (questionId: number, option: string) => {
        if (submitted || quiz?.has_attempted) return;
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    };

    if (isLoading) {
        return <div className="p-8 text-center text-stone-400">Loading quiz...</div>;
    }

    if (error || !quiz) {
        return (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
                <AlertCircle className="h-12 w-12 text-rose-500" />
                <p className="text-stone-600">Quiz not found or access denied</p>
                <Button variant="secondary" onClick={() => navigate('/app/quizzes')}>Back to Quizzes</Button>
            </div>
        );
    }

    if (quiz.has_attempted || submitted) {
        const score = result?.score ?? quiz.attempt_score ?? 0;
        const total = result?.total_marks ?? quiz.total_marks;
        return (
            <div className="mx-auto max-w-lg space-y-6 py-8 text-center">
                <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
                <h2 className="text-2xl font-bold text-stone-900 dark:text-white">Quiz Completed</h2>
                <p className="text-stone-500">You have already submitted this quiz.</p>
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-6">
                    <p className="text-sm text-stone-500">Your Score</p>
                    <p className="text-4xl font-bold text-emerald-600">{score} / {total}</p>
                </div>
                <Button onClick={() => navigate('/app/quizzes')}>Back to Quizzes</Button>
            </div>
        );
    }

    const allAnswered = quiz.questions.every(q => answers[q.id]);

    return (
        <div className="space-y-6">
            <PageHeader
                title={quiz.title}
                subtitle={quiz.description ?? 'Answer all questions before time runs out'}
                actions={
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className={`font-mono text-sm font-bold ${timeLeft !== null && timeLeft < 60 ? 'text-rose-600' : 'text-amber-700 dark:text-amber-400'}`}>
                            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                        </span>
                    </div>
                }
            />

            <div className="space-y-4">
                {quiz.questions.map((q, idx) => (
                    <Card key={q.id}>
                        <CardBody>
                            <p className="mb-4 font-medium text-stone-900 dark:text-white">
                                <span className="mr-2 text-emerald-600">Q{idx + 1}.</span>
                                {q.question}
                                <span className="ml-2 text-xs text-stone-400">({q.marks} marks)</span>
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {(q.options ?? []).map((opt, oi) => (
                                    <button
                                        key={oi}
                                        type="button"
                                        onClick={() => selectAnswer(q.id, opt)}
                                        className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                                            answers[q.id] === opt
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                                                : 'border-stone-200 hover:border-emerald-300 dark:border-stone-700 dark:hover:border-emerald-700'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => navigate('/app/quizzes')}>Cancel</Button>
                <Button
                    onClick={() => submitMutation.mutate()}
                    loading={submitMutation.isPending}
                    disabled={!allAnswered}
                >
                    Submit Quiz
                </Button>
            </div>
        </div>
    );
}
