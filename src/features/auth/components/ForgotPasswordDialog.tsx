import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword, useForgotPasswordConfirm } from "../api/auth.queries";
import { apiErrorMessage } from "@/types/api";

const emailSchema = z.object({ email: z.string().email("Enter a valid email address") });

const confirmSchema = z
  .object({
    otp: z.string().min(4, "Enter the OTP you received"),
    newPassword: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

/**
 * Two-step flow matching the backend OTP contract:
 * PATCH /b2b/resellers/forget/password → OTP sent to email/WhatsApp
 * PATCH /b2b/resellers/forget/password/confirm → password reset
 */
export function ForgotPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState<string | null>(null);
  const request = useForgotPassword();
  const confirm = useForgotPasswordConfirm();

  const emailForm = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });
  const confirmForm = useForm<z.infer<typeof confirmSchema>>({ resolver: zodResolver(confirmSchema) });

  const reset = () => {
    setEmail(null);
    emailForm.reset();
    confirmForm.reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Reset password</DialogTitle>
          <DialogDescription>
            {email
              ? `We sent a one-time code to ${email}. Enter it below with your new password.`
              : "Enter your account email and we'll send you a one-time code."}
          </DialogDescription>
        </DialogHeader>

        {email === null ? (
          <form
            className="space-y-4"
            onSubmit={emailForm.handleSubmit((values) =>
              request.mutate(values.email, {
                onSuccess: () => {
                  toast.success("OTP sent — check your email");
                  setEmail(values.email);
                },
                onError: (err) => toast.error(apiErrorMessage(err)),
              }),
            )}
          >
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Email</Label>
              <Input id="fp-email" type="email" placeholder="agency@example.com" {...emailForm.register("email")} />
              {emailForm.formState.errors.email && (
                <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={request.isPending}>
              {request.isPending && <Loader2 className="size-4 animate-spin" />}
              Send code
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={confirmForm.handleSubmit((values) =>
              confirm.mutate(
                { email, ...values },
                {
                  onSuccess: () => {
                    toast.success("Password updated — sign in with your new password");
                    onOpenChange(false);
                    reset();
                  },
                  onError: (err) => toast.error(apiErrorMessage(err)),
                },
              ),
            )}
          >
            <div className="space-y-1.5">
              <Label htmlFor="fp-otp">One-time code</Label>
              <Input id="fp-otp" inputMode="numeric" placeholder="12345" {...confirmForm.register("otp")} />
              {confirmForm.formState.errors.otp && (
                <p className="text-xs text-destructive">{confirmForm.formState.errors.otp.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-new">New password</Label>
              <Input id="fp-new" type="password" {...confirmForm.register("newPassword")} />
              {confirmForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">{confirmForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-confirm">Confirm password</Label>
              <Input id="fp-confirm" type="password" {...confirmForm.register("confirmPassword")} />
              {confirmForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">{confirmForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={reset}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={confirm.isPending}>
                {confirm.isPending && <Loader2 className="size-4 animate-spin" />}
                Reset password
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
