"use client";

import * as React from "react";
import {
  DotsHorizontalIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusCircle,
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
import { type Customer, type InvoiceItem, type Invoice, type StatusHistory } from "@/lib/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, SaveIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const getImage = (id: string) =>
  PlaceHolderImages.find((img) => img.id === id);

type EditableInvoiceItem = InvoiceItem & { originalIndex: number, invoiceId: string };

const ServiceHistory = ({ item }: { item: EditableInvoiceItem }) => {
    return (
      <div className="p-2 bg-muted/20">
        <h4 className="text-sm font-semibold mb-2">Status History</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Date Changed</TableHead>
              <TableHead>Acknowledgment No.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {item.statusHistory?.map((history, index) => (
              <TableRow key={index}>
                <TableCell>{history.status}</TableCell>
                <TableCell>{format(new Date(history.date), "PPP")}</TableCell>
                <TableCell>{item.acknowledgmentNumber}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
};

const ServiceRow = ({ serviceItem, invoices }: { serviceItem: EditableInvoiceItem, invoices: Invoice[] | null }) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

    const [editableItem, setEditableItem] = React.useState<Partial<InvoiceItem>>({
        acknowledgmentNumber: serviceItem.acknowledgmentNumber || '',
        processedDate: serviceItem.processedDate,
        status: serviceItem.status || undefined,
    });

    const handleFieldChange = <K extends keyof InvoiceItem>(field: K, value: InvoiceItem[K]) => {
        setEditableItem(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!firestore || !invoices) return;

        const invoiceDocRef = doc(firestore, 'invoices', serviceItem.invoiceId);
        const invoiceToUpdate = invoices.find(inv => inv.id === serviceItem.invoiceId);

        if (invoiceToUpdate) {
            const updatedItems = [...invoiceToUpdate.items];
            const originalItem = updatedItems[serviceItem.originalIndex];

            const newStatusHistoryEntry: StatusHistory | undefined = editableItem.status ? {
                status: editableItem.status,
                date: editableItem.processedDate || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            } : undefined;

            const updatedStatusHistory = newStatusHistoryEntry
                ? [...(originalItem.statusHistory || []), newStatusHistoryEntry]
                : originalItem.statusHistory;

            updatedItems[serviceItem.originalIndex] = {
                ...originalItem,
                acknowledgmentNumber: editableItem.acknowledgmentNumber,
                processedDate: editableItem.processedDate,
                status: editableItem.status,
                statusHistory: updatedStatusHistory,
            };

            try {
                await updateDoc(invoiceDocRef, { items: updatedItems });
                toast({
                    title: "Service Updated",
                    description: "The service details have been saved successfully.",
                });
            } catch (error) {
                console.error("Error updating service:", error);
                toast({
                    variant: "destructive",
                    title: "Update Failed",
                    description: "Could not save the service details.",
                });
            }
        }
    };


    return (
        <Collapsible asChild>
            <>
                <TableRow>
                    <TableCell>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            {isHistoryOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                            <span className="sr-only">Toggle History</span>
                        </Button>
                    </CollapsibleTrigger>
                        {serviceItem.name}
                    </TableCell>
                    <TableCell>{serviceItem.invoiceNumber || 'N/A'}</TableCell>
                    <TableCell>
                        <Input
                            value={editableItem.acknowledgmentNumber || ''}
                            onChange={(e) => handleFieldChange('acknowledgmentNumber', e.target.value)}
                            className="h-8"
                        />
                    </TableCell>
                    <TableCell>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[150px] justify-start text-left font-normal h-8",
                                        !editableItem.processedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {editableItem.processedDate ? format(new Date(editableItem.processedDate), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={editableItem.processedDate ? new Date(editableItem.processedDate) : undefined}
                                    onSelect={(date) => handleFieldChange('processedDate', date?.toISOString())}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </TableCell>
                    <TableCell>
                        <Select
                            value={editableItem.status || ''}
                            onValueChange={(value) => handleFieldChange('status', value as InvoiceItem['status'])}
                        >
                            <SelectTrigger className="w-[180px] h-8">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Under Process">Under Process</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Cancelled by Customer">Cancelled by Customer</SelectItem>
                            </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell className="text-right">{serviceItem.quantity}</TableCell>
                    <TableCell className="text-right">₹{serviceItem.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{serviceItem.total.toFixed(2)}</TableCell>
                    <TableCell>
                        <Button variant="ghost" size="icon" onClick={handleSave}>
                            <SaveIcon className="h-4 w-4" />
                            <span className="sr-only">Save</span>
                        </Button>
                    </TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                    <TableRow>
                        <TableCell colSpan={9}>
                            <ServiceHistory item={{...serviceItem, ...editableItem}} />
                        </TableCell>
                    </TableRow>
                </CollapsibleContent>
            </>
        </Collapsible>
    );
};


const ServicesSubTable = ({ row }: { row: Row<Customer> }) => {
    const { firestore } = useFirebase();
    const customerId = row.original.id;

    const invoicesQuery = useMemoFirebase(() => {
        if (!firestore || !customerId) return null;
        return query(collection(firestore, 'invoices'), where('customerId', '==', customerId));
    }, [firestore, customerId]);

    const { data: invoices, isLoading } = useCollection<Invoice>(invoicesQuery);

    const services = React.useMemo((): EditableInvoiceItem[] => {
        if (!invoices) return [];
        return invoices.flatMap(invoice =>
            (invoice.items || []).map((item, index) => ({
                ...item,
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                originalIndex: index
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
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {services.map((item, index) => (
                       <ServiceRow key={`${item.invoiceId}-${item.originalIndex}`} serviceItem={item} invoices={invoices} />
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default function CustomersPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [searchValue, setSearchValue] = React.useState('');
  const [searchBy, setSearchBy] = React.useState('name');
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);

  const customersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const { data: customersData, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  const customers = customersData || [];

  const invoicesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'invoices') : null, [firestore]);
  const { data: invoicesData } = useCollection<Invoice>(invoicesQuery);
  const invoices = invoicesData || [];

  const handleAddNewCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!firestore) return;
      const form = e.currentTarget;
      const formData = new FormData(form);
      
      const newCustomerData = {
          name: formData.get('name') as string,
          email: formData.get('email') as string,
          mobile: formData.get('mobile') as string,
          aadhaar: formData.get('aadhaar') as string,
          pan: formData.get('pan') as string,
          avatar: `avatar-${(customers.length % 6) + 1}`,
      };
      
      try {
        await addDocumentNonBlocking(collection(firestore, 'customers'), newCustomerData);
        toast({
          title: "Customer Added",
          description: `${newCustomerData.name} has been added successfully.`,
        });
        form.reset();
      } catch(error) {
        console.error("Error adding customer: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add new customer.",
        });
      }
  };
  
  const handleUpdateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
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
      try {
        await setDocumentNonBlocking(docRef, updatedData, { merge: true });
        toast({
          title: "Customer Updated",
          description: "Customer details have been updated successfully.",
        });
        setEditingCustomer(null);
      } catch (error) {
        console.error("Error updating customer: ", error);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not update customer details.",
        });
      }
  }

  const handleDeleteCustomer = (customerId: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'customers', customerId));
    toast({
        title: "Customer Deleted",
        description: "The customer has been deleted.",
      });
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
                {customer.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{customer.name}</span>
          </div>
        );
      },
    },
    {
        accessorKey: "email",
        header: "Email",
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
    if (!searchValue) {
      return customers;
    }
    const lowercasedFilter = searchValue.toLowerCase();

    if (searchBy === 'invoiceNumber') {
      const matchingCustomerIds = invoices
        .filter(invoice => invoice.invoiceNumber?.toLowerCase().includes(lowercasedFilter))
        .map(invoice => invoice.customerId);
      const uniqueCustomerIds = [...new Set(matchingCustomerIds)];
      return customers.filter(customer => uniqueCustomerIds.includes(customer.id));
    }
    
    return customers.filter((customer) => {
        const searchField = customer[searchBy as keyof Customer] as string | undefined;
        return searchField?.toLowerCase().includes(lowercasedFilter);
    });
  }, [searchValue, searchBy, customers, invoices]);


  const table = useReactTable({
    data: filteredData,
    columns,
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
            <div className="flex gap-2">
                <Select value={searchBy} onValueChange={setSearchBy}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Search by..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="aadhaar">Aadhaar Number</SelectItem>
                        <SelectItem value="invoiceNumber">Invoice Number</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                placeholder={`Search by ${searchBy.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}...`}
                value={searchValue}
                onChange={(event) =>
                    setSearchValue(event.target.value)
                }
                className="max-w-sm"
                />
            </div>
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
                      <Input id="name" name="name" className="col-span-3" required/>
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
                <Input id="name-edit" name="name-edit" defaultValue={editingCustomer?.name} className="col-span-3" required/>
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
