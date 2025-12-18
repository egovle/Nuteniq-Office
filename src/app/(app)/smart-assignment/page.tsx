"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  assignTask,
  type SmartTaskOutput,
} from "@/ai/flows/smart-task-assignment";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { type Employee } from "@/lib/data";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const formSchema = z.object({
  taskDescription: z.string().min(10, "Description must be at least 10 characters."),
  priority: z.enum(["High", "Medium", "Low"]),
  dueDate: z.date(),
});

const getImage = (id: string) => PlaceHolderImages.find((img) => img.id === id);

export default function SmartAssignmentPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmartTaskOutput | null>(null);
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const { data: employeesData } = useCollection<Employee>(employeesQuery);
  const employees = employeesData || [];


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taskDescription: "",
      priority: "Medium",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);

    const staffWorkload = employees.reduce((acc, e) => {
      acc[e.name] = e.workload;
      return acc;
    }, {} as Record<string, number>);
    const staffAvailability = employees.reduce((acc, e) => {
      acc[e.name] = e.availability;
      return acc;
    }, {} as Record<string, boolean>);

    try {
      const aiResult = await assignTask({
        ...values,
        dueDate: format(values.dueDate, "yyyy-MM-dd"),
        staffWorkload,
        staffAvailability,
      });
      setResult(aiResult);
    } catch (error) {
      console.error("Error in smart assignment:", error);
      toast({
        variant: "destructive",
        title: "Assignment Failed",
        description: "The AI could not suggest an assignment. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  const suggestedEmployee = employees.find(e => e.name === result?.suggestedStaff);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Smart Task Assignment</CardTitle>
              <CardDescription>
                Let AI suggest the best person for the job based on workload and availability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="taskDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Develop a new feature for the customer dashboard..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading || employees.length === 0} className="w-full">
                {loading ? "Analyzing..." : "Find Best Assignee"}
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>AI Suggestion</CardTitle>
          <CardDescription>
            The recommended staff member for this task.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : result && suggestedEmployee ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border bg-accent/50 p-4">
                <Avatar className="h-16 w-16">
                   {suggestedEmployee.avatar && <Image src={getImage(suggestedEmployee.avatar)?.imageUrl || ''} alt={suggestedEmployee.name} width={64} height={64} data-ai-hint={getImage(suggestedEmployee.avatar)?.imageHint} />}
                  <AvatarFallback>{suggestedEmployee.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">{result.suggestedStaff}</h3>
                  <p className="text-muted-foreground">{suggestedEmployee.mobile}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Reasoning:</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.reasoning}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>AI's suggestion will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
