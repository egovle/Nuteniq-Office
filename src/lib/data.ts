

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
  phone: string;
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

export const tasks: Task[] = [];

export const customers: Customer[] = [];

export let invoices: Invoice[] = [];

export const employees: Employee[] = [
  {
    id: 'EMP-001',
    name: 'Alice Johnson',
    email: 'alice@serviceflow.com',
    role: 'Project Manager',
    avatar: 'avatar-4',
    skills: ['Management', 'Financial Reporting', 'Client Relations'],
    workload: 3,
    availability: true,
  },
  {
    id: 'EMP-002',
    name: 'Bob Brown',
    email: 'bob@serviceflow.com',
    role: 'Software Engineer',
    avatar: 'avatar-5',
    skills: ['React', 'Node.js', 'Bug Fixing', 'TypeScript'],
    workload: 5,
    availability: false,
  },
  {
    id: 'EMP-003',
    name: 'David Chen',
    email: 'david@serviceflow.com',
    role: 'Marketing Specialist',
    avatar: 'avatar-6',
    skills: ['SEO', 'Content Creation', 'Campaign Management'],
    workload: 2,
    availability: true,
  },
  {
    id: 'EMP-004',
    name: 'Sophia Rodriguez',
    email: 'sophia@serviceflow.com',
    role: 'Data Analyst',
    avatar: 'avatar-1',
    skills: ['SQL', 'Python', 'Database Management', 'Data Visualization'],
    workload: 4,
    availability: true,
  },
];
