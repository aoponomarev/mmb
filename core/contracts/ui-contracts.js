import { z } from 'zod';

export const tooltipSchema = z.record(z.string().min(1), z.string().min(1));

export const modalSchema = z.object({
  title: z.string().min(1),
  icon: z.string().optional(),
  description: z.string().optional(),
  bodyComponent: z.string().optional(),
  centered: z.boolean().optional(),
  autoRegister: z.boolean().optional(),
  condition: z.any().optional(), // function
  disableClose: z.boolean().optional()
});

export const modalsConfigSchema = z.record(z.string().min(1), modalSchema);

export const frontendUiConfigSchema = z.object({
  tooltips: tooltipSchema,
  modals: modalsConfigSchema,
});
