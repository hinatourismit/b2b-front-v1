import { useState } from "react";
import { CreditCard, Landmark, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAddDepositRequest, useCardDeposit, useCompanyBanks } from "../api/wallet.queries";
import { formatPrice } from "@/lib/utils";
import { apiErrorMessage } from "@/types/api";

const CARD_FEE_RATE = 0.03;

function CardTopUp({ onDone }: { onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const cardDeposit = useCardDeposit();
  const value = Number(amount) || 0;
  // Backend (b2bWalletDepositController.js:28): gateway charges the sent
  // amount and credits amount − 3% to the wallet. Gross-up so the agent's
  // wallet receives exactly what they typed.
  const charged = Math.round((value / (1 - CARD_FEE_RATE)) * 100) / 100;
  const fee = Math.round((charged - value) * 100) / 100;

  const submit = () => {
    if (value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    cardDeposit.mutate(charged, {
      onSuccess: (html) => {
        // Old-app behavior (CCAvenuePaymentComponent.jsx:32): response is an
        // HTML page → open it for the gateway flow.
        const winUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        window.open(winUrl, "win");
        onDone();
      },
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="topup-amount">Amount (AED)</Label>
        <Input
          id="topup-amount"
          inputMode="decimal"
          placeholder="e.g. 1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
        />
      </div>
      <div className="space-y-1 rounded-lg bg-secondary/60 p-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Credited to wallet</span>
          <span className="tabular-nums">{formatPrice(value)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Card charge (3%)</span>
          <span className="tabular-nums">{formatPrice(fee)}</span>
        </div>
        <div className="flex justify-between border-t pt-1 font-semibold">
          <span>Charged to card</span>
          <span className="tabular-nums">{formatPrice(charged)}</span>
        </div>
      </div>
      <Button className="w-full" onClick={submit} disabled={cardDeposit.isPending}>
        {cardDeposit.isPending && <Loader2 className="size-4 animate-spin" />}
        Continue to payment
      </Button>
    </div>
  );
}

function BankDeposit({ onDone }: { onDone: () => void }) {
  const { data: banks } = useCompanyBanks(true);
  const addRequest = useAddDepositRequest();
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [companyBankId, setCompanyBankId] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);

  const submit = () => {
    if (!referenceNumber || !amount || !companyBankId || !receipt) {
      toast.error("All fields are required, including the receipt");
      return;
    }
    addRequest.mutate(
      { referenceNumber, amount, companyBankId, receipt },
      {
        onSuccess: () => {
          toast.success("Deposit request submitted", {
            description: "Your wallet will be credited once the deposit is verified.",
          });
          onDone();
        },
        onError: (err) => toast.error(apiErrorMessage(err)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Deposited to bank</Label>
        <Select value={companyBankId} onValueChange={setCompanyBankId}>
          <SelectTrigger>
            <SelectValue placeholder="Select the bank you transferred to" />
          </SelectTrigger>
          <SelectContent>
            {(banks ?? []).map((b) => (
              <SelectItem key={b._id} value={b._id}>
                {b.bankName ?? "Bank"}
                {b.accountNumber ? ` — ${b.accountNumber}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dep-ref">Reference number</Label>
          <Input
            id="dep-ref"
            placeholder="Transfer reference"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dep-amount">Amount (AED)</Label>
          <Input
            id="dep-amount"
            inputMode="decimal"
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Receipt</Label>
        {receipt ? (
          <div className="flex items-center justify-between rounded-md border bg-secondary/50 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 truncate">
              <Paperclip className="size-3.5 shrink-0" /> {receipt.name}
            </span>
            <button type="button" onClick={() => setReceipt(null)} aria-label="Remove receipt">
              <X className="size-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            <Paperclip className="size-4" /> Upload transfer receipt
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>
      <Button className="w-full" onClick={submit} disabled={addRequest.isPending}>
        {addRequest.isPending && <Loader2 className="size-4 animate-spin" />}
        Submit deposit request
      </Button>
    </div>
  );
}

export function TopUpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Top up wallet</DialogTitle>
          <DialogDescription>
            Pay by card for instant credit, or submit a bank-transfer deposit for verification.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="card">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="card">
              <CreditCard className="size-4" /> Card
            </TabsTrigger>
            <TabsTrigger value="bank">
              <Landmark className="size-4" /> Bank transfer
            </TabsTrigger>
          </TabsList>
          <TabsContent value="card" className="pt-3">
            <CardTopUp onDone={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="bank" className="pt-3">
            <BankDeposit onDone={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
