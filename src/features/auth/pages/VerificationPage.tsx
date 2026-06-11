import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Clock, FileText, Loader2 } from "lucide-react";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCertificateDetails } from "../api/auth.queries";
import { branding } from "@/config/branding";

/**
 * Landing page for agents whose account is still `pending` — reached from the
 * login pending-branch. Shows the verification status and submitted documents.
 */
export default function VerificationPage() {
  const { agentCode, randomString } = useParams();
  const { data, isLoading, isError } = useCertificateDetails(agentCode, randomString);

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-warning/15">
          <Clock className="size-7 text-warning" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Account under review</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Thanks for registering with {branding.name}. Our team is verifying your agency details
            — you'll be able to sign in as soon as your account is approved. For queries, contact{" "}
            <a className="font-medium text-primary hover:underline" href={`mailto:${branding.contact.email}`}>
              {branding.contact.email}
            </a>
            .
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading your verification details…
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            We couldn't find a pending verification for this link.
          </p>
        ) : (
          <Card>
            <CardContent className="space-y-3 pt-0 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Agent code</span>
                <span className="font-semibold">#{data?.agentCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="size-3.5" /> Trade license
                </span>
                {data?.tradeLicense ? (
                  <span className="flex items-center gap-1 font-medium text-success">
                    <BadgeCheck className="size-4" /> Submitted
                  </span>
                ) : (
                  <span className="text-warning">Not submitted</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="size-3.5" /> Tax certificate
                </span>
                {data?.taxCertificate ? (
                  <span className="flex items-center gap-1 font-medium text-success">
                    <BadgeCheck className="size-4" /> Submitted
                  </span>
                ) : (
                  <span className="text-warning">Not submitted</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
