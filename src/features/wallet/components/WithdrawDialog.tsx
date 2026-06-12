import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAgentBanks,
  useWithdrawComplete,
  useWithdrawInitiate,
  balanceQueryKey,
} from "../api/wallet.queries";
import { useInitialData } from "@/features/home/api/home.queries";
import { apiErrorMessage } from "@/types/api";

const NEW_ACCOUNT = "__new__";

/**
 * Withdraw flow per old WithdrawModal.jsx: pick a saved bank account
 * (GET /b2b/banks/all) or enter a new one (country/isoCode, bank, branch,
 * holder, account number, IFSC for India, IBAN), initiate → real OTP →
 * complete. `bankDeatilId` spelling is backend contract.
 */
export function WithdrawDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: banks } = useAgentBanks(open);
  const { data: initialData } = useInitialData();
  const initiate = useWithdrawInitiate();
  const complete = useWithdrawComplete();

  const [accountChoice, setAccountChoice] = useState<string>(NEW_ACCOUNT);
  const [form, setForm] = useState({
    isoCode: "",
    bankName: "",
    branchName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    ibanCode: "",
    amount: "",
  });
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  // Old behavior: default to the first saved account when any exist.
  useEffect(() => {
    if (banks && banks.length > 0) setAccountChoice(banks[0]._id);
  }, [banks]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const reset = () => {
    setRequestId(null);
    setOtp("");
    setForm({
      isoCode: "",
      bankName: "",
      branchName: "",
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      ibanCode: "",
      amount: "",
    });
  };

  const submitInitiate = () => {
    const amount = Number(form.amount) || 0;
    if (amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const payload =
      accountChoice === NEW_ACCOUNT
        ? { isNewBankAccount: true as const, ...form, amount }
        : { isNewBankAccount: false as const, amount, bankDeatilId: accountChoice };

    initiate.mutate(payload, {
      onSuccess: (data) => {
        setRequestId(data.withdrawRequestId);
        toast.success("Withdrawal initiated — enter the OTP sent to you");
      },
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  };

  const submitOtp = () => {
    if (!requestId || otp.length < 4) {
      toast.error("Enter the OTP");
      return;
    }
    complete.mutate(
      { id: requestId, otp },
      {
        onSuccess: () => {
          toast.success("Withdrawal request completed");
          queryClient.invalidateQueries({ queryKey: balanceQueryKey });
          queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] });
          onOpenChange(false);
          reset();
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  const countries = initialData?.countries ?? [];
  const isIndia = form.isoCode === "IN";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Withdraw from wallet</DialogTitle>
          <DialogDescription>
            {requestId
              ? "Enter the one-time code sent to you to confirm the withdrawal."
              : "Funds are transferred to your bank account after review."}
          </DialogDescription>
        </DialogHeader>

        {requestId ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wd-otp">One-time code</Label>
              <Input
                id="wd-otp"
                inputMode="numeric"
                placeholder="12345"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <Button className="w-full" onClick={submitOtp} disabled={complete.isPending}>
              {complete.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm withdrawal
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bank account</Label>
              <Select value={accountChoice} onValueChange={setAccountChoice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(banks ?? []).map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.bankName ?? "Bank"}
                      {b.accountNumber ? ` — ${b.accountNumber}` : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_ACCOUNT}>+ New bank account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {accountChoice === NEW_ACCOUNT && (
              <>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select
                    value={form.isoCode}
                    onValueChange={(v) => setForm((f) => ({ ...f, isoCode: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries
                        .filter((c) => Boolean(c.isocode))
                        .map((c) => (
                          <SelectItem key={c._id} value={String(c.isocode)}>
                            {c.countryName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="wd-bank">Bank name</Label>
                    <Input id="wd-bank" value={form.bankName} onChange={set("bankName")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wd-branch">Branch name</Label>
                    <Input id="wd-branch" value={form.branchName} onChange={set("branchName")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wd-holder">Account holder name</Label>
                  <Input
                    id="wd-holder"
                    value={form.accountHolderName}
                    onChange={set("accountHolderName")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="wd-account">Account number</Label>
                    <Input
                      id="wd-account"
                      value={form.accountNumber}
                      onChange={set("accountNumber")}
                    />
                  </div>
                  {isIndia ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="wd-ifsc">IFSC code</Label>
                      <Input id="wd-ifsc" value={form.ifscCode} onChange={set("ifscCode")} />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="wd-iban">IBAN</Label>
                      <Input id="wd-iban" value={form.ibanCode} onChange={set("ibanCode")} />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="wd-amount">Amount (AED)</Label>
              <Input
                id="wd-amount"
                inputMode="decimal"
                placeholder="e.g. 2000"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value.replace(/[^\d.]/g, "") }))
                }
              />
            </div>

            <Button className="w-full" onClick={submitInitiate} disabled={initiate.isPending}>
              {initiate.isPending && <Loader2 className="size-4 animate-spin" />}
              Request withdrawal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
