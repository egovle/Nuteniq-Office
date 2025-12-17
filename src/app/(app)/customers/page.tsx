
"use client";

import * as React from "react";
import {
  DotsHorizontalIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  Row,
  getFilteredRowModel,
  ExpandedState,
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
import { collection, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const getImage = (id: string) =>
  PlaceHolderImages.find((img) => img.id === id);

type EditableInvoiceItem = InvoiceItem & { originalIndex: number, invoiceId: string };

const ServiceHistory = ({ item, invoiceId, originalIndex, onHistoryUpdate }: { item: EditableInvoiceItem, invoiceId: string, originalIndex: number, onHistoryUpdate: () => void }) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isAdding, setIsAdding] = React.useState(false);
    const [newStatus, setNewStatus] = React.useState<StatusHistory['status'] | ''>('');
    const [newDate, setNewDate] = React.useState<Date | undefined>(new Date());
    const [newNotes, setNewNotes] = React.useState('');
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

    const lastUpdateDate = React.useMemo(() => {
        if (!item.statusHistory || item.statusHistory.length === 0) return undefined;
        return new Date(item.statusHistory[item.statusHistory.length - 1].date);
    }, [item.statusHistory]);

    const handleAddHistory = async () => {
        if (!firestore || !newStatus || !newDate) return;

        const newHistoryEntry: StatusHistory = {
            status: newStatus,
            date: newDate.toISOString(),
            updatedAt: new Date().toISOString(),
            notes: newNotes,
        };

        const invoiceDocRef = doc(firestore, 'invoices', invoiceId);
        
        try {
            const docSnap = await getDoc(invoiceDocRef);
            if (docSnap.exists()) {
                const invoiceData = docSnap.data() as Invoice;
                const updatedItems = [...(invoiceData.items || [])];
                const currentItem = updatedItems[originalIndex];

                if (currentItem) {
                    const updatedHistory = [...(currentItem.statusHistory || []), newHistoryEntry];
                    updatedItems[originalIndex] = {
                        ...currentItem,
                        statusHistory: updatedHistory,
                        // also update the top-level fields for display
                        status: newHistoryEntry.status,
                        processedDate: newHistoryEntry.date,
                    };
                    await setDoc(invoiceDocRef, { items: updatedItems }, { merge: true });
                    toast({
                        title: "History Added",
                        description: "The status history has been updated.",
                    });
                    onHistoryUpdate(); // a function to trigger re-fetch/re-render
                    setIsAdding(false);
                    setNewStatus('');
                    setNewDate(new Date());
                    setNewNotes('');
                }
            }
        } catch(error) {
            console.error("Error adding history:", error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not add status history.",
            });
        }
    };

    return (
      <div className="p-4 bg-muted/20 space-y-4">
        <h4 className="text-sm font-semibold">Status History</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Date Changed</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {item.statusHistory?.map((history, index) => (
              <TableRow key={index}>
                <TableCell>{history.status}</TableCell>
                <TableCell>{format(new Date(history.date), "PPP")}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{history.notes || 'N/A'}</TableCell>
              </TableRow>
            ))}
             {!item.statusHistory?.length && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">No history yet.</TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>

        {isAdding ? (
            <div className="p-4 border rounded-lg bg-background space-y-4">
                <h5 className="font-medium">Add New Status Update</h5>
                 <Select value={newStatus} onValueChange={(value) => setNewStatus(value as StatusHistory['status'])}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Under Process">Under Process</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled by Customer">Cancelled by Customer</SelectItem>
                    </SelectContent>
                </Select>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn( "w-full justify-start text-left font-normal", !newDate && "text-muted-foreground" )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newDate ? format(newDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar 
                            mode="single" 
                            selected={newDate} 
                            onSelect={(date) => {
                                setNewDate(date);
                                setIsCalendarOpen(false);
                            }} 
                            disabled={(date) => date > new Date() || (lastUpdateDate ? date <= lastUpdateDate : false)}
                            initialFocus 
                        />
                    </PopoverContent>
                </Popover>
                <Textarea 
                    placeholder="Add notes..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleAddHistory}>Add Update</Button>
                </div>
            </div>
        ) : (
            <div className="text-right">
                <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>Add Status Update</Button>
            </div>
        )}
      </div>
    );
};

const ServiceRow = ({ serviceItem, onUpdate }: { serviceItem: EditableInvoiceItem, onUpdate: () => void }) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = React.useState(false);

    // Get latest status from history or use top-level fields
    const latestStatus = serviceItem.statusHistory?.[serviceItem.statusHistory.length - 1];

    const [editableItem, setEditableItem] = React.useState<Partial<InvoiceItem>>({
        acknowledgmentNumber: serviceItem.acknowledgmentNumber || '',
        processedDate: serviceItem.processedDate || latestStatus?.date,
        status: serviceItem.status || latestStatus?.status,
    });
     
    // Sync when serviceItem prop changes
    React.useEffect(() => {
        const latestStatus = serviceItem.statusHistory?.[serviceItem.statusHistory.length - 1];
        setEditableItem({
             acknowledgmentNumber: serviceItem.acknowledgmentNumber || '',
             processedDate: serviceItem.processedDate || latestStatus?.date,
             status: serviceItem.status || latestStatus?.status,
        })
    }, [serviceItem])


    const handleFieldChange = <K extends keyof InvoiceItem>(field: K, value: InvoiceItem[K]) => {
        setEditableItem(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!firestore) return;
    
        const invoiceDocRef = doc(firestore, 'invoices', serviceItem.invoiceId);
    
        try {
            const docSnap = await getDoc(invoiceDocRef);
            if (docSnap.exists()) {
                const invoiceData = docSnap.data() as Invoice;
                const updatedItems = [...(invoiceData.items || [])];
                const itemToUpdate = updatedItems[serviceItem.originalIndex];
    
                if (itemToUpdate) {
                    updatedItems[serviceItem.originalIndex] = {
                        ...itemToUpdate,
                        acknowledgmentNumber: editableItem.acknowledgmentNumber,
                    };
    
                    await setDoc(invoiceDocRef, { items: updatedItems }, { merge: true });
                    toast({
                        title: "Service Updated",
                        description: "The acknowledgment number has been saved.",
                    });
                    onUpdate(); // Trigger refresh
                }
            }
        } catch (error) {
            console.error("Error updating service:", error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not save the service details.",
            });
        }
    };


    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
            <React.Fragment>
                <TableRow>
                    <TableCell>
                        <CollapsibleTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8">
                            {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
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
                        {editableItem.processedDate ? format(new Date(editableItem.processedDate), "PPP") : <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                    <TableCell>
                        {editableItem.status ? <Badge variant="outline">{editableItem.status}</Badge> : <span className="text-muted-foreground">N/A</span>}
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
                           <ServiceHistory 
                             item={serviceItem} 
                             invoiceId={serviceItem.invoiceId}
                             originalIndex={serviceItem.originalIndex}
                             onHistoryUpdate={onUpdate}
                            />
                        </TableCell>
                    </TableRow>
                </CollapsibleContent>
            </React.Fragment>
        </Collapsible>
    );
};


const ServicesSubTable = ({ row, onUpdate, invoices }: { row: Row<Customer>, onUpdate: () => void, invoices: Invoice[] | null }) => {
    const customerId = row.original.id;

    const services = React.useMemo((): EditableInvoiceItem[] => {
        if (!invoices) return [];
        const customerInvoices = invoices.filter(inv => inv.customerId === customerId);
        return customerInvoices.flatMap(invoice =>
            (invoice.items || []).map((item, index) => ({
                ...item,
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                originalIndex: index
            }))
        );
    }, [invoices, customerId]);


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
                       <ServiceRow key={`${item.invoiceId}-${item.originalIndex}`} serviceItem={item} onUpdate={onUpdate} />
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
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  // Force re-render state
  const [refreshKey, setRefreshKey] = React.useState(0);
  const forceUpdate = React.useCallback(() => setRefreshKey(k => k + 1), []);

  const customersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore, refreshKey]);
  const { data: customersData, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  const customers = customersData || [];

  const invoicesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'invoices') : null, [firestore, refreshKey]);
  const { data: invoicesData } = useCollection<Invoice>(invoicesQuery);
  const invoices = invoicesData || [];

  const handleAddNewCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!firestore) return;
      const form = e.currentTarget;
      const formData = new FormData(form);
      
      const newCustomerRef = doc(collection(firestore, 'customers'));
      const newCustomerData: Customer = {
          id: newCustomerRef.id,
          name: formData.get('name') as string,
          email: formData.get('email') as string,
          mobile: formData.get('mobile') as string,
          aadhaar: formData.get('aadhaar') as string,
          pan: formData.get('pan') as string,
          avatar: `avatar-${(customers.length % 6) + 1}`,
      };
      
      try {
        await setDoc(newCustomerRef, newCustomerData);
        toast({
          title: "Customer Added",
          description: `${newCustomerData.name} has been added successfully.`,
        });
        form.reset();
        forceUpdate();
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
      const updatedData: Partial<Customer> = {
          name: formData.get('name-edit') as string,
          email: formData.get('email-edit') as string,
          mobile: formData.get('mobile-edit') as string,
          aadhaar: formData.get('aadhaar-edit') as string,
          pan: formData.get('pan-edit') as string,
      };

      const customerDocRef = doc(firestore, 'customers', editingCustomer.id);

      try {
        await setDoc(customerDocRef, updatedData, { merge: true });
        toast({
          title: "Customer Updated",
          description: "Customer details have been updated successfully.",
        });
        setEditingCustomer(null);
        forceUpdate();
      } catch (error) {
        console.error("Error updating customer: ", error);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not update customer details.",
        });
      }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'customers', customerId));
    toast({
        title: "Customer Deleted",
        description: "The customer has been deleted.",
      });
    forceUpdate();
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
    state: {
       expanded,
    },
    onExpandedChange: setExpanded,
    key: refreshKey,
  });

  React.useEffect(() => {
    if (searchValue) {
      const newExpandedState: ExpandedState = {};
      filteredData.forEach(customer => {
        const row = table.getRowModel().rowsById[customer.id];
        if (row) {
          newExpandedState[row.index] = true;
        }
      });
  
      // Only update state if it has actually changed to prevent loops
      if (JSON.stringify(newExpandedState) !== JSON.stringify(expanded)) {
        setExpanded(newExpandedState);
      }
    } else {
      if (Object.keys(expanded).length > 0) {
        setExpanded({});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, filteredData, expanded]);


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
      <Dialog open={!!editingCustomer} onOpenChange={(isOpen) => !isOpen && setEditingCustomer(null)}>
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
                            <ServicesSubTable row={row} onUpdate={forceUpdate} invoices={invoices} />
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
