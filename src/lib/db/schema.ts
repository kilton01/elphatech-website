import {
  pgTable, uuid, text, timestamp, boolean, integer, jsonb, numeric,
  index, uniqueIndex, pgEnum,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'client']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'review', 'done']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  role: roleEnum('role').default('client').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (t) => [uniqueIndex('accounts_provider_provider_account_id_idx').on(t.provider, t.providerAccountId)]);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => [index('sessions_user_id_idx').on(t.userId)]);

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => [uniqueIndex('verification_tokens_identifier_token_idx').on(t.identifier, t.token)]);

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [index('projects_owner_id_idx').on(t.ownerId)]);

export const projectMembers = pgTable('project_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum('role').default('client').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [uniqueIndex('project_members_project_user_idx').on(t.projectId, t.userId)]);

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('todo').notNull(),
  priority: taskPriorityEnum('priority').default('medium').notNull(),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  dueDate: timestamp('due_date', { mode: 'date' }),
  position: integer('position').default(0).notNull(),
  phase: integer('phase').default(1).notNull(),
  milestoneId: uuid('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
  signedOffAt: timestamp('signed_off_at', { mode: 'date' }),
  signedOffBy: uuid('signed_off_by').references(() => users.id, { onDelete: 'set null' }),
  signedOffByName: text('signed_off_by_name'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('tasks_project_id_idx').on(t.projectId),
  index('tasks_assignee_id_idx').on(t.assigneeId),
  index('tasks_project_status_idx').on(t.projectId, t.status),
  index('tasks_milestone_id_idx').on(t.milestoneId),
  index('tasks_due_date_idx').on(t.dueDate),
]);

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  uploadedById: uuid('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  key: text('key').notNull(),
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('files_project_id_idx').on(t.projectId),
  index('files_uploaded_by_id_idx').on(t.uploadedById),
]);

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('comments_task_id_idx').on(t.taskId),
  index('comments_project_id_idx').on(t.projectId),
  index('comments_author_id_idx').on(t.authorId),
]);

export const milestones = pgTable('milestones', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }).notNull(),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [index('milestones_project_id_idx').on(t.projectId)]);

export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [index('activities_project_id_idx').on(t.projectId)]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'task_assigned',
  'comment_added',
  'file_uploaded',
  'status_changed',
  'member_invited',
  'invoice_sent',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  read: boolean('read').default(false).notNull(),
  emailedAt: timestamp('emailed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  index('notifications_user_id_idx').on(t.userId),
  index('notifications_user_unread_idx').on(t.userId, t.read),
  index('notifications_emailed_at_idx').on(t.emailedAt),
]);

export const contactStatusEnum = pgEnum('contact_status', ['new', 'read', 'replied', 'converted']);

export const contactSubmissions = pgTable('contact_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  company: text('company'),
  email: text('email').notNull(),
  service: text('service'),
  message: text('message').notNull(),
  status: contactStatusEnum('status').notNull().default('new'),
  notes: text('notes'),
  respondedAt: timestamp('responded_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid']);

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  milestoneId: uuid('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  status: invoiceStatusEnum('status').default('draft').notNull(),
  currency: text('currency').notNull().default('USD'),
  notes: text('notes'),
  issuedAt: timestamp('issued_at', { mode: 'date' }),
  dueAt: timestamp('due_at', { mode: 'date' }),
  paidAt: timestamp('paid_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('invoices_project_id_idx').on(t.projectId),
  index('invoices_status_idx').on(t.status),
]);

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [index('invoice_items_invoice_id_idx').on(t.invoiceId)]);

export const testimonials = pgTable('testimonials', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  quote: text('quote').notNull(),
  clientLabel: text('client_label').notNull(),
  industry: text('industry'),
  clientSince: text('client_since'),
  rating: integer('rating').notNull().default(5),
  position: integer('position').notNull().default(0),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const caseStudies = pgTable('case_studies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  category: text('category').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  outcome: text('outcome').notNull(),
  position: integer('position').notNull().default(0),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const technologies = pgTable('technologies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  position: integer('position').notNull().default(0),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
});
