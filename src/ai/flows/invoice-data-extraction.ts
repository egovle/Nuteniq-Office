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
      "The invoice document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type InvoiceDataExtractionInput = z.infer<typeof InvoiceDataExtractionInputSchema>;

const InvoiceItemSchema = z.object({
  name: z.string().describe('The description or name of the line item.'),
  quantity: z.number().describe('The quantity of the item.'),
  price: z.number().describe('The unit price of the item.'),
  total: z.number().describe('The total price for the line item (quantity * price).'),
});

const InvoiceDataExtractionOutputSchema = z.object({
  invoiceNumber: z.string().optional().describe('The invoice number.'),
  customerName: z.string().describe('The name of the customer or entity being billed.'),
  date: z.string().describe('The invoice date.'),
  aadhaarNumber: z.string().optional().describe('The Aadhaar number of the customer.'),
  items: z.array(InvoiceItemSchema).describe('A list of line items from the invoice.'),
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
  prompt: `You are an expert data extraction specialist. Your task is to accurately extract information from the provided invoice image.

  The invoice image is provided as a data URI: {{{media url=invoiceDataUri}}}

  Please extract the following fields:
  - **invoiceNumber**: The unique identifier for the invoice. Look for labels like "Invoice No.".
  - **customerName**: The name of the person or company being billed. Pay close attention to text under the labels 'Bill To' or 'Ship To'. This is the recipient of the invoice.
  - **date**: The date the invoice was issued. Look for "Invoice Date".
  - **aadhaarNumber**: The Aadhaar number of the customer, if present.
  - **items**: A list of all line items. Each item should have a 'name', 'quantity', 'price', and 'total'.

  If any field is not present on the invoice, please leave it blank. Ensure the final output is valid JSON.`,
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
