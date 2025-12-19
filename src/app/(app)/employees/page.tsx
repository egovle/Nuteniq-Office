"use client";

import * as React from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { type Employee } from "@/lib/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const getImage = (id: string) =>
  PlaceHolderImages.find((img) => img.id === id);

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null);

  // Force re-render state
  const [refreshKey, setRefreshKey] = React.useState(0);
  const forceUpdate = React.useCallback(() => setRefreshKey(k => k + 1), []);

  const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore, refreshKey]);
  const { data: employeesData, isLoading } = useCollection<Employee>(employeesQuery);
  const data = employeesData || [];
  
  const handleUpdateEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !editingEmployee) return;
    
    const formData = new FormData(e.currentTarget);
    const updatedData: Partial<Employee> = {
        name: formData.get('name-edit') as string,
        mobile: formData.get('mobile-edit') as string,
    };

    const employeeDocRef = doc(firestore, 'employees', editingEmployee.id);

    updateDocumentNonBlocking(employeeDocRef, updatedData);

    toast({
      title: "Employee Updated",
      description: "Employee details have been updated successfully.",
    });
    setEditingEmployee(null);
    forceUpdate();
  }

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!firestore) return;
    try {
        deleteDocumentNonBlocking(doc(firestore, 'employees', employeeId));
        toast({
            title: "Employee Deleted",
            description: "The employee has been deleted.",
          });
        forceUpdate();
    } catch (error) {
        console.error("Error deleting employee:", error)
        toast({
            variant: "destructive",
            title: "Delete Failed",
            description: "Could not delete employee.",
          });
    }
  }

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const employee = row.original;
        const avatar = getImage(employee.avatar);
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              {avatar && <Image src={avatar.imageUrl} alt={employee.name} width={40} height={40} data-ai-hint={avatar.imageHint} />}
              <AvatarFallback>
                {employee.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{employee.name}</span>
              <span className="text-sm text-muted-foreground">{employee.mobile}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <div className="text-right">
              <Dialog open={editingEmployee?.id === employee.id} onOpenChange={(open) => !open && setEditingEmployee(null)}>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <DotsHorizontalIcon className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                    onClick={() => navigator.clipboard.writeText(employee.id)}
                    >
                    Copy employee ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={() => setEditingEmployee(employee)}>Edit employee</DropdownMenuItem>
                    </DialogTrigger>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      Delete employee
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleUpdateEmployee}>
                    <DialogHeader>
                      <DialogTitle>Edit Employee</DialogTitle>
                      <DialogDescription>
                        Update the details for the employee.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name-edit" className="text-right">
                          Name
                        </Label>
                        <Input id="name-edit" name="name-edit" defaultValue={editingEmployee?.name} className="col-span-3" required/>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="mobile-edit" className="text-right">
                          Mobile
                        </Label>
                        <Input id="mobile-edit" name="mobile-edit" type="tel" defaultValue={editingEmployee?.mobile} className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="submit">Save Changes</Button>
                        </DialogClose>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleAddEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const newEmployee = {
        name: formData.get('name') as string,
        mobile: formData.get('mobile') as string,
        avatar: `avatar-${(data.length % 6) + 1}`,
        workload: 0,
        availability: true,
    };
    
    const newDocRef = doc(collection(firestore, 'employees'));
    addDocumentNonBlocking(collection(firestore, "employees"), { ...newEmployee, id: newDocRef.id });


    toast({
      title: "Employee Added",
      description: `${newEmployee.name} has been added.`,
    });
    form.reset();
    (form.closest('[data-radix-collection-item]')?.querySelector('[aria-label="Close"]') as HTMLElement)?.click();
    forceUpdate();
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddEmployee}>
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Fill in the details for the new employee.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input id="name" name="name" className="col-span-3" required/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="mobile" className="text-right">
                    Mobile
                  </Label>
                  <Input id="mobile" name="mobile" type="tel" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                  <Button type="submit">Save Employee</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            { isLoading ? (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                        Loading employees...
                    </TableCell>
                </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.original.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
