/**
 * Validation Schemas
 * Zod schemas for form validation throughout the application
 */

import { z } from 'zod';

export const taskCompletionSchema = z.object({
  status: z.enum(['completed', 'incomplete', 'error']),
  actualDuration: z.number().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours'),
  startedAt: z.date(),
  completedAt: z.date(),
  notes: z.string().optional(),
  issuesEncountered: z.string().optional()
}).refine(
  (data) => {
    // Ensure completedAt is after startedAt
    return data.completedAt.getTime() > data.startedAt.getTime();
  },
  {
    message: 'End time must be after start time',
    path: ['completedAt']
  }
).refine(
  (data) => data.status === 'completed' || (data.issuesEncountered && data.issuesEncountered.trim().length > 0),
  {
    message: 'Issues description is required when status is not completed',
    path: ['issuesEncountered']
  }
);

export const userFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  role: z.enum(['org_manager', 'oem_teleoperator'])
});

export const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100, 'Name is too long'),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  managerEmail: z.string().email('Invalid manager email'),
  managerDisplayName: z.string().min(2, 'Manager name must be at least 2 characters').max(100, 'Name is too long')
});

export type TaskCompletionFormData = z.infer<typeof taskCompletionSchema>;
export type UserFormData = z.infer<typeof userFormSchema>;
export type OrganizationFormData = z.infer<typeof organizationSchema>;

