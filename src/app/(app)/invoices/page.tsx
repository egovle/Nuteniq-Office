"use client";

import { useState, useRef, type ChangeEvent } from "react";
import {
  extractInvoiceData,
  type InvoiceDataExtractionOutput,
} from "@/ai/flows/invoice-data-extraction";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { type Customer } from "@/lib/data";

export default function InvoicePage() {
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvoiceDataExtractionOutput | null>(
    null
  );
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const customersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const { data: customersData } = useCollection<Customer>(customersQuery);
  const customers = customersData || [];

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setPreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const dataUri = reader.result as string;
      try {
        const extractedData = await extractInvoiceData({
          invoiceDataUri: dataUri,
        });
        setResult(extractedData);
      } catch (error) {
        console.error("Error extracting invoice data:", error);
        toast({
          variant: "destructive",
          title: "Extraction Failed",
          description:
            "Could not extract data from the invoice. Please try a clearer image.",
        });
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = (error) => {
      console.error("File reading error:", error);
      toast({
        variant: "destructive",
        title: "File Error",
        description: "There was an error reading the uploaded file.",
      });
      setLoading(false);
    };
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveData = () => {
    if (!result || !firestore) return;

    let customer = customers.find(c => c.name.toLowerCase() === result.customerName.toLowerCase());
    let customerId;

    if (!customer) {
      customerId = doc(collection(firestore, 'customers')).id;
      addDocumentNonBlocking(collection(firestore, 'customers'), {
        id: customerId,
        name: result.customerName,
        email: '',
        phone: result.customerPhone || '',
        mobile: result.customerPhone || '',
        avatar: `avatar-${(customers.length % 6) + 1}`,
        aadhaar: result.aadhaarNumber || '',
        pan: ''
      });
    } else {
        customerId = customer.id;
    }
    
    const newInvoice = {
        invoiceNumber: result.invoiceNumber,
        customerId: customerId,
        date: result.date,
        items: result.items || [],
        total: result.items?.reduce((acc, item) => acc + item.total, 0) || 0
    };
    
    const newDocRef = doc(collection(firestore, 'invoices'));
    addDocumentNonBlocking(collection(firestore, 'invoices'), { ...newInvoice, id: newDocRef.id });

    toast({
        title: "Data Saved!",
        description: `Invoice ${result.invoiceNumber} has been saved.`
    })

    // Reset state after saving
    setResult(null);
    setPreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };


  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upload Invoice</CardTitle>
          <CardDescription>
            Select an image of an invoice to extract its data automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or PDF (MAX. 800x400px)
                </p>
              </div>
              <Input
                id="dropzone-file"
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, application/pdf"
              />
            </label>
          </div>
          {preview && (
            <div>
              <Label>Invoice Preview</Label>
              <div className="mt-2 overflow-hidden rounded-md border">
                <img
                  src={preview}
                  alt="Invoice preview"
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleUploadClick}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Processing..." : "Upload an Invoice"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extracted Data</CardTitle>
          <CardDescription>
            The data extracted from the uploaded invoice will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full" />
              </div>
               <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full" />
              </div>
              <Skeleton className="h-24 w-full" />
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={result.customerName || ""}
                  readOnly
                />
              </div>
               <div>
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input
                  id="customerPhone"
                  value={result.customerPhone || ""}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={result.invoiceNumber || ""}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" value={result.date || ""} readOnly />
              </div>
              <div>
                <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                <Input
                  id="aadhaarNumber"
                  value={result.aadhaarNumber || ""}
                  readOnly
                />
              </div>
              <div>
                <Label>Items</Label>
                <div className="rounded-md border mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No data extracted yet.</p>
            </div>

          )}
        </CardContent>
        {result && !loading && (
          <CardFooter>
            <Button className="w-full" onClick={handleSaveData}>Save Extracted Data</Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
