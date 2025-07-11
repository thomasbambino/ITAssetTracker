import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

interface DepartmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  departmentToEdit?: {
    id: number;
    name: string;
    description?: string | null;
    budget?: number | null;
  };
}

const formSchema = z.object({
  name: z.string().min(1, "Department name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  budget: z.coerce.number().min(0).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function DepartmentForm({ isOpen, onClose, departmentToEdit }: DepartmentFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!departmentToEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: departmentToEdit?.name || "",
      description: departmentToEdit?.description || "",
      budget: departmentToEdit?.budget || null,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEditing) {
        await apiRequest({
          method: "PATCH",
          url: `/api/departments/${departmentToEdit.id}`,
          data,
        });
        toast({
          title: "Department updated",
          description: `Department ${data.name} has been updated successfully.`,
        });
      } else {
        console.log("Creating department with data:", data);
        await apiRequest({
          method: "POST",
          url: "/api/departments",
          data,
        });
        toast({
          title: "Department created",
          description: `Department ${data.name} has been created successfully.`,
        });
      }
      // Invalidate the departments query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      onClose();
    } catch (error) {
      console.error("Error saving department:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} department. Please try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Department" : "Create Department"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter department name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter a description (optional)" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Annual budget (optional)" 
                      {...field} 
                      value={field.value === null ? "" : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? null : parseFloat(value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}