"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { type Task, type Employee } from "@/lib/data";
import { useMemo } from "react";

const statusColors: { [key: string]: string } = {
  Todo: "#3399FF",
  "In Progress": "#FFC300",
  Done: "#28A745",
  Canceled: "#DC3545",
};

export default function DashboardPage() {
  const { firestore } = useFirebase();

  const tasksQuery = useMemoFirebase(() => firestore ? collection(firestore, 'tasks') : null, [firestore]);
  const { data: tasksData } = useCollection<Task>(tasksQuery);
  const tasks = tasksData || [];

  const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const { data: employeesData } = useCollection<Employee>(employeesQuery);
  const employees = employeesData || [];

  const taskStatusChartData = useMemo(() => {
    const taskStatusData = tasks.reduce((acc, task) => {
      const status = task.status;
      if (!acc[status]) {
        acc[status] = { name: status, value: 0 };
      }
      acc[status].value += 1;
      return acc;
    }, {} as Record<string, { name: string; value: number }>);
    return Object.values(taskStatusData);
  }, [tasks]);
  
  const employeeTaskData = useMemo(() => {
    return employees.map((emp) => ({
      name: emp.name.split(" ")[0],
      tasks: tasks.filter((task) => task.assignee === emp.name).length,
    }));
  }, [employees, tasks]);


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Task Status</CardTitle>
          <CardDescription>Distribution of tasks by status.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={taskStatusChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label={(entry) => `${entry.name} (${entry.value})`}
              >
                {taskStatusChartData.map((entry, index) => (
                  <Pie key={`cell-${index}`} fill={statusColors[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Staff Performance</CardTitle>
          <CardDescription>Number of assigned tasks per employee.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={employeeTaskData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                }}
              />
              <Legend />
              <Bar dataKey="tasks" fill="hsl(var(--primary))" name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
          <CardDescription>A summary of the latest tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{task.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {task.customer} - Assigned to {task.assignee}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'secondary' : 'outline'}
                  >
                    {task.priority}
                  </Badge>
                   <Badge
                    style={{
                      backgroundColor: statusColors[task.status],
                      color: '#fff'
                    }}
                  >
                    {task.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Due: {task.dueDate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
