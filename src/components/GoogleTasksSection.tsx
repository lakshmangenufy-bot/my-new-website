import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Edit3,
  ListTodo,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { Language } from '../data/rehabContent';
import { ScrollReveal } from './AppleStorySections';
import {
  getCachedAccessToken,
  googleSignIn,
  googleSignOut,
  subscribeGoogleAuthState,
} from '../utils/googleTasksAuth';
import {
  createTask,
  deleteTask,
  GoogleTask,
  GoogleTaskList,
  GoogleTasksAuthError,
  listTaskLists,
  listTasks,
  patchTask,
} from '../utils/googleTasksApi';

interface GoogleTasksSectionProps {
  lang: Language;
  onNotify: (msgTa: string, msgEn: string, variant?: 'teal' | 'success' | 'warning' | 'danger') => void;
}

type FilterMode = 'all' | 'pending' | 'completed';

type PendingMutation =
  | {
      type: 'create';
      listId: string;
      listTitle: string;
      title: string;
      notes: string;
      due: string;
    }
  | {
      type: 'toggle';
      listId: string;
      listTitle: string;
      task: GoogleTask;
      nextStatus: 'completed' | 'needsAction';
    }
  | {
      type: 'update';
      listId: string;
      listTitle: string;
      task: GoogleTask;
      title: string;
      notes: string;
      due: string;
    }
  | {
      type: 'delete';
      listId: string;
      listTitle: string;
      task: GoogleTask;
    };

const RECOVERY_TASK_TEMPLATES: Array<{
  id: string;
  title_ta: string;
  title_en: string;
  notes_ta: string;
  notes_en: string;
}> = [
  {
    id: 'physio',
    title_ta: 'காலை உடற்பயிற்சி (15 நிமிடம்)',
    title_en: 'Morning Physiotherapy Routine (15 mins)',
    notes_ta: 'கை, கால் மற்றும் முகப் பயிற்சிகளை மெதுவாக 5 நொடி ஓய்வுடன் செய்யவும்.',
    notes_en: 'Follow gentle hand, leg, and facial movements at a comfortable pace.',
  },
  {
    id: 'refill',
    title_ta: 'மருந்து இருப்பு சரிபார்க்கவும்',
    title_en: 'Check Stroke Prescription Refills',
    notes_ta: 'அடுத்த வாரத்திற்குத் தேவையான இரத்த அழுத்த மற்றும் இதய மருந்துகளைச் சரிபார்க்கவும்.',
    notes_en: 'Verify next week’s blood pressure and prescribed recovery medications.',
  },
  {
    id: 'doctor',
    title_ta: 'நரம்பியல் மருத்துவர் பரிசோதனை',
    title_en: 'Neurology Follow-up Appointment Prep',
    notes_ta: 'தினசரி இரத்த அழுத்தப் பதிவுகள் மற்றும் கேள்விகளை எடுத்துச் செல்லவும்.',
    notes_en: 'Bring weekly recovery progress notes and medication log for review.',
  },
];

function formatGoogleDueDate(isoDate: string | undefined, isTa: boolean): string | null {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(isTa ? 'ta-IN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toInputDateValue(isoDate: string | undefined): string {
  if (!isoDate) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(isoDate);
  return match ? match[1] : '';
}

function GoogleSignInButton({
  onClick,
  disabled,
  subLabel,
}: {
  onClick: () => void;
  disabled?: boolean;
  subLabel?: string;
}) {
  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="gsi-material-button"
        aria-label="Sign in with Google"
      >
        <div className="gsi-material-button-state" />
        <div className="gsi-material-button-content-wrapper">
          <div className="gsi-material-button-icon" aria-hidden="true">
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="block w-full h-full"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          </div>
          <span className="gsi-material-button-contents">Sign in with Google</span>
        </div>
      </button>
      {subLabel && (
        <span className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9]">{subLabel}</span>
      )}
    </div>
  );
}

export const GoogleTasksSection: React.FC<GoogleTasksSectionProps> = ({ lang, onNotify }) => {
  const isTa = lang === 'ta';

  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => getCachedAccessToken());
  const [authLoading, setAuthLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // New task composer state
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDue, setNewDue] = useState('');

  // Inline Edit task dialog state
  const [editingTask, setEditingTask] = useState<GoogleTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDue, setEditDue] = useState('');

  // Mandatory explicit confirmation dialog before any mutating/destructive Google Tasks call
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);

  const [needsConsentRetry, setNeedsConsentRetry] = useState(false);

  const handleTasksError = useCallback(
    (err: unknown, fallbackEn: string, fallbackTa: string) => {
      if (err instanceof GoogleTasksAuthError) {
        setAccessToken(null);
        if (err.reason === 'insufficient_scope') {
          setNeedsConsentRetry(true);
          setErrorMessage(
            isTa
              ? 'Google Tasks அனுமதி தேர்வு செய்யப்படவில்லை. கீழே உள்ள "Sign in with Google" பொத்தானை அழுத்தி Google Tasks அனுமதிப் பெட்டியைத் தேர்ந்தெடுக்கவும்.'
              : 'Google Tasks permission was not selected. Click Sign in with Google below and check the Google Tasks permission box to continue.'
          );
        } else {
          setNeedsConsentRetry(true);
          setErrorMessage(
            isTa
              ? 'உங்கள் Google Tasks அனுமதி நேரம் முடிந்துவிட்டது. கீழே மீண்டும் Sign in with Google செய்யவும்.'
              : 'Your Google Tasks session expired. Please sign in with Google again.'
          );
        }
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : isTa ? fallbackTa : fallbackEn);
    },
    [isTa]
  );

  useEffect(() => {
    const unsubscribe = subscribeGoogleAuthState((nextUser, token) => {
      setUser(nextUser);
      if (!nextUser) {
        setAccessToken(null);
        setTaskLists([]);
        setSelectedListId('');
        setTasks([]);
      } else {
        setAccessToken(token);
      }
    });
    return unsubscribe;
  }, []);

  const loadTasksForList = useCallback(async (token: string, listId: string) => {
    const items = await listTasks(token, listId);
    setTasks(items);
  }, []);

  const loadWorkspaceData = useCallback(
    async (token: string, preferredListId?: string) => {
      setDataLoading(true);
      setErrorMessage(null);
      try {
        const lists = await listTaskLists(token);
        setTaskLists(lists);
        const targetId =
          preferredListId && lists.some((l) => l.id === preferredListId)
            ? preferredListId
            : lists[0]?.id || '@default';
        setSelectedListId(targetId);
        await loadTasksForList(token, targetId);
        setNeedsConsentRetry(false);
      } catch (err) {
        handleTasksError(
          err,
          'Unable to load Google Tasks right now.',
          'Google Tasks தகவல்களை ஏற்ற முடியவில்லை.'
        );
      } finally {
        setDataLoading(false);
      }
    },
    [handleTasksError, loadTasksForList]
  );

  useEffect(() => {
    if (user && accessToken) {
      loadWorkspaceData(accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken]);

  // Escape key closes Confirmation Modal or Edit Modal safely
  useEffect(() => {
    if (!pendingMutation && !editingTask) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pendingMutation && !mutating) {
        setPendingMutation(null);
      } else if (editingTask && !mutating) {
        setEditingTask(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingMutation, editingTask, mutating]);

  const handleSignIn = async () => {
    setAuthLoading(true);
    setErrorMessage(null);
    try {
      const { user: signedInUser, accessToken: token } = await googleSignIn({
        forceConsent: needsConsentRetry || Boolean(user),
      });
      setUser(signedInUser);
      setAccessToken(token);
      setNeedsConsentRetry(false);
      onNotify(
        'Google Tasks கணக்கு இணைக்கப்பட்டது!',
        'Connected to Google Tasks!',
        'success'
      );
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMessage(
          isTa
            ? 'Google உள்நுழைவு ரத்து செய்யப்பட்டது. தயாராக இருக்கும்போது மீண்டும் முயற்சிக்கவும்.'
            : 'Google sign-in popup was closed. Try again whenever you are ready.'
        );
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage(
          isTa
            ? 'உலாவி பாப்-அப் தடுக்கப்பட்டுள்ளது. Google உள்நுழைவுக்காக பாப்-அப்களை அனுமதிக்கவும்.'
            : 'Browser blocked the sign-in popup. Please allow popups for this site and try again.'
        );
      } else {
        setErrorMessage(
          isTa
            ? 'Google Tasks உடன் இணைக்க முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.'
            : 'Could not connect to Google Tasks. Please check your popup permissions and try again.'
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    setErrorMessage(null);
    try {
      await googleSignOut();
      setAccessToken(null);
      setTaskLists([]);
      setSelectedListId('');
      setTasks([]);
      onNotify('Google கணக்கிலிருந்து வெளியேறிவிட்டீர்கள்', 'Signed out of Google Tasks', 'teal');
    } catch {
      setErrorMessage(
        isTa ? 'வெளியேறுவதில் சிக்கல் ஏற்பட்டது.' : 'Failed to sign out cleanly. Please refresh.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSelectList = async (listId: string) => {
    setSelectedListId(listId);
    if (!accessToken) return;
    setDataLoading(true);
    setErrorMessage(null);
    try {
      await loadTasksForList(accessToken, listId);
    } catch (err) {
      handleTasksError(
        err,
        'Unable to load tasks for that list.',
        'பட்டியலை ஏற்ற முடியவில்லை.'
      );
    } finally {
      setDataLoading(false);
    }
  };

  const selectedListTitle = useMemo(() => {
    return (
      taskLists.find((l) => l.id === selectedListId)?.title ||
      (isTa ? 'எனது பணிகள்' : 'My Tasks')
    );
  }, [taskLists, selectedListId, isTa]);

  const filteredTasks = useMemo(() => {
    const clean = tasks.filter((t) => Boolean(t.title && t.title.trim().length > 0));
    if (filterMode === 'pending') return clean.filter((t) => t.status !== 'completed');
    if (filterMode === 'completed') return clean.filter((t) => t.status === 'completed');
    return clean;
  }, [tasks, filterMode]);

  const pendingCount = useMemo(
    () => tasks.filter((t) => t.title?.trim() && t.status !== 'completed').length,
    [tasks]
  );
  const completedCount = useMemo(
    () => tasks.filter((t) => t.title?.trim() && t.status === 'completed').length,
    [tasks]
  );

  const stageCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      setErrorMessage(isTa ? 'பணியின் பெயரை உள்ளிடவும்.' : 'Please enter a task title.');
      return;
    }
    setErrorMessage(null);
    setPendingMutation({
      type: 'create',
      listId: selectedListId || '@default',
      listTitle: selectedListTitle,
      title,
      notes: newNotes.trim(),
      due: newDue,
    });
  };

  const stageTemplateTask = (tpl: (typeof RECOVERY_TASK_TEMPLATES)[number]) => {
    setErrorMessage(null);
    setPendingMutation({
      type: 'create',
      listId: selectedListId || '@default',
      listTitle: selectedListTitle,
      title: isTa ? tpl.title_ta : tpl.title_en,
      notes: isTa ? tpl.notes_ta : tpl.notes_en,
      due: '',
    });
  };

  const openEditModal = (task: GoogleTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditNotes(task.notes || '');
    setEditDue(toInputDateValue(task.due));
  };

  const stageEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const title = editTitle.trim();
    if (!title) return;
    const target = editingTask;
    setEditingTask(null);
    setPendingMutation({
      type: 'update',
      listId: selectedListId || '@default',
      listTitle: selectedListTitle,
      task: target,
      title,
      notes: editNotes.trim(),
      due: editDue,
    });
  };

  const executeConfirmedMutation = async () => {
    if (!pendingMutation || !accessToken) return;
    setMutating(true);
    setErrorMessage(null);

    try {
      if (pendingMutation.type === 'create') {
        await createTask(accessToken, pendingMutation.listId, {
          title: pendingMutation.title,
          notes: pendingMutation.notes,
          due: pendingMutation.due,
        });
        setNewTitle('');
        setNewNotes('');
        setNewDue('');
        onNotify(
          'புதிய பணி Google Tasks-இல் சேர்க்கப்பட்டது!',
          'Task added to Google Tasks!',
          'success'
        );
      } else if (pendingMutation.type === 'toggle') {
        await patchTask(accessToken, pendingMutation.listId, pendingMutation.task.id, {
          status: pendingMutation.nextStatus,
        });
        onNotify(
          pendingMutation.nextStatus === 'completed'
            ? 'பணி முடிந்ததாகக் குறிக்கப்பட்டது!'
            : 'பணி நிலுவைக்கு மாற்றப்பட்டது.',
          pendingMutation.nextStatus === 'completed'
            ? 'Task marked as completed!'
            : 'Task moved back to pending.',
          'success'
        );
      } else if (pendingMutation.type === 'update') {
        await patchTask(accessToken, pendingMutation.listId, pendingMutation.task.id, {
          title: pendingMutation.title,
          notes: pendingMutation.notes,
          due: pendingMutation.due || null,
        });
        onNotify('பணி புதுப்பிக்கப்பட்டது!', 'Task updated in Google Tasks!', 'success');
      } else if (pendingMutation.type === 'delete') {
        await deleteTask(accessToken, pendingMutation.listId, pendingMutation.task.id);
        onNotify('பணி Google Tasks-இலிருந்து நீக்கப்பட்டது.', 'Task deleted from Google Tasks.', 'warning');
      }

      const activeList = pendingMutation.listId;
      setPendingMutation(null);
      await loadTasksForList(accessToken, activeList);
    } catch (err) {
      setPendingMutation(null);
      handleTasksError(
        err,
        'Unable to apply that change to Google Tasks.',
        'Google Tasks மாற்றத்தைச் செயல்படுத்த முடியவில்லை.'
      );
    } finally {
      setMutating(false);
    }
  };

  return (
    <section
      id="tasks-section"
      className="w-full bg-[#F2F7F6] dark:bg-[#0B1220] apple-section-pad"
    >
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-10">
        <ScrollReveal className="max-w-3xl space-y-4 min-w-0">
          <h2 className="apple-section-title text-[#0F1F2E] dark:text-white headline-balance tamil-safe">
            {isTa ? (
              <>
                உங்கள் Google Tasks உடன்{' '}
                <span className="apple-headline-gradient">தினசரிப் பணிகள்.</span>
              </>
            ) : (
              <>
                Recovery checklists,{' '}
                <span className="apple-headline-gradient">synced with Google Tasks.</span>
              </>
            )}
          </h2>
          <p className="text-[1.25rem] font-normal text-[#3A4753] dark:text-[#D3DFE9] leading-[1.6] min-w-0 [overflow-wrap:anywhere]">
            {isTa
              ? 'மருத்துவர் சந்திப்புகள், மருந்து வாங்குதல் மற்றும் உடற்பயிற்சி இலக்குகளை உங்கள் Google Tasks கணக்கில் பாதுகாப்பாகச் சேமித்துப் பராமரிக்கவும்.'
              : 'Organize follow-up appointments, medication refills, and physiotherapy goals directly in your personal Google Tasks.'}
          </p>
        </ScrollReveal>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="clinical-card hc-card p-5 border-2 border-red-600/50 bg-red-50 dark:bg-red-950/30 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[#C81E1E] dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[1.125rem] font-medium text-[#0F1F2E] dark:text-white leading-snug">
                {errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label={isTa ? 'எச்சரிக்கையை மூடு' : 'Dismiss error'}
              className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#0F1F2E] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Unauthenticated OR Missing In-Memory Access Token View */}
        {!user || !accessToken ? (
          <div className="clinical-card hc-card p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5 min-w-0">
              <div className="inline-flex items-center gap-2.5 text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                <ListTodo className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>
                  {user
                    ? isTa
                      ? 'பாதுகாப்பு உறுதிப்படுத்தல் தேவை'
                      : 'Reconnect Google Tasks Session'
                    : isTa
                    ? 'Google Tasks இணைப்பு'
                    : 'Connect Google Tasks'}
                </span>
              </div>

              <h3 className="text-[1.625rem] sm:text-[1.875rem] font-semibold text-[#0F1F2E] dark:text-white leading-tight">
                {user
                  ? isTa
                    ? `${user.displayName || user.email} கணக்கிற்கு மீண்டும் இணைக்கவும்`
                    : `Reconnect ${user.displayName || user.email}`
                  : isTa
                  ? 'குடும்பமும் நோயாளியும் எளிதாகப் பார்க்கும் பணிப் பட்டியல்'
                  : 'Keep appointments and recovery tasks synced everywhere'}
              </h3>

              <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] leading-relaxed">
                {user
                  ? isTa
                    ? 'பாதுகாப்புக்காக உங்கள் Google Tasks அனுமதி குறியீடு உலாவியில் நிரந்தரமாகச் சேமிக்கப்படுவதில்லை. உங்கள் பணிகளைக் காண கீழே உள்ள பொத்தானை அழுத்தவும்.'
                    : 'For your privacy, OAuth access tokens stay strictly in temporary memory. Click Sign in with Google below to unlock your tasks.'
                  : isTa
                  ? 'உங்கள் Google கணக்கில் உள்நுழைந்து, மருந்து நினைவூட்டல்கள் மற்றும் நரம்பியல் மருத்துவர் சந்திப்புகளை நேரடியாக Google Tasks-இல் சேர்க்கவும்; ஒவ்வொரு மாற்றத்திற்கும் முன்பாக உறுதிப்படுத்தல் கேட்கப்படும்.'
                  : 'Sign in securely with Google to view, add, complete, or manage tasks. Every task creation, update, or deletion always asks for your confirmation first.'}
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-4">
                <GoogleSignInButton
                  onClick={handleSignIn}
                  disabled={authLoading}
                  subLabel={
                    authLoading
                      ? isTa
                        ? 'Google உள்நுழைவு திறக்கப்படுகிறது...'
                        : 'Opening Google sign-in...'
                      : undefined
                  }
                />
                {user && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={authLoading}
                    className="apple-pill-btn min-h-[56px] px-5 py-2 border-2 border-[#0F1F2E]/20 dark:border-white/25 text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-5 h-5" aria-hidden="true" />
                    <span>{isTa ? 'வெளியேறு' : 'Sign out'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-3xl bg-[#F2F7F6] dark:bg-[#0B1220] p-6 space-y-4 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5 text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
                <ShieldCheck className="w-6 h-6 text-[#1F6F63] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
                <span>{isTa ? 'எதை நிர்வகிக்கலாம்' : 'What You Can Manage'}</span>
              </div>
              <ul className="space-y-3 text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF] shrink-0 mt-1" aria-hidden="true" />
                  <span>
                    {isTa
                      ? 'உங்கள் அனைத்து Google Task பட்டியல்களையும் பார்க்கலாம்'
                      : 'View all your Google Task lists and deadlines'}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF] shrink-0 mt-1" aria-hidden="true" />
                  <span>
                    {isTa
                      ? 'ஒரு கிளிக்கில் மறுவாழ்வுப் பணிகளைத் தயார் செய்யலாம்'
                      : 'Add custom tasks or stroke recovery templates'}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF] shrink-0 mt-1" aria-hidden="true" />
                  <span>
                    {isTa
                      ? 'சேர்க்கும், மாற்றும் மற்றும் நீக்கும் முன் உறுதிப்படுத்தல் திரை'
                      : 'Clear confirmation prompt before every change'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Authenticated Workspace */
          <div className="space-y-8">
            {/* Account + List Toolbar */}
            <div className="clinical-card hc-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google account avatar'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#1F6F63] dark:border-[#2DD4BF] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#1F6F63] text-white text-xl font-semibold flex items-center justify-center shrink-0">
                    {(user.displayName || user.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white truncate">
                    {user.displayName || (isTa ? 'Google பயனர்' : 'Google Account')}
                  </div>
                  <div className="text-[1rem] text-[#3A4753] dark:text-[#D3DFE9] truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => accessToken && loadWorkspaceData(accessToken, selectedListId)}
                  disabled={dataLoading}
                  className="apple-pill-btn min-h-[56px] px-5 py-2.5 bg-[#E3F1ED] dark:bg-[#112A27] hover:bg-[#D1EAE3] dark:hover:bg-[#183B36] text-[#1F6F63] dark:text-[#2DD4BF] text-[1.125rem] font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-5 h-5 ${dataLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>{isTa ? 'புதுப்பி' : 'Refresh'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="apple-pill-btn min-h-[56px] px-5 py-2.5 border-2 border-[#0F1F2E]/20 dark:border-white/25 hover:bg-black/5 dark:hover:bg-white/10 text-[#0F1F2E] dark:text-white text-[1.125rem] font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-5 h-5" aria-hidden="true" />
                  <span>{isTa ? 'வெளியேறு' : 'Sign out'}</span>
                </button>
              </div>
            </div>

            {/* Task List Picker & Filter Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Composer + Recovery Templates */}
              <div className="lg:col-span-5 space-y-6">
                <form
                  onSubmit={stageCreateTask}
                  className="clinical-card hc-card p-6 sm:p-8 space-y-5"
                >
                  <div className="flex items-center gap-2.5 text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white">
                    <Plus className="w-6 h-6 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
                    <span>{isTa ? 'புதிய பணி சேர்க்கவும்' : 'Add Recovery Task'}</span>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="gtask-title-input"
                      className="block text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white"
                    >
                      {isTa ? 'பணியின் பெயர்' : 'Task Title'}
                    </label>
                    <input
                      id="gtask-title-input"
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      maxLength={140}
                      placeholder={
                        isTa
                          ? 'எ.கா. மாலை இரத்த அழுத்தப் பரிசோதனை'
                          : 'e.g. Evening blood pressure check'
                      }
                      className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-[var(--border-subtle)] bg-[#FBFBFD] dark:bg-[#0B1220] text-[1.125rem] text-[#0F1F2E] dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="gtask-due-input"
                      className="block text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white"
                    >
                      {isTa ? 'கடைசித் தேதி (விருப்பம்)' : 'Due Date (Optional)'}
                    </label>
                    <input
                      id="gtask-due-input"
                      type="date"
                      value={newDue}
                      onChange={(e) => setNewDue(e.target.value)}
                      className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-[var(--border-subtle)] bg-[#FBFBFD] dark:bg-[#0B1220] text-[1.125rem] text-[#0F1F2E] dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="gtask-notes-input"
                      className="block text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white"
                    >
                      {isTa ? 'குறிப்புகள் (விருப்பம்)' : 'Notes (Optional)'}
                    </label>
                    <textarea
                      id="gtask-notes-input"
                      rows={2}
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      maxLength={350}
                      placeholder={
                        isTa
                          ? 'மருத்துவர் அல்லது பராமரிப்பாளர் குறிப்பு...'
                          : 'Doctor or caregiver reminder details...'
                      }
                      className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--border-subtle)] bg-[#FBFBFD] dark:bg-[#0B1220] text-[1.125rem] text-[#0F1F2E] dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={mutating || dataLoading}
                    className="apple-pill-btn w-full min-h-[56px] px-6 py-3 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold flex items-center justify-center gap-2 cursor-pointer hc-primary-btn disabled:opacity-60"
                  >
                    <Plus className="w-5 h-5" aria-hidden="true" />
                    <span>{isTa ? 'பணியைச் சேர்க்கத் தயார் செய்' : 'Review & Add Task'}</span>
                  </button>
                </form>

                {/* Quick StrokeCare Templates */}
                <div className="clinical-card hc-card p-6 sm:p-8 space-y-4">
                  <div className="flex items-center gap-2 text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white">
                    <ClipboardList className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF]" aria-hidden="true" />
                    <span>{isTa ? 'உடனடி மறுவாழ்வு மாதிரிகள்' : 'Quick Care Templates'}</span>
                  </div>
                  <div className="space-y-3">
                    {RECOVERY_TASK_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => stageTemplateTask(tpl)}
                        disabled={mutating}
                        className="w-full min-h-[56px] px-4 py-3 rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220] hover:bg-[#E3F1ED] dark:hover:bg-[#112A27] text-left flex items-center justify-between gap-3 cursor-pointer border border-[var(--border-subtle)]"
                      >
                        <span className="text-[1.125rem] font-medium text-[#0F1F2E] dark:text-white">
                          {isTa ? tpl.title_ta : tpl.title_en}
                        </span>
                        <Plus className="w-5 h-5 text-[#1F6F63] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Task Lists & Items */}
              <div className="lg:col-span-7 clinical-card hc-card p-6 sm:p-8 space-y-6">
                {/* List Selector + Counts */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <label
                      htmlFor="gtask-list-select"
                      className="block text-[1rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9]"
                    >
                      {isTa ? 'Google Task பட்டியல்' : 'Task List'}
                    </label>
                    <select
                      id="gtask-list-select"
                      value={selectedListId}
                      onChange={(e) => handleSelectList(e.target.value)}
                      disabled={dataLoading || taskLists.length === 0}
                      className="w-full min-h-[56px] px-4 py-2.5 rounded-2xl border-2 border-[var(--border-subtle)] bg-[#FBFBFD] dark:bg-[#0B1220] text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white cursor-pointer"
                    >
                      {taskLists.length === 0 ? (
                        <option value="@default">{isTa ? 'எனது பணிகள்' : 'My Tasks'}</option>
                      ) : (
                        taskLists.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.title}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Filter Segmented Control */}
                  <div
                    role="group"
                    aria-label={isTa ? 'பணி வடிகட்டி' : 'Filter tasks'}
                    className="inline-flex flex-wrap items-center gap-2 pt-2 sm:pt-6"
                  >
                    {(
                      [
                        { id: 'all', ta: `அனைத்தும் (${pendingCount + completedCount})`, en: `All (${pendingCount + completedCount})` },
                        { id: 'pending', ta: `நிலுவை (${pendingCount})`, en: `Pending (${pendingCount})` },
                        { id: 'completed', ta: `முடிந்தது (${completedCount})`, en: `Done (${completedCount})` },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilterMode(f.id)}
                        aria-pressed={filterMode === f.id}
                        className={`min-h-[48px] px-4 py-2 rounded-full text-[1rem] font-semibold cursor-pointer ${
                          filterMode === f.id
                            ? 'bg-[#1F6F63] text-white hc-primary-btn'
                            : 'bg-[#F2F7F6] dark:bg-[#0B1220] text-[#0F1F2E] dark:text-slate-200 hover:bg-[#E3F1ED]'
                        }`}
                      >
                        {isTa ? f.ta : f.en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tasks Feed */}
                {dataLoading ? (
                  <div className="py-12 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#1F6F63] dark:text-[#2DD4BF] mx-auto" aria-hidden="true" />
                    <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9]">
                      {isTa ? 'Google Tasks ஏற்றப்படுகிறது...' : 'Loading your Google Tasks...'}
                    </p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="py-12 text-center space-y-2 rounded-3xl bg-[#F2F7F6] dark:bg-[#0B1220] p-6">
                    <ListTodo className="w-10 h-10 text-[#1F6F63] dark:text-[#2DD4BF] mx-auto" aria-hidden="true" />
                    <p className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white">
                      {isTa ? 'இந்தப் பட்டியலில் பணிகள் இல்லை' : 'No tasks in this view'}
                    </p>
                    <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9]">
                      {isTa
                        ? 'இடதுபுறத்தில் உள்ள படிவத்தைப் பயன்படுத்தி புதிய மறுவாழ்வுப் பணியைச் சேர்க்கலாம்.'
                        : 'Use the form or quick templates to add a recovery task.'}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {filteredTasks.map((task) => {
                      const isDone = task.status === 'completed';
                      const dueLabel = formatGoogleDueDate(task.due, isTa);
                      return (
                        <li
                          key={task.id}
                          className={`rounded-3xl p-5 border-2 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                            isDone
                              ? 'bg-[#F2F7F6]/70 dark:bg-[#0B1220]/70 border-[#1F6F63]/25 dark:border-[#2DD4BF]/25'
                              : 'bg-[#FBFBFD] dark:bg-[#0B1220] border-[var(--border-subtle)]'
                          }`}
                        >
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() =>
                                setPendingMutation({
                                  type: 'toggle',
                                  listId: selectedListId || '@default',
                                  listTitle: selectedListTitle,
                                  task,
                                  nextStatus: isDone ? 'needsAction' : 'completed',
                                })
                              }
                              aria-label={
                                isDone
                                  ? isTa
                                    ? `"${task.title}" நிலுவைக்கு மாற்று`
                                    : `Mark "${task.title}" incomplete`
                                  : isTa
                                  ? `"${task.title}" முடிந்ததாகக் குறி`
                                  : `Mark "${task.title}" complete`
                              }
                              aria-pressed={isDone}
                              className={`min-w-[56px] min-h-[56px] rounded-2xl border-2 flex items-center justify-center shrink-0 cursor-pointer ${
                                isDone
                                  ? 'bg-[#1F6F63] border-[#1F6F63] text-white hc-primary-btn'
                                  : 'bg-white dark:bg-[#111A2B] border-[#1F6F63]/50 dark:border-[#2DD4BF]/50 text-transparent hover:border-[#1F6F63]'
                              }`}
                            >
                              <Check className="w-6 h-6" aria-hidden="true" />
                            </button>

                            <div className="min-w-0 space-y-1.5 pt-1">
                              <h4
                                className={`text-[1.25rem] font-semibold [overflow-wrap:anywhere] ${
                                  isDone
                                    ? 'line-through text-[#3A4753] dark:text-slate-400'
                                    : 'text-[#0F1F2E] dark:text-white'
                                }`}
                              >
                                {task.title}
                              </h4>

                              {task.notes && (
                                <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] [overflow-wrap:anywhere]">
                                  {task.notes}
                                </p>
                              )}

                              {dueLabel && (
                                <div className="inline-flex items-center gap-2 text-[1rem] font-medium text-[#1F6F63] dark:text-[#2DD4BF]">
                                  <Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />
                                  <span>
                                    {isTa ? 'தேதி: ' : 'Due: '}
                                    {dueLabel}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                            <button
                              type="button"
                              onClick={() => openEditModal(task)}
                              aria-label={
                                isTa ? `"${task.title}" திருத்து` : `Edit "${task.title}"`
                              }
                              className="min-w-[56px] min-h-[56px] rounded-2xl bg-[#E3F1ED] dark:bg-[#112A27] text-[#1F6F63] dark:text-[#2DD4BF] hover:bg-[#D1EAE3] flex items-center justify-center cursor-pointer"
                            >
                              <Edit3 className="w-5 h-5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingMutation({
                                  type: 'delete',
                                  listId: selectedListId || '@default',
                                  listTitle: selectedListTitle,
                                  task,
                                })
                              }
                              aria-label={
                                isTa ? `"${task.title}" நீக்கு` : `Delete "${task.title}"`
                              }
                              className="min-w-[56px] min-h-[56px] rounded-2xl bg-red-100 dark:bg-red-950/50 text-[#C81E1E] dark:text-red-300 hover:bg-red-200 flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-5 h-5" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-gtask-heading"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingTask(null);
          }}
        >
          <form
            onSubmit={stageEditTask}
            className="clinical-card hc-card w-full max-w-lg p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center justify-between gap-4">
              <h3
                id="edit-gtask-heading"
                className="text-[1.5rem] font-semibold text-[#0F1F2E] dark:text-white"
              >
                {isTa ? 'பணியைத் திருத்தவும்' : 'Edit Google Task'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                aria-label={isTa ? 'மூடு' : 'Close'}
                className="w-12 h-12 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] flex items-center justify-center text-[#0F1F2E] dark:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="edit-gtask-title"
                className="block text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white"
              >
                {isTa ? 'பணியின் பெயர்' : 'Task Title'}
              </label>
              <input
                id="edit-gtask-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                maxLength={140}
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-[var(--border-subtle)] bg-[#FBFBFD] dark:bg-[#0B1220] text-[1.125rem] text-[#0F1F2E] dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="edit-gtask-due"
                className="block text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white"
              >
                {isTa ? 'தேதி' : 'Due Date'}
              </label>
              <input
                id="edit-gtask-due"
                type="date"
                value={editDue}
                onChange={(e) => setEditDue(e.target.value)}
                className="w-full min-h-[56px] px-4 py-3 rounded-2xl border-2 border-[var(--border-subtle)] bg-[#FBFBFD] dark:bg-[#0B1220] text-[1.125rem] text-[#0F1F2E] dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="edit-gtask-notes"
                className="block text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white"
              >
                {isTa ? 'குறிப்புகள்' : 'Notes'}
              </label>
              <textarea
                id="edit-gtask-notes"
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                maxLength={350}
                className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--border-subtle)] bg-[#FBFBFD] dark:bg-[#0B1220] text-[1.125rem] text-[#0F1F2E] dark:text-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="apple-pill-btn flex-1 min-h-[56px] px-5 py-3 border-2 border-[#0F1F2E]/20 dark:border-white/25 text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white cursor-pointer"
              >
                {isTa ? 'ரத்து செய்' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="apple-pill-btn flex-1 min-h-[56px] px-5 py-3 bg-[#1F6F63] hover:bg-[#17574D] text-white text-[1.125rem] font-semibold cursor-pointer hc-primary-btn"
              >
                {isTa ? 'தொடர்ந்து உறுதிப்படுத்து' : 'Continue to Confirm'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mandatory Confirmation Dialog for Every Mutating / Destructive Action */}
      {pendingMutation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-gtask-heading"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !mutating) setPendingMutation(null);
          }}
        >
          <div className="clinical-card hc-card w-full max-w-lg p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[1rem] font-semibold text-[#1F6F63] dark:text-[#2DD4BF]">
                  {isTa ? 'Google Tasks மாற்ற உறுதிப்படுத்தல்' : 'Confirm Google Tasks Action'}
                </span>
                <h3
                  id="confirm-gtask-heading"
                  className="text-[1.5rem] font-semibold text-[#0F1F2E] dark:text-white"
                >
                  {pendingMutation.type === 'create'
                    ? isTa
                      ? 'புதிய பணியைச் சேர்க்கவா?'
                      : 'Add task to Google Tasks?'
                    : pendingMutation.type === 'toggle'
                    ? pendingMutation.nextStatus === 'completed'
                      ? isTa
                        ? 'பணியை முடிந்ததாகக் குறிக்கவா?'
                        : 'Mark task as completed?'
                      : isTa
                      ? 'பணியை மீண்டும் நிலுவைக்கு மாற்றவா?'
                      : 'Reopen this task?'
                    : pendingMutation.type === 'update'
                    ? isTa
                      ? 'பணி மாற்றங்களைச் சேமிக்கவா?'
                      : 'Save changes to this task?'
                    : isTa
                    ? 'இந்தப் பணியை நிரந்தரமாக நீக்கவா?'
                    : 'Delete this task from Google Tasks?'}
                </h3>
              </div>

              <button
                type="button"
                disabled={mutating}
                onClick={() => setPendingMutation(null)}
                aria-label={isTa ? 'மூடு' : 'Close'}
                className="w-12 h-12 rounded-full bg-[#F2F7F6] dark:bg-[#0B1220] flex items-center justify-center text-[#0F1F2E] dark:text-white cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#F2F7F6] dark:bg-[#0B1220] p-5 space-y-2 border border-[var(--border-subtle)]">
              <p className="text-[1rem] font-semibold text-[#3A4753] dark:text-[#D3DFE9]">
                {isTa ? 'பட்டியல்: ' : 'List: '}
                <span className="text-[#0F1F2E] dark:text-white">{pendingMutation.listTitle}</span>
              </p>
              <p className="text-[1.25rem] font-semibold text-[#0F1F2E] dark:text-white [overflow-wrap:anywhere]">
                {pendingMutation.type === 'create' || pendingMutation.type === 'update'
                  ? pendingMutation.title
                  : pendingMutation.task.title}
              </p>
              {(pendingMutation.type === 'create' || pendingMutation.type === 'update') &&
                pendingMutation.notes && (
                  <p className="text-[1.125rem] text-[#3A4753] dark:text-[#D3DFE9] [overflow-wrap:anywhere]">
                    {pendingMutation.notes}
                  </p>
                )}
              {pendingMutation.type === 'delete' && (
                <p className="text-[1rem] font-semibold text-[#C81E1E] dark:text-red-400">
                  {isTa
                    ? 'இந்தப் பணி உங்கள் Google Tasks கணக்கிலிருந்து நீக்கப்படும்.'
                    : 'This will permanently remove the task from your Google Tasks account.'}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={mutating}
                onClick={() => setPendingMutation(null)}
                className="apple-pill-btn flex-1 min-h-[56px] px-5 py-3 border-2 border-[#0F1F2E]/20 dark:border-white/25 text-[1.125rem] font-semibold text-[#0F1F2E] dark:text-white cursor-pointer disabled:opacity-50"
              >
                {isTa ? 'ரத்து செய்' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={mutating}
                onClick={executeConfirmedMutation}
                className={`apple-pill-btn flex-1 min-h-[56px] px-5 py-3 text-white text-[1.125rem] font-semibold cursor-pointer disabled:opacity-60 ${
                  pendingMutation.type === 'delete'
                    ? 'bg-[#C81E1E] hover:bg-[#A61717]'
                    : 'bg-[#1F6F63] hover:bg-[#17574D] hc-primary-btn'
                }`}
              >
                {mutating
                  ? isTa
                    ? 'செயல்படுகிறது...'
                    : 'Applying...'
                  : pendingMutation.type === 'delete'
                  ? isTa
                    ? 'ஆம், நீக்குக'
                    : 'Yes, Delete Task'
                  : isTa
                  ? 'ஆம், உறுதிப்படுத்து'
                  : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
