import { clearCachedAccessToken } from './googleTasksAuth';

const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
  position?: string;
}

export type GoogleTasksAuthReason = 'expired' | 'insufficient_scope';

export class GoogleTasksAuthError extends Error {
  reason: GoogleTasksAuthReason;
  constructor(
    message = 'Google Tasks authorization expired. Please sign in again.',
    reason: GoogleTasksAuthReason = 'expired'
  ) {
    super(message);
    this.name = 'GoogleTasksAuthError';
    this.reason = reason;
  }
}

export class GoogleTasksApiError extends Error {
  status: number;
  reason?: string;
  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.name = 'GoogleTasksApiError';
    this.status = status;
    this.reason = reason;
  }
}

async function tasksRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${TASKS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (res.status === 401) {
    clearCachedAccessToken();
    throw new GoogleTasksAuthError(
      'Your Google Tasks session expired. Please sign in with Google again.',
      'expired'
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errObj =
      data && typeof data === 'object' && 'error' in data ? (data as { error?: Record<string, unknown> }).error : null;
    const apiMessage =
      errObj && typeof errObj.message === 'string'
        ? errObj.message
        : `Google Tasks request failed (${res.status})`;

    const details = Array.isArray(errObj?.details) ? errObj.details : [];
    const detailReason =
      details[0] && typeof details[0] === 'object' && 'reason' in details[0]
        ? String((details[0] as { reason?: unknown }).reason || '')
        : '';

    const errorsArr = Array.isArray(errObj?.errors) ? errObj.errors : [];
    const firstErrorReason =
      errorsArr[0] && typeof errorsArr[0] === 'object' && 'reason' in errorsArr[0]
        ? String((errorsArr[0] as { reason?: unknown }).reason || '')
        : '';

    const reason = detailReason || firstErrorReason;

    if (
      res.status === 403 &&
      (reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' ||
        reason === 'insufficientPermissions' ||
        /insufficient.*scope|insufficientPermissions/i.test(apiMessage))
    ) {
      clearCachedAccessToken();
      throw new GoogleTasksAuthError(apiMessage, 'insufficient_scope');
    }

    throw new GoogleTasksApiError(apiMessage, res.status, reason || undefined);
  }

  return data as T;
}

export async function listTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const data = await tasksRequest<{ items?: GoogleTaskList[] }>(
    accessToken,
    '/users/@me/lists?maxResults=20'
  );
  return Array.isArray(data?.items) ? data.items : [];
}

export async function listTasks(
  accessToken: string,
  taskListId: string
): Promise<GoogleTask[]> {
  const encodedListId = encodeURIComponent(taskListId);
  const data = await tasksRequest<{ items?: GoogleTask[] }>(
    accessToken,
    `/lists/${encodedListId}/tasks?showCompleted=true&showHidden=false&maxResults=100`
  );
  return Array.isArray(data?.items) ? data.items : [];
}

export async function createTask(
  accessToken: string,
  taskListId: string,
  payload: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> {
  const encodedListId = encodeURIComponent(taskListId);
  const body: Record<string, string> = {
    title: payload.title.trim(),
  };
  if (payload.notes && payload.notes.trim()) {
    body.notes = payload.notes.trim();
  }
  if (payload.due && /^\d{4}-\d{2}-\d{2}$/.test(payload.due)) {
    body.due = `${payload.due}T00:00:00.000Z`;
  }

  return tasksRequest<GoogleTask>(accessToken, `/lists/${encodedListId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function patchTask(
  accessToken: string,
  taskListId: string,
  taskId: string,
  patch: {
    title?: string;
    notes?: string;
    status?: 'needsAction' | 'completed';
    due?: string | null;
  }
): Promise<GoogleTask> {
  const encodedListId = encodeURIComponent(taskListId);
  const encodedTaskId = encodeURIComponent(taskId);
  const body: Record<string, string | null> = {};

  if (patch.title !== undefined) {
    body.title = patch.title.trim();
  }
  if (patch.notes !== undefined) {
    body.notes = patch.notes.trim();
  }
  if (patch.status !== undefined) {
    body.status = patch.status;
  }
  if (patch.due !== undefined) {
    body.due =
      patch.due && /^\d{4}-\d{2}-\d{2}$/.test(patch.due)
        ? `${patch.due}T00:00:00.000Z`
        : null;
  }

  return tasksRequest<GoogleTask>(
    accessToken,
    `/lists/${encodedListId}/tasks/${encodedTaskId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
}

export async function deleteTask(
  accessToken: string,
  taskListId: string,
  taskId: string
): Promise<void> {
  const encodedListId = encodeURIComponent(taskListId);
  const encodedTaskId = encodeURIComponent(taskId);
  await tasksRequest<void>(
    accessToken,
    `/lists/${encodedListId}/tasks/${encodedTaskId}`,
    {
      method: 'DELETE',
    }
  );
}
