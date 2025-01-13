'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string()
    .min(1, 'Server name is required')
    .transform(val => val.trim())
    .refine(val => val.length > 0, 'Server name cannot be only whitespace')
    .refine(val => !val.includes(' '), 'Server name cannot contain spaces'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface ServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'join';
  onSuccess?: (server: any) => void;
}

export default function ServerModal({ isOpen, onClose, mode = 'create', onSuccess }: ServerModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const endpoint = mode === 'create' ? '/api/servers' : '/api/servers/join';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        throw new Error('Failed to parse server response');
      }

      if (!response.ok || !data) {
        throw new Error(data?.error || 'Failed to process server operation');
      }

      toast.success(mode === 'create' ? 'Server created!' : 'Joined server successfully!');
      form.reset();
      onClose();
      onSuccess?.(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create a New Server' : 'Join a Server'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Server Name</FormLabel>
                  <FormControl>
                    <Input 
                      disabled={isLoading} 
                      placeholder={mode === 'create' ? 'Enter server name' : 'Enter server name to join'} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      disabled={isLoading} 
                      placeholder={mode === 'create' ? 'Create server password' : 'Enter server password'} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {mode === 'create' ? 'Create Server' : 'Join Server'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 