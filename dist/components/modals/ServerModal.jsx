"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServerModal;
const react_1 = require("react");
const dialog_1 = require("@/components/ui/dialog");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const z = __importStar(require("zod"));
const form_1 = require("@/components/ui/form");
const sonner_1 = require("sonner");
const formSchema = z.object({
    name: z.string()
        .min(1, 'Server name is required')
        .transform(val => val.trim())
        .refine(val => val.length > 0, 'Server name cannot be only whitespace')
        .refine(val => !val.includes(' '), 'Server name cannot contain spaces'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
function ServerModal({ isOpen, onClose, mode = 'create', onSuccess }) {
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(formSchema),
        defaultValues: {
            name: '',
            password: '',
        },
    });
    const onSubmit = async (values) => {
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
            }
            catch (e) {
                throw new Error('Failed to parse server response');
            }
            if (!response.ok || !data) {
                throw new Error((data === null || data === void 0 ? void 0 : data.error) || 'Failed to process server operation');
            }
            sonner_1.toast.success(mode === 'create' ? 'Server created!' : 'Joined server successfully!');
            form.reset();
            onClose();
            onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(data);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            sonner_1.toast.error(errorMessage);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<dialog_1.Dialog open={isOpen} onOpenChange={onClose}>
      <dialog_1.DialogContent className="sm:max-w-[425px]">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>
            {mode === 'create' ? 'Create a New Server' : 'Join a Server'}
          </dialog_1.DialogTitle>
        </dialog_1.DialogHeader>
        <form_1.Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <form_1.FormField control={form.control} name="name" render={({ field }) => (<form_1.FormItem>
                  <form_1.FormLabel>Server Name</form_1.FormLabel>
                  <form_1.FormControl>
                    <input_1.Input disabled={isLoading} placeholder={mode === 'create' ? 'Enter server name' : 'Enter server name to join'} {...field}/>
                  </form_1.FormControl>
                  <form_1.FormMessage />
                </form_1.FormItem>)}/>
            <form_1.FormField control={form.control} name="password" render={({ field }) => (<form_1.FormItem>
                  <form_1.FormLabel>Password</form_1.FormLabel>
                  <form_1.FormControl>
                    <input_1.Input type="password" disabled={isLoading} placeholder={mode === 'create' ? 'Create server password' : 'Enter server password'} {...field}/>
                  </form_1.FormControl>
                  <form_1.FormMessage />
                </form_1.FormItem>)}/>
            <div className="flex justify-end gap-4">
              <button_1.Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </button_1.Button>
              <button_1.Button type="submit" disabled={isLoading}>
                {mode === 'create' ? 'Create Server' : 'Join Server'}
              </button_1.Button>
            </div>
          </form>
        </form_1.Form>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
