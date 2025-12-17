

export type Task = {
  id: string;
  title: string;
  customer: string;
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Todo' | 'In Progress' | 'Done' | 'Canceled';
  createdAt: string;
  dueDate: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  avatar: string;
  aadhaar: string;
  pan: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  skills: string[];
  workload: number;
  availability: boolean;
};

export type InvoiceItem = {
  name: string;
  quantity: number;
  price: number;
  total: number;
  acknowledgmentNumber?: string;
  processedDate?: string;
  status?: 'Under Process' | 'Completed' | 'Cancelled by Customer';
};

export type Invoice = {
  id: string;
  invoiceNumber?: string;
  customerId: string;
  date: string;
  items: InvoiceItem[];
  total: number;
};

// Data is now managed in Firestore, these arrays can be cleared or used for seeding.
export const tasks: Task[] = [];
export const customers: Customer[] = [];
export let invoices: Invoice[] = [];
export const employees: Employee[] = [];
