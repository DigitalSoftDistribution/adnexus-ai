import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Target } from 'lucide-react';
import { z } from 'zod';
import { FormModal } from './FormModal';
import { TextInput } from './TextInput';
import { SelectField } from './SelectField';
import { SubmitButton } from './SubmitButton';
import { FormSection } from './FormSection';
import { createGoalSchema, type CreateGoalInput } from '@/lib/validation';

type GoalFormValues = z.input<typeof createGoalSchema>;

export interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGoalInput) => Promise<void>;
}

const GOAL_TYPE_OPTIONS = [
  { value: 'roas', label: 'ROAS' },
  { value: 'cpa', label: 'CPA' },
  { value: 'ctr', label: 'CTR' },
  { value: 'spend', label: 'Spend' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'custom', label: 'Custom' },
];

const UNIT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  roas: [{ value: 'x', label: 'x (multiplier)' }],
  cpa: [{ value: '$', label: '$ (dollars)' }],
  ctr: [{ value: '%', label: '% (percent)' }],
  spend: [{ value: '$', label: '$ (dollars)' }],
  conversions: [{ value: '', label: 'count' }],
  custom: [{ value: '%', label: '% (percent)' }, { value: '$', label: '$ (dollars)' }, { value: 'x', label: 'x (multiplier)' }],
};

const ALERT_OPTIONS = [
  { value: 'at-risk', label: 'At Risk' },
  { value: 'off-track', label: 'Off Track' },
  { value: 'never', label: 'Never' },
];

export function CreateGoalModal({ isOpen, onClose, onSubmit }: CreateGoalModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<GoalFormValues>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      name: '',
      goalType: 'roas',
      targetValue: '3',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    },
  });

  const goalType = watch('goalType');

  const handleFormSubmit = async (data: GoalFormValues) => {
    setSubmitError(null);
    try {
      const output: CreateGoalInput = {
        ...data,
        targetValue: Number(data.targetValue),
      };
      await onSubmit(output);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create goal';
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
      title="Create Performance Goal"
      description="Set a measurable target for campaign performance"
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
            title="Goal Details"
            description="Name your goal and choose what to measure"
            icon={<Target size={14} />}
          />

          <TextInput
            label="Goal Name"
            name="name"
            type="text"
            placeholder="e.g., Q2 ROAS Target"
            register={register}
            error={errors.name?.message}
            required
            disabled={isSubmitting}
          />

          <Controller
            name="goalType"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Goal Type"
                name="goalType"
                options={GOAL_TYPE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.goalType?.message}
                required
                disabled={isSubmitting}
              />
            )}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <TextInput
                label="Target Value"
                name="targetValue"
                type="number"
                placeholder={goalType === 'roas' ? '3.0' : goalType === 'cpa' ? '28' : '100'}
                register={register}
                error={errors.targetValue?.message}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="w-[100px]">
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Unit"
                    name="unit"
                    options={UNIT_OPTIONS[goalType] ?? [{ value: '', label: 'count' }]}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={errors.unit?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <FormSection
            title="Timeframe"
            description="When does this goal run?"
            icon={<span className="text-[11px] font-bold">📅</span>}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <TextInput
                label="Start Date"
                name="startDate"
                type="date"
                register={register}
                error={errors.startDate?.message}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="flex-1">
              <TextInput
                label="End Date"
                name="endDate"
                type="date"
                register={register}
                error={errors.endDate?.message}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
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
            {isSubmitting ? 'Creating...' : 'Create Goal'}
          </SubmitButton>
        </div>
      </form>
    </FormModal>
  );
}

export default CreateGoalModal;
