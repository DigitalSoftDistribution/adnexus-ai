import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Webhook } from 'lucide-react';
import { z } from 'zod';
import { FormModal } from './FormModal';
import { TextInput } from './TextInput';
import { TextAreaField } from './TextAreaField';
import { SelectField } from './SelectField';
import { ToggleField } from './ToggleField';
import { SubmitButton } from './SubmitButton';
import { FormSection } from './FormSection';

export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  url: z.string().min(1, 'URL is required').url('Must be a valid URL'),
  description: z.string().optional(),
  events: z.array(z.string()).min(1, 'At least one event type is required'),
  isActive: z.boolean(),
  secret: z.string().optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;

export interface CreateWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWebhookInput) => Promise<void>;
}

const EVENT_OPTIONS = [
  { value: 'draft.created', label: 'Draft Created' },
  { value: 'draft.approved', label: 'Draft Approved' },
  { value: 'draft.rejected', label: 'Draft Rejected' },
  { value: 'draft.executed', label: 'Draft Executed' },
  { value: 'campaign.created', label: 'Campaign Created' },
  { value: 'campaign.updated', label: 'Campaign Updated' },
  { value: 'campaign.paused', label: 'Campaign Paused' },
  { value: 'campaign.resumed', label: 'Campaign Resumed' },
  { value: 'budget.alert', label: 'Budget Alert' },
  { value: 'goal.reached', label: 'Goal Reached' },
  { value: 'report.generated', label: 'Report Generated' },
];

const EVENT_CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Events' },
  { value: 'drafts', label: 'Draft Events' },
  { value: 'campaigns', label: 'Campaign Events' },
  { value: 'budgets', label: 'Budget Events' },
  { value: 'goals', label: 'Goal Events' },
  { value: 'reports', label: 'Report Events' },
];

function getEventCategory(events: string[]): string {
  if (events.length >= EVENT_OPTIONS.length) return 'all';
  if (events.every((e) => e.startsWith('draft'))) return 'drafts';
  if (events.every((e) => e.startsWith('campaign'))) return 'campaigns';
  if (events.includes('budget.alert')) return 'budgets';
  if (events.includes('goal.reached')) return 'goals';
  if (events.includes('report.generated')) return 'reports';
  return 'all';
}

export function CreateWebhookModal({ isOpen, onClose, onSubmit }: CreateWebhookModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateWebhookInput>({
    resolver: zodResolver(createWebhookSchema),
    defaultValues: {
      name: '',
      url: '',
      description: '',
      events: ['draft.created'],
      isActive: true,
    },
  });

  const handleFormSubmit = async (data: CreateWebhookInput) => {
    setSubmitError(null);
    try {
      await onSubmit(data);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create webhook';
      setSubmitError(message);
    }
  };

  const handleClose = () => {
    reset();
    setSubmitError(null);
    onClose();
  };

  return (
    <FormModal
      title="Create Webhook"
      description="Configure a webhook endpoint to receive real-time event notifications"
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {submitError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-[12px] text-red-400">
            {submitError}
          </div>
        )}

        <div className="space-y-3">
          <FormSection
            title="Webhook Details"
            description="Configure your webhook endpoint"
            icon={<Webhook size={14} />}
          />

          <TextInput
            label="Webhook Name"
            name="name"
            type="text"
            placeholder="e.g., Slack Notifications"
            register={register}
            error={errors.name?.message}
            required
            disabled={isSubmitting}
          />

          <TextInput
            label="Endpoint URL"
            name="url"
            type="url"
            placeholder="https://your-app.com/webhooks"
            register={register}
            error={errors.url?.message}
            required
            disabled={isSubmitting}
          />

          <TextAreaField
            label="Description"
            name="description"
            placeholder="What is this webhook for?"
            rows={2}
            register={register}
            error={errors.description?.message}
            disabled={isSubmitting}
            autoResize={false}
            showCharacterCount={false}
          />
        </div>

        <div className="space-y-3">
          <FormSection
            title="Event Subscriptions"
            description="Choose which events trigger this webhook"
            icon={<span className="text-[11px] font-bold">⚡</span>}
          />

          <Controller
            name="events"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Event Types"
                name="events"
                options={EVENT_CATEGORY_OPTIONS}
                value={getEventCategory(field.value)}
                onChange={(e) => {
                  const category = e.target.value;
                  if (category === 'all') field.onChange(EVENT_OPTIONS.map((ev) => ev.value));
                  else if (category === 'drafts') field.onChange(EVENT_OPTIONS.filter((ev) => ev.value.startsWith('draft')).map((ev) => ev.value));
                  else if (category === 'campaigns') field.onChange(EVENT_OPTIONS.filter((ev) => ev.value.startsWith('campaign')).map((ev) => ev.value));
                  else if (category === 'budgets') field.onChange(['budget.alert']);
                  else if (category === 'goals') field.onChange(['goal.reached']);
                  else if (category === 'reports') field.onChange(['report.generated']);
                }}
                error={errors.events?.message}
                required
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        <div className="space-y-3">
          <FormSection
            title="Security"
            description="Optional secret for HMAC signature verification"
            icon={<span className="text-[11px] font-bold">🔒</span>}
          />

          <TextInput
            label="Secret (optional)"
            name="secret"
            type="text"
            placeholder="Leave blank for auto-generated secret"
            register={register}
            error={errors.secret?.message}
            disabled={isSubmitting}
          />

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ToggleField
                label="Webhook is active"
                name="isActive"
                description="Enable this webhook to start receiving events"
                checked={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <SubmitButton
            type="button"
            variant="outline"
            size="md"
            onClick={handleClose}
            fullWidth={false}
          >
            Cancel
          </SubmitButton>
          <SubmitButton
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
            variant="primary"
            size="md"
          >
            {isSubmitting ? 'Creating...' : 'Create Webhook'}
          </SubmitButton>
        </div>
      </form>
    </FormModal>
  );
}

export default CreateWebhookModal;
