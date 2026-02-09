import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccount } from "@/contexts/AccountContext";
import { Plus } from "lucide-react";
import { toast } from "sonner";

// Schema with conditional validation
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.enum(["activecampaign", "benchmark"]),
  apiKey: z.string().min(1, "API Key/Token is required"),
  apiUrl: z.string().optional(),
}).refine((data) => {
  // Logic: If provider is ActiveCampaign, apiUrl is REQUIRED
  if (data.provider === "activecampaign" && (!data.apiUrl || data.apiUrl.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "API URL is required for ActiveCampaign",
  path: ["apiUrl"],
});

export function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  const { addAccount } = useAccount();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      provider: "activecampaign", // Default to AC
      apiKey: "",
      apiUrl: "",
    },
  });

  // Watch the provider to conditionally show/hide fields
  const selectedProvider = form.watch("provider");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await addAccount({
        name: values.name,
        provider: values.provider,
        apiKey: values.apiKey,
        // Only send apiUrl if it's ActiveCampaign
        apiUrl: values.provider === "activecampaign" ? values.apiUrl : undefined,
      });
      toast.success("Account added successfully");
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to add account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2">
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Connect a new ActiveCampaign or Benchmark Email account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. My Main Account" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Provider Selector */}
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="activecampaign">ActiveCampaign</SelectItem>
                      <SelectItem value="benchmark">Benchmark Email</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* API Key Field */}
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{selectedProvider === 'benchmark' ? 'API Token' : 'API Key'}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Paste your key here..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* API URL Field (Only for ActiveCampaign) */}
            {selectedProvider === "activecampaign" && (
              <FormField
                control={form.control}
                name="apiUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your-account.api-us1.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit">Connect Account</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}