import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Calendar } from 'lucide-react';
import { z } from 'zod';
import { FormModal } from './FormModal';
import { TextInput } from './TextInput';
import { SelectField } from './SelectField';
import { ToggleField } from './ToggleField';
import { SubmitButton } from './SubmitButton';
import { FormSection } from './FormSection';

export const createScheduledReportSchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  type: z.enum(['performance', 'creative', 'audience', 'budget']),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  email: z.string().min(1, 'Email is required').email('Must be a valid email'),
  platforms: z.array(z.enum(['meta', 'google', 'tiktok', 'snap'])).optional(),
});

export type CreateScheduledReportInput = z.infer<typeof createScheduledReportSchema>;

export interface CreateScheduledReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateScheduledReportInput) => Promise<void>;
}

const REPORT_TYPE_OPTIONS = [
  { value: 'performance', label: 'Performance Summary' },
  { value: 'creative', label: 'Creative Analysis' },
  { value: 'audience', label: 'Audience Insights' },
  { value: 'budget', label: 'Budget Review' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily (every morning)' },
  { value: 'weekly', label: 'Weekly (every Monday)' },
  { value: 'monthly', label: 'Monthly (1st of month)' },
];

const PLATFORM_OPTIONS = [
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'snap', label: 'Snap' },
];

export function CreateScheduledReportModal({ isOpen, onClose, onSubmit }: CreateScheduledReportModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateScheduledReportInput>({
    resolver: zodResolver(createScheduledReportSchema),
    defaultValues: {
      name: '',
      type: 'performance',
      frequency: 'weekly',
      email: '',
      platforms: ['meta', 'google', 'tiktok', 'snap'],
    },
  });

  const handleFormSubmit = async (data: CreateScheduledReportInput) => {
    setSubmitError(null);
    try {
      await onSubmit(data);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to schedule report';
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
      title="Schedule Report"
      description="Set up a recurring report delivered to your inbox"
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
            title="Report Details"
            description="Name your report and choose the type"
            icon={<FileText size={14} />}
          />

          <TextInput
            label="Report Name"
            name="name"
            type="text"
            placeholder="e.g., Weekly Performance Digest"
            register={register}
            error={errors.name?.message}
            required
            disabled={isSubmitting}
          />

          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Report Type"
                name="type"
                options={REPORT_TYPE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.type?.message}
                required
                disabled={isSubmitting}
              />
            )}
          />

          <Controller
            name="platforms"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Platforms"
                name="platforms"
                options={[{ value: 'all', label: 'All Platforms' }, ...PLATFORM_OPTIONS]}
                value={field.value && field.value.length === 4 ? 'all' : (field.value?.[0] ?? 'all')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') field.onChange(['meta', 'google', 'tiktok', 'snap']);
                  else field.onChange([val]);
                }}
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        <div className="space-y-3">
          <FormSection
            title="Schedule & Delivery"
            description="How often and where?"
            icon={<Calendar size={14} />}
          />

          <Controller
            name="frequency"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Frequency"
                name="frequency"
                options={FREQUENCY_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.frequency?.message}
                required
                disabled={isSubmitting}
              />
            )}
          />

          <TextInput
            label="Recipient Email"
            name="email"
            type="email"
            placeholder="you@company.com"
            register={register}
            error={errors.email?.message}
            required
            disabled={isSubmitting}
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
            {isSubmitting ? 'Scheduling...' : 'Schedule Report'}
          </SubmitButton>
        </div>
      </form>
    </FormModal>
  );
}

export default CreateScheduledReportModal;
