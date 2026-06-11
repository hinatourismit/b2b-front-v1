import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSignup } from "../api/auth.queries";
import { useInitialData } from "@/features/home/api/home.queries";
import { apiErrorMessage } from "@/types/api";

/** Mirrors backend resellerRegisterSchema (b2bReseller.schema.js) exactly. */
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()\-_+=[\]{}|:;<>,./?~])[A-Za-z\d!@#$%^&*()\-_+=[\]{}|:;<>,./?~]{8,}$/;

const registerSchema = z.object({
  companyName: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  website: z.string().min(1, "Required"),
  country: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  zipCode: z.string().optional(),
  companyRegistration: z.string().optional(),
  trnNumber: z.string().optional(),
  name: z.string().min(1, "Required"),
  designation: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email address"),
  phoneNumber: z.string().min(1, "Required"),
  whatsappNumber: z.string().min(1, "Required"),
  skypeId: z.string().optional(),
  password: z
    .string()
    .regex(
      passwordRegex,
      "Min 8 characters with at least one letter, one digit and one special character",
    ),
});

type RegisterForm = z.infer<typeof registerSchema>;

interface Attachment {
  name: string;
  file: File;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const signup = useSignup();
  const { data: initialData } = useInitialData();
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const addAttachment = (file: File | undefined) => {
    if (!file) return;
    setAttachments((prev) => [...prev, { name: file.name, file }]);
  };

  const onSubmit = (values: RegisterForm) => {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== "") fd.append(key, String(value));
    });
    attachments.forEach((att, i) => {
      fd.append(`attachments[${i}][name]`, att.name);
      fd.append(`attachments[${i}][file]`, att.file);
    });

    signup.mutate(fd, {
      onSuccess: () => {
        toast.success("Registration submitted — your account is pending approval");
        navigate("/login");
      },
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  };

  const countries = initialData?.countries ?? [];

  const field = (
    name: keyof RegisterForm,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} {...props} {...form.register(name)} />
      {form.formState.errors[name] && (
        <p className="text-xs text-destructive">{form.formState.errors[name]?.message}</p>
      )}
    </div>
  );

  return (
    <AuthLayout
      panel={
        <div className="space-y-4">
          <p className="font-display text-4xl font-medium leading-tight">
            Partner with us, grow your agency.
          </p>
          <p className="max-w-sm text-primary-foreground/70">
            Net rates on hotels, attractions, visas and more — with your own markup control and a
            dedicated wallet.
          </p>
        </div>
      }
    >
      <div className="mb-7">
        <h1 className="text-3xl font-semibold tracking-tight">Create a partner account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tell us about your agency. Accounts are reviewed before activation.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-foreground">
            Company
          </legend>
          {field("companyName", "Company name")}
          {field("address", "Address")}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select onValueChange={(v) => form.setValue("country", v, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.countryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.country && (
                <p className="text-xs text-destructive">{form.formState.errors.country.message}</p>
              )}
            </div>
            {field("city", "City")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("zipCode", "Zip code (optional)", { inputMode: "numeric" })}
            {field("website", "Website")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("companyRegistration", "Company registration (optional)")}
            {field("trnNumber", "TRN number (optional)")}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-foreground">
            Contact person
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {field("name", "Full name")}
            {field("designation", "Designation")}
          </div>
          {field("email", "Email", { type: "email" })}
          <div className="grid grid-cols-2 gap-3">
            {field("phoneNumber", "Phone number")}
            {field("whatsappNumber", "WhatsApp number")}
          </div>
          {field("skypeId", "Skype ID (optional)")}
          {field("password", "Password", { type: "password" })}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-foreground">
            Documents (optional)
          </legend>
          <p className="text-xs text-muted-foreground">
            Trade license, tax certificate or other supporting documents.
          </p>
          {attachments.map((att, i) => (
            <div
              key={`${att.name}-${i}`}
              className="flex items-center justify-between rounded-md border bg-secondary/50 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 truncate">
                <Paperclip className="size-3.5 shrink-0" /> {att.name}
              </span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${att.name}`}
              >
                <X className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            <Paperclip className="size-4" /> Attach a document
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                addAttachment(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </fieldset>

        <Button type="submit" className="w-full" size="lg" disabled={signup.isPending}>
          {signup.isPending && <Loader2 className="size-4 animate-spin" />}
          Submit registration
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already a partner?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
