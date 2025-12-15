// InvoiceDataExtraction
'use server';
/**
 * @fileOverview Invoice data extraction flow.
 *
 * This flow extracts key information from uploaded invoices, including
 * invoice number, customer name, date, and Aadhaar number.
 *
 * @interface InvoiceDataExtractionInput - Input schema for invoice data extraction.
 * @interface InvoiceDataExtractionOutput - Output schema for extracted invoice data.
 * @function extractInvoiceData - Main function to trigger the invoice data extraction flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InvoiceDataExtractionInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      'The invoice document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type InvoiceDataExtractionInput = z.infer<typeof InvoiceDataExtractionInputSchema>;

const InvoiceDataExtractionOutputSchema = z.object({
  invoiceNumber: z.string().optional().describe('The invoice number.'),
  customerName: z.string().describe('The name of the customer.'),
  date: z.string().describe('The invoice date.'),
  aadhaarNumber: z.string().optional().describe('The Aadhaar number of the customer.'),
});
export type InvoiceDataExtractionOutput = z.infer<typeof InvoiceDataExtractionOutputSchema>;

export async function extractInvoiceData(
  input: InvoiceDataExtractionInput
): Promise<InvoiceDataExtractionOutput> {
  return invoiceDataExtractionFlow(input);
}

const invoiceDataExtractionPrompt = ai.definePrompt({
  name: 'invoiceDataExtractionPrompt',
  input: {schema: InvoiceDataExtractionInputSchema},
  output: {schema: InvoiceDataExtractionOutputSchema},
  prompt: `You are an expert data extraction specialist.
  Extract the following information from the invoice provided.
  The invoice will be passed to you as a data URI. The image is of type {{{media url=invoiceDataUri}}}

  The following fields are extracted:
  - invoiceNumber: The invoice number.
  - customerName: The name of the customer.
  - date: The invoice date.
  - aadhaarNumber: The Aadhaar number of the customer.

  If a field is not present, leave it blank.
  Ensure the output is valid JSON.`,
});

const invoiceDataExtractionFlow = ai.defineFlow(
  {
    name: 'invoiceDataExtractionFlow',
    inputSchema: InvoiceDataExtractionInputSchema,
    outputSchema: InvoiceDataExtractionOutputSchema,
  },
  async input => {
    const {output} = await invoiceDataExtractionPrompt(input);
    return output!;
  }
);
