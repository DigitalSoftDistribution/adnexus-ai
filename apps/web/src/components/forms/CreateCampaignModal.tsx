import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Rocket } from 'lucide-react';
import { z } from 'zod';
import { FormModal } from './FormModal';
import { TextInput } from './TextInput';
import { SelectField } from './SelectField';
import { SubmitButton } from './SubmitButton';
import { FormSection } from './FormSection';
import { createCampaignSchema, type CreateCampaignInput } from '@/lib/validation';

type CampaignFormValues = z.input<typeof createCampaignSchema>;

export interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCampaignInput) => Promise<void>;
}

const PLATFORM_OPTIONS = [
  { value: 'Meta', label: 'Meta' },
  { value: 'Google', label: 'Google' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Snap', label: 'Snap' },
];

const OBJECTIVE_OPTIONS = [
  { value: 'Conversions', label: 'Conversions' },
  { value: 'Awareness', label: 'Awareness' },
  { value: 'Traffic', label: 'Traffic' },
  { value: 'Engagement', label: 'Engagement' },
  { value: 'App Installs', label: 'App Installs' },
];

const BUDGET_TYPE_OPTIONS = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Lifetime', label: 'Lifetime' },
];

const BID_STRATEGY_OPTIONS = [
  { value: 'Lowest Cost', label: 'Lowest Cost' },
  { value: 'Cost Cap', label: 'Cost Cap' },
  { value: 'Target CPA', label: 'Target CPA' },
  { value: 'Maximize Conversions', label: 'Maximize Conversions' },
  { value: 'Viewable CPM', label: 'Viewable CPM' },
  { value: 'Target CPM', label: 'Target CPM' },
  { value: 'Reach & Frequency', label: 'Reach & Frequency' },
  { value: 'Goal Based', label: 'Goal Based' },
  { value: 'Swipe Up', label: 'Swipe Up' },
];

const AGE_OPTIONS = [
  { value: '18-65+', label: '18-65+' },
  { value: '18-34', label: '18-34' },
  { value: '18-44', label: '18-44' },
  { value: '25-44', label: '25-44' },
  { value: '25-54', label: '25-54' },
  { value: '18-54', label: '18-54' },
  { value: '13-34', label: '13-34' },
];

const GENDER_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

export function CreateCampaignModal({ isOpen, onClose, onSubmit }: CreateCampaignModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: '',
      platform: 'Meta',
      objective: 'Conversions',
      budgetType: 'Daily',
      budget: '100',
      bidStrategy: 'Lowest Cost',
    },
  });

  const handleFormSubmit = async (data: CampaignFormValues) => {
    setSubmitError(null);
    try {
      // coerce budget to number for API
      const output: CreateCampaignInput = {
        ...data,
        budget: Number(data.budget),
      };
      await onSubmit(output);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create campaign';
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
      title="Create Campaign"
      description="Create a new ad campaign across any platform"
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
            title="Campaign Details"
            description="Name your campaign and choose the platform"
            icon={<Rocket size={14} />}
          />

          <TextInput
            label="Campaign Name"
            name="name"
            type="text"
            placeholder="e.g., Summer Sale 2026"
            register={register}
            error={errors.name?.message}
            required
            disabled={isSubmitting}
          />

          <Controller
            name="platform"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Platform"
                name="platform"
                options={PLATFORM_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.platform?.message}
                required
                disabled={isSubmitting}
              />
            )}
          />

          <Controller
            name="objective"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Objective"
                name="objective"
                options={OBJECTIVE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.objective?.message}
                required
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        <div className="space-y-3">
          <FormSection
            title="Budget"
            description="Set your budget and bidding strategy"
            icon={<span className="text-[11px] font-bold">$</span>}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <Controller
                name="budgetType"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Budget Type"
                    name="budgetType"
                    options={BUDGET_TYPE_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.budgetType?.message}
                    required
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>
            <div className="flex-1">
              <TextInput
                label="Budget ($)"
                name="budget"
                type="number"
                placeholder="100"
                register={register}
                error={errors.budget?.message}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Controller
            name="bidStrategy"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Bid Strategy"
                name="bidStrategy"
                options={BID_STRATEGY_OPTIONS}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.bidStrategy?.message}
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        <div className="space-y-3">
          <FormSection
            title="Targeting"
            description="Set your audience targeting (optional)"
            icon={<span className="text-[11px] font-bold">@</span>}
          />

          <Controller
            name="ageRange"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Age Range"
                name="ageRange"
                options={AGE_OPTIONS}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.ageRange?.message}
                disabled={isSubmitting}
              />
            )}
          />

          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <SelectField
                label="Gender"
                name="gender"
                options={GENDER_OPTIONS}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.gender?.message}
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
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </SubmitButton>
        </div>
      </form>
    </FormModal>
  );
}

export default CreateCampaignModal;
