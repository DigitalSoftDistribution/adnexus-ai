import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Plus, Trash2, Zap } from 'lucide-react';
import { FormModal } from './FormModal';
import { TextInput } from './TextInput';
import { TextAreaField } from './TextAreaField';
import { SelectField } from './SelectField';
import { ToggleField } from './ToggleField';
import { SubmitButton } from './SubmitButton';
import { FormSection } from './FormSection';
import { createRuleSchema, type CreateRuleInput } from '@/lib/validation';

export interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRuleInput) => Promise<void>;
}

const METRIC_OPTIONS = [
  { value: 'spend', label: 'Spend' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'clicks', label: 'Clicks' },
  { value: 'ctr', label: 'CTR' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'cpa', label: 'CPA' },
  { value: 'roas', label: 'ROAS' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'cpm', label: 'CPM' },
  { value: 'cpc', label: 'CPC' },
];

const OPERATOR_OPTIONS = [
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'gte', label: 'Greater than or equal (>=)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'Less than or equal (<=)' },
  { value: 'eq', label: 'Equals (=)' },
  { value: 'neq', label: 'Not equals (!=)' },
];

const ACTION_TYPE_OPTIONS = [
  { value: 'pause_campaign', label: 'Pause Campaign' },
  { value: 'increase_budget', label: 'Increase Budget' },
  { value: 'decrease_budget', label: 'Decrease Budget' },
  { value: 'notify', label: 'Send Notification' },
  { value: 'adjust_bid', label: 'Adjust Bid' },
];

/**
 * CreateRuleModal - A full-featured modal for creating automation rules
 *
 * Uses the reusable form system with Zod validation.
 * Features:
 *   - Dynamic condition builder (add/remove conditions)
 *   - Dynamic action builder (add/remove actions)
 *   - Toggle for rule active state
 *   - Full form validation with error messages
 */
export function CreateRuleModal({ isOpen, onClose, onSubmit }: CreateRuleModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<CreateRuleInput>({
    resolver: zodResolver(createRuleSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
      conditions: [{ metric: 'spend', operator: 'gt', value: 0 }],
      actions: [{ type: 'notify', parameters: {} }],
    },
  });

  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({
    control,
    name: 'conditions',
  });

  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({
    control,
    name: 'actions',
  });

  const isActiveValue = watch('isActive');
  void isActiveValue; // used for form state

  const handleFormSubmit = async (data: CreateRuleInput) => {
    setSubmitError(null);
    try {
      await onSubmit(data);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create rule';
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
      title="Create Automation Rule"
      description="Set up conditions and actions to automate your campaign management"
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Submit error */}
        {submitError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-[12px] text-red-400">
            {submitError}
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-3">
          <FormSection
            title="Rule Details"
            description="Name your rule and provide an optional description"
            icon={<Zap size={14} />}
          />

          <TextInput
            label="Rule Name"
            name="name"
            type="text"
            placeholder="e.g., Pause Low ROAS Campaigns"
            register={register}
            error={errors.name?.message}
            required
            disabled={isSubmitting}
          />

          <TextAreaField
            label="Description"
            name="description"
            placeholder="What does this rule do?"
            rows={2}
            register={register}
            error={errors.description?.message}
            disabled={isSubmitting}
            autoResize={false}
            showCharacterCount={false}
          />

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ToggleField
                label="Rule is active"
                name="isActive"
                description="Enable this rule to run automatically"
                checked={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        {/* Conditions */}
        <div className="space-y-3">
          <FormSection
            title="Conditions"
            description="All conditions must be met for the rule to trigger"
            icon={<span className="text-[11px] font-bold">IF</span>}
          />

          <div className="space-y-3">
            {conditionFields.map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] p-3"
              >
                <div className="flex flex-1 gap-2">
                  <Controller
                    name={`conditions.${index}.metric`}
                    control={control}
                    render={({ field }) => (
                      <SelectField
                        label={index === 0 ? 'Metric' : undefined}
                        name={`conditions.${index}.metric`}
                        options={METRIC_OPTIONS}
                        value={(field.value ?? '') as string}
                        onChange={field.onChange}
                        error={errors.conditions?.[index]?.metric?.message ?? ''}
                        required
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                    )}
                  />
                  <Controller
                    name={`conditions.${index}.operator`}
                    control={control}
                    render={({ field }) => (
                      <SelectField
                        label={index === 0 ? 'Operator' : undefined}
                        name={`conditions.${index}.operator`}
                        options={OPERATOR_OPTIONS}
                        value={(field.value ?? '') as string}
                        onChange={field.onChange}
                        error={errors.conditions?.[index]?.operator?.message ?? ''}
                        required
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                    )}
                  />
                  <Controller
                    name={`conditions.${index}.value`}
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        label={index === 0 ? 'Value' : undefined}
                        name={`conditions.${index}.value`}
                        type="number"
                        placeholder="0"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        error={errors.conditions?.[index]?.value?.message ?? ''}
                        required
                        disabled={isSubmitting}
                        className="w-[100px]"
                      />
                    )}
                  />
                </div>
                {conditionFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className="mt-2 p-1.5 rounded-md transition-colors hover:bg-red-500/10"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label="Remove condition"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => appendCondition({ metric: 'spend', operator: 'gt', value: 0 })}
            className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-80"
            style={{ color: '#c3f53b' }}
          >
            <Plus size={14} />
            Add Condition
          </button>

          {errors.conditions?.root && (
            <p className="text-[11px] text-red-400">{errors.conditions.root.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <FormSection
            title="Actions"
            description="What happens when all conditions are met"
            icon={<span className="text-[11px] font-bold">THEN</span>}
          />

          <div className="space-y-3">
            {actionFields.map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] p-3"
              >
                <div className="flex flex-1 gap-2">
                  <Controller
                    name={`actions.${index}.type`}
                    control={control}
                    render={({ field }) => (
                      <SelectField
                        label={index === 0 ? 'Action Type' : undefined}
                        name={`actions.${index}.type`}
                        options={ACTION_TYPE_OPTIONS}
                        value={(field.value ?? '') as string}
                        onChange={field.onChange}
                        error={errors.actions?.[index]?.type?.message ?? ''}
                        required
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                    )}
                  />
                </div>
                {actionFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAction(index)}
                    className="mt-2 p-1.5 rounded-md transition-colors hover:bg-red-500/10"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label="Remove action"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => appendAction({ type: 'notify', parameters: {} })}
            className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-80"
            style={{ color: '#c3f53b' }}
          >
            <Plus size={14} />
            Add Action
          </button>

          {errors.actions?.root && (
            <p className="text-[11px] text-red-400">{errors.actions.root.message}</p>
          )}
        </div>

        {/* Submit */}
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
            {isSubmitting ? 'Creating Rule...' : 'Create Rule'}
          </SubmitButton>
        </div>
      </form>
    </FormModal>
  );
}

export default CreateRuleModal;
