import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BellRing } from 'lucide-react';
import { z } from 'zod';
import { FormModal } from './FormModal';
import { TextInput } from './TextInput';
import { TextAreaField } from './TextAreaField';
import { SelectField } from './SelectField';
import { SubmitButton } from './SubmitButton';
import { FormSection } from './FormSection';

export const createAlertSchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  metric: z.enum(['ROAS', 'CPA', 'CTR', 'CPM', 'CPC', 'Spend', 'Conversions', 'Impressions', 'Clicks', 'Frequency']),
  operator: z.enum(['<', '>', 'changed by %']),
  threshold: z.coerce.number().positive('Threshold must be positive'),
  timeWindow: z.enum(['last hour', 'today', 'last 7 days', 'last 30 days']),
  platforms: z.array(z.string()).min(1, 'At least one platform is required'),
  channels: z.array(z.string()).min(1, 'At least one channel is required'),
  severity: z.enum(['info', 'warning', 'critical']),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;

export interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAlertInput) => Promise<void>;
}

const METRIC_OPTIONS = [
  { value: 'ROAS', label: 'ROAS' },
  { value: 'CPA', label: 'CPA' },
  { value: 'CTR', label: 'CTR' },
  { value: 'CPM', label: 'CPM' },
  { value: 'CPC', label: 'CPC' },
  { value: 'Spend', label: 'Spend' },
  { value: 'Conversions', label: 'Conversions' },
  { value: 'Impressions', label: 'Impressions' },
  { value: 'Clicks', label: 'Clicks' },
  { value: 'Frequency', label: 'Frequency' },
];

const OPERATOR_OPTIONS = [
  { value: '<', label: 'Below (<)' },
  { value: '>', label: 'Above (>)' },
  { value: 'changed by %', label: 'Changed by %' },
];

const TIME_WINDOW_OPTIONS = [
  { value: 'last hour', label: 'Last hour' },
  { value: 'today', label: 'Today' },
  { value: 'last 7 days', label: 'Last 7 days' },
  { value: 'last 30 days', label: 'Last 30 days' },
];

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'snapchat', label: 'Snap' },
];

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'in-app', label: 'In-App' },
];

const SEVERITY_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export function CreateAlertModal({ isOpen, onClose, onSubmit }: CreateAlertModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateAlertInput>({
    resolver: zodResolver(createAlertSchema),
    defaultValues: {
      name: '',
      description: '',
      metric: 'ROAS',
      operator: '<',
      threshold: 2.0,
      timeWindow: 'today',
      platforms: ['all'],
      channels: ['email'],
      severity: 'warning',
    },
  });

  const handleFormSubmit = async (data: CreateAlertInput) => {
    setSubmitError(null);
    try {
      await onSubmit(data);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create alert';
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
      title="Create Alert Rule"
      description="Get notified when performance metrics cross your thresholds"
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
            title="Alert Details"
            description="Name your alert and provide an optional description"
            icon={<BellRing size={14} />}
          />

          <TextInput
            label="Alert Name"
            name="name"
            type="text"
            placeholder="e.g., ROAS Below 2.0"
            register={register}
            error={errors.name?.message}
            required
            disabled={isSubmitting}
          />

          <TextAreaField
            label="Description"
            name="description"
            placeholder="What does this alert monitor?"
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
            title="Condition"
            description="What triggers this alert?"
            icon={<span className="text-[11px] font-bold">IF</span>}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <Controller
                name="metric"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Metric"
                    name="metric"
                    options={METRIC_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.metric?.message}
                    required
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>
            <div className="w-[120px]">
              <Controller
                name="operator"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Operator"
                    name="operator"
                    options={OPERATOR_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.operator?.message}
                    required
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>
            <div className="w-[120px]">
              <TextInput
                label="Threshold"
                name="threshold"
                type="number"
                placeholder="2.0"
                register={register}
                error={errors.threshold?.message}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Controller
            name="timeWindow"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Time Window"
                name="timeWindow"
                options={TIME_WINDOW_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.timeWindow?.message}
                required
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        <div className="space-y-3">
          <FormSection
            title="Scope & Delivery"
            description="Which platforms and how should you be notified?"
            icon={<span className="text-[11px] font-bold">@</span>}
          />

          <Controller
            name="platforms"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Platforms"
                name="platforms"
                options={PLATFORM_OPTIONS}
                value={field.value?.[0] ?? 'all'}
                onChange={(val) => field.onChange([val])}
                error={errors.platforms?.message}
                required
                disabled={isSubmitting}
              />
            )}
          />

          <Controller
            name="channels"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Notification Channels"
                name="channels"
                options={CHANNEL_OPTIONS}
                value={field.value?.[0] ?? 'email'}
                onChange={(val) => field.onChange([val])}
                error={errors.channels?.message}
                required
                disabled={isSubmitting}
              />
            )}
          />

          <Controller
            name="severity"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Severity Level"
                name="severity"
                options={SEVERITY_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.severity?.message}
                required
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
            {isSubmitting ? 'Creating...' : 'Create Alert'}
          </SubmitButton>
        </div>
      </form>
    </FormModal>
  );
}

export default CreateAlertModal;
