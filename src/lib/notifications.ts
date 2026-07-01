import { db } from './db';
import { notifications } from './db/schema';

type NotificationType = 'task_assigned' | 'comment_added' | 'file_uploaded' | 'status_changed' | 'member_invited' | 'invoice_sent' | 'client_action_completed' | 'client_action_created';

export async function createNotification({
  userId,
  projectId,
  type,
  title,
  body,
}: {
  userId: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  body?: string;
}) {
  await db.insert(notifications).values({
    userId,
    projectId: projectId ?? null,
    type,
    title,
    body: body ?? null,
  });
}

export async function createBulkNotifications(
  userIds: string[],
  params: {
    projectId?: string;
    type: NotificationType;
    title: string;
    body?: string;
  },
) {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      projectId: params.projectId ?? null,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
    })),
  );
}
