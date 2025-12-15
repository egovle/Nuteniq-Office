'use server';

/**
 * @fileOverview Implements the Smart Task Assignment flow using Genkit.
 *
 * This file exports:
 * - `assignTask`: Asynchronously suggests the most suitable staff member for a given task.
 * - `SmartTaskInput`: The input type for the `assignTask` function.
 * - `SmartTaskOutput`: The output type for the `assignTask` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartTaskInputSchema = z.object({
  taskDescription: z.string().describe('Detailed description of the task requirements.'),
  priority: z.enum(['High', 'Medium', 'Low']).describe('Priority level of the task.'),
  dueDate: z.string().describe('The date by which the task must be completed.'),
  staffSkills: z.array(z.string()).describe('List of available staff members and their skills.'),
  staffWorkload: z
    .record(z.string(), z.number())
    .describe('Current workload of each staff member (e.g., number of tasks).'),
  staffAvailability: z
    .record(z.string(), z.boolean())
    .describe('Availability of each staff member (true if available, false otherwise).'),
});
export type SmartTaskInput = z.infer<typeof SmartTaskInputSchema>;

const SmartTaskOutputSchema = z.object({
  suggestedStaff: z
    .string()
    .describe('The staff member suggested for the task, based on skills, workload, and availability.'),
  reasoning: z
    .string()
    .describe('The AI reasoning behind the staff member suggestion, explaining the factors considered.'),
});
export type SmartTaskOutput = z.infer<typeof SmartTaskOutputSchema>;

export async function assignTask(input: SmartTaskInput): Promise<SmartTaskOutput> {
  return smartTaskAssignmentFlow(input);
}

const smartTaskAssignmentPrompt = ai.definePrompt({
  name: 'smartTaskAssignmentPrompt',
  input: {schema: SmartTaskInputSchema},
  output: {schema: SmartTaskOutputSchema},
  prompt: `You are an AI assistant designed to suggest the most suitable staff member for a given task.

  Consider the following factors:
  - Task requirements ({{{taskDescription}}})
  - Priority ({{{priority}}})
  - Due date ({{{dueDate}}})
  - Staff skills ({{{staffSkills}}})
  - Staff workload ({{{staffWorkload}}})
  - Staff availability ({{{staffAvailability}}})

  Suggest the best staff member and explain your reasoning. Make sure your answer is in markdown format.
`,
});

const smartTaskAssignmentFlow = ai.defineFlow(
  {name: 'smartTaskAssignmentFlow', inputSchema: SmartTaskInputSchema, outputSchema: SmartTaskOutputSchema},
  async input => {
    const {output} = await smartTaskAssignmentPrompt(input);
    return output!;
  }
);
