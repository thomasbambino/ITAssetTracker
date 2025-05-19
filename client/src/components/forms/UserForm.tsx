import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { emailSchema, phoneSchema } from "@/lib/utils";
import { insertUserSchema } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Create a schema for user creation/update
const formSchema = insertUserSchema.extend({
  email: emailSchema,
  phoneNumber: phoneSchema.optional(),
  role: z.enum(['user', 'admin']).default('user'),
  // Add support for departmentId
  departmentId: z.union([
    z.string().transform((str) => {
      if (str === '' || str === null || str === undefined) return null;
      const num = parseInt(str);
      return isNaN(num) ? null : num;
    }),
    z.number(),
    z.null()
  ]).optional().nullable(),
});

type UserFormValues = z.infer<typeof formSchema>;

interface UserFormProps {
  user?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const { toast } = useToast();
  const isUpdateMode = !!user;

  // Define department interface
  interface Department {
    id: number;
    name: string;
    description?: string;
  }

  // Fetch departments from API
  const { data: departments, isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments");
      if (!response.ok) {
        throw new Error("Failed to fetch departments");
      }
      return response.json();
    },
  });

  // Initialize form with default values
  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      department: user?.department || "",
      departmentId: user?.departmentId || null,
      role: user?.role || "user",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      try {
        return await apiRequest({
          method: "POST", 
          url: "/api/users", 
          data: data
        });
      } catch (error) {
        console.error("Create user error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error("Create mutation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      try {
        // Convert role to string to ensure it's sent correctly
        const payload = {
          ...data,
          role: data.role?.toString()
        };
        
        console.log("Updating user with data:", payload);
        return await apiRequest({
          method: "PUT",
          url: `/api/users/${user.id}`,
          data: payload
        });
      } catch (error) {
        console.error("Update user error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      if (onSuccess) onSuccess();
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error) => {
      console.error("Update mutation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: UserFormValues) => {
    if (isUpdateMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormDescription>
                Email address will be used for notifications
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="(123) 456-7890" {...field} />
              </FormControl>
              <FormDescription>
                Format: (123) 456-7890
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              {isLoadingDepartments ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading departments...</span>
                </div>
              ) : (
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Role</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Administrators have full access to manage all aspects of the system
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : isUpdateMode
              ? "Update User"
              : "Create User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
