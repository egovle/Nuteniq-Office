"use client";

import * as React from "react";
import {
  DotsHorizontalIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from "@radix-ui/react-icons";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  Row,
  getFilteredRowModel,
} from "@tanstack/react-table";

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
import { type Customer, type InvoiceItem, type Invoice } from "@/lib/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const getImage = (id: string) =>
  PlaceHolderImages.find((img) => img.id === id);

type ServiceItemWithInvoice = InvoiceItem & { invoiceNumber?: string; };

const ServicesSubTable = ({ row }: { row: Row<Customer> }) => {
    const { firestore } = useFirebase();
    const customerId = row.original.id;

    const invoicesQuery = useMemoFirebase(() => {
        if (!firestore || !customerId) return null;
        return query(collection(firestore, 'invoices'), where('customerId', '==', customerId));
    }, [firestore, customerId]);

    const { data: invoices, isLoading } = useCollection<Invoice>(invoicesQuery);

    const services = React.useMemo(() => {
        if (!invoices) return [];
        return invoices.flatMap(invoice => 
            (invoice.items || []).map(item => ({
                ...item,
                invoiceNumber: invoice.invoiceNumber
            }))
        );
    }, [invoices]);


    if (isLoading) {
        return <div className="px-4 py-2 text-sm text-muted-foreground">Loading services...</div>
    }

    if (!services || services.length === 0) {
        return <div className="px-4 py-2 text-sm text-muted-foreground">No services found for this customer.</div>
    }

    return (
        <div className="p-2 bg-muted/50">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Service/Item</TableHead>
                        <TableHead>Invoice No.</TableHead>
                        <TableHead>Acknowledgment No.</TableHead>
                        <TableHead>Processed Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {services.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.invoiceNumber || 'N/A'}</TableCell>
                            <TableCell>{item.acknowledgmentNumber || 'N/A'}</TableCell>
                            <TableCell>{item.processedDate || 'N/A'}</TableCell>
                            <TableCell>
                                {item.status ? (
                                    <Badge variant={
                                        item.status === 'Completed' ? 'default' :
                                        item.status === 'Cancelled by Customer' ? 'destructive' :
                                        'secondary'
                                    }>
                                        {item.status}
                                    </Badge>
                                ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{item.total.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default function CustomersPage() {
  const { firestore } = useFirebase();
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);

  const customersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const { data: customersData, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

  const invoicesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'invoices') : null, [firestore]);
  const { data: invoicesData } = useCollection<Invoice>(invoicesQuery);

  const data = customersData || [];
  const invoices = invoicesData || [];

  const handleAddNewCustomer = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!firestore) return;
      const form = e.currentTarget;
      const formData = new FormData(form);
      const newDocRef = doc(collection(firestore, 'customers'));
      const newCustomerData = {
          id: newDocRef.id,
          name: formData.get('name') as string,
          email: formData.get('email') as string,
          mobile: formData.get('mobile') as string,
          aadhaar: formData.get('aadhaar') as string,
          pan: formData.get('pan') as string,
          avatar: `avatar-${(data.length % 6) + 1}`,
      };
      
      setDocumentNonBlocking(newDocRef, newCustomerData, {});
      form.reset();
  };
  
  const handleUpdateCustomer = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!firestore || !editingCustomer) return;
      
      const formData = new FormData(e.currentTarget);
      const updatedData = {
          name: formData.get('name-edit') as string,
          email: formData.get('email-edit') as string,
          mobile: formData.get('mobile-edit') as string,
          aadhaar: formData.get('aadhaar-edit') as string,
          pan: formData.get('pan-edit') as string,
      };

      const docRef = doc(firestore, 'customers', editingCustomer.id);
      setDocumentNonBlocking(docRef, updatedData, { merge: true });
      setEditingCustomer(null);
  }

  const handleDeleteCustomer = (customerId: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'customers', customerId));
  }

  const columns: ColumnDef<Customer>[] = [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <button
              {...{
                onClick: row.getToggleExpandedHandler(),
                style: { cursor: 'pointer' },
              }}
            >
              {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </button>
          ) : null
        },
      },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const customer = row.original;
        const avatar = getImage(customer.avatar);
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              {avatar && <Image src={avatar.imageUrl} alt={customer.name} width={40} height={40} data-ai-hint={avatar.imageHint} />}
              <AvatarFallback>
                {customer.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{customer.name}</span>
              <span className="text-sm text-muted-foreground">{customer.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "mobile",
      header: "Mobile",
    },
    {
      accessorKey: "aadhaar",
      header: "Aadhaar",
    },
    {
      accessorKey: "pan",
      header: "PAN",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="text-right">
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
                  onClick={() => navigator.clipboard.writeText(customer.id)}
                >
                  Copy customer ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>Edit customer</DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="text-destructive">
                  Delete customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const filteredData = React.useMemo(() => {
    if (!globalFilter) {
      return data;
    }
    const lowercasedFilter = globalFilter.toLowerCase();
    return data.filter((customer) => {
      const customerInvoices = invoices.filter(
        (invoice) => invoice.customerId === customer.id
      );
      return (
        customer.name.toLowerCase().includes(lowercasedFilter) ||
        (customer.mobile && customer.mobile.toLowerCase().includes(lowercasedFilter)) ||
        (customer.aadhaar && customer.aadhaar.toLowerCase().includes(lowercasedFilter)) ||
        customerInvoices.some((invoice) =>
          invoice.invoiceNumber?.toLowerCase().includes(lowercasedFilter)
        )
      );
    });
  }, [globalFilter, data, invoices]);


  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex items-center gap-2">
            <Input
              placeholder="Search by name, mobile, aadhaar, invoice..."
              value={globalFilter ?? ''}
              onChange={(event) =>
                setGlobalFilter(event.target.value)
              }
              className="max-w-sm"
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button>Add Customer</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleAddNewCustomer}>
                  <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                    <DialogDescription>
                      Fill in the details for the new customer.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input id="name" name="name" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <Input id="email" name="email" type="email" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="mobile" className="text-right">
                        Mobile
                      </Label>
                      <Input id="mobile" name="mobile" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="aadhaar" className="text-right">
                        Aadhaar
                      </Label>
                      <Input id="aadhaar" name="aadhaar" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="pan" className="text-right">
                        PAN
                      </Label>
                      <Input id="pan" name="pan" className="col-span-3" />
                    </div>
                  </div>
                  <DialogFooter>
                      <DialogClose asChild>
                          <Button type="submit">Save Customer</Button>
                      </DialogClose>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
        </div>
      </div>
      
      {/* Edit Customer Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleUpdateCustomer}>
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogDescription>
                Update the details for the customer.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name-edit" className="text-right">
                  Name
                </Label>
                <Input id="name-edit" name="name-edit" defaultValue={editingCustomer?.name} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email-edit" className="text-right">
                  Email
                </Label>
                <Input id="email-edit" name="email-edit" type="email" defaultValue={editingCustomer?.email} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mobile-edit" className="text-right">
                    Mobile
                </Label>
                <Input id="mobile-edit" name="mobile-edit" defaultValue={editingCustomer?.mobile} className="col-span-3" />
                </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="aadhaar-edit" className="text-right">
                  Aadhaar
                </Label>
                <Input id="aadhaar-edit" name="aadhaar-edit" defaultValue={editingCustomer?.aadhaar} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pan-edit" className="text-right">
                  PAN
                </Label>
                <Input id="pan-edit" name="pan-edit" defaultValue={editingCustomer?.pan} className="col-span-3" />
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
            {isLoadingCustomers ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading customers...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                <TableRow
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
                {row.getIsExpanded() && (
                    <TableRow>
                        <TableCell colSpan={columns.length}>
                            <ServicesSubTable row={row} />
                        </TableCell>
                    </TableRow>
                )}
                </React.Fragment>
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

    