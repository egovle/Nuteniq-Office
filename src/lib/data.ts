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

export const tasks: Task[] = [
  {
    id: 'TSK-001',
    title: 'Finalize Q3 financial report',
    customer: 'Innovate Inc.',
    assignee: 'Alice Johnson',
    priority: 'High',
    status: 'In Progress',
    createdAt: '2023-10-01',
    dueDate: '2023-10-25',
  },
  {
    id: 'TSK-002',
    title: 'Develop new marketing campaign',
    customer: 'Quantum Solutions',
    assignee: 'David Chen',
    priority: 'Medium',
    status: 'Todo',
    createdAt: '2023-10-02',
    dueDate: '2023-11-10',
  },
  {
    id: 'TSK-003',
    title: 'Update client database',
    customer: 'Apex Corp.',
    assignee: 'Sophia Rodriguez',
    priority: 'Low',
    status: 'Done',
    createdAt: '2023-09-28',
    dueDate: '2023-10-05',
  },
  {
    id: 'TSK-004',
    title: 'Fix login page bug',
    customer: 'Innovate Inc.',
    assignee: 'Bob Brown',
    priority: 'High',
    status: 'In Progress',
    createdAt: '2023-10-05',
    dueDate: '2023-10-07',
  },
  {
    id: 'TSK-005',
    title: 'Onboard new hire',
    customer: 'Internal',
    assignee: 'Alice Johnson',
    priority: 'Medium',
    status: 'Done',
    createdAt: '2023-09-25',
    dueDate: '2023-09-29',
  },
];

export const customers: Customer[] = [
  {
    id: 'CUS-001',
    name: 'Innovate Inc.',
    email: 'contact@innovate.com',
    phone: '123-456-7890',
    avatar: 'avatar-1',
    aadhaar: '**** **** 1234',
    pan: 'ABCDE1234F',
  },
  {
    id: 'CUS-002',
    name: 'Quantum Solutions',
    email: 'info@quantumsol.com',
    phone: '987-654-3210',
    avatar: 'avatar-2',
    aadhaar: '**** **** 5678',
    pan: 'GHIJK5678L',
  },
  {
    id: 'CUS-003',
    name: 'Apex Corp.',
    email: 'support@apexcorp.com',
    phone: '555-123-4567',
    avatar: 'avatar-3',
    aadhaar: '**** **** 9012',
    pan: 'MNOPQ9012R',
  },
];

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
