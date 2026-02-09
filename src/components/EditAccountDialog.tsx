import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccount, Account } from "@/contexts/AccountContext";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.enum(["activecampaign", "benchmark"]),
  apiKey: z.string().min(1, "API Key is required"),
  apiUrl: z.string().optional(),
}).refine((data) => {
  if (data.provider === "activecampaign" && (!data.apiUrl || data.apiUrl.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "API URL is required for ActiveCampaign",
  path: ["apiUrl"],
});

interface EditAccountDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAccountDialog({ account, open, onOpenChange }: EditAccountDialogProps) {
  const { updateAccount } = useAccount();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      provider: "activecampaign",
      apiKey: "",
      apiUrl: "",
    },
  });

  // Watch provider to toggle UI
  const selectedProvider = form.watch("provider");

  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        provider: account.provider || "activecampaign",
        apiKey: account.apiKey,
        apiUrl: account.apiUrl || "",
      });
    }
  }, [account, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!account) return;
    try {
      await updateAccount(account.id, {
        name: values.name,
        provider: values.provider,
        apiKey: values.apiKey,
        apiUrl: values.provider === "activecampaign" ? values.apiUrl : undefined,
      });
      toast.success("Account updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update account details and credentials.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled> 
                    {/* Disabled because changing provider on edit might be confusing, but you can enable it if you want */}
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

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{selectedProvider === 'benchmark' ? 'API Token' : 'API Key'}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedProvider === "activecampaign" && (
              <FormField
                control={form.control}
                name="apiUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}