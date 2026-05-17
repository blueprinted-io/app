import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string) => void;
  isPending: boolean;
  title?: string;
  noteLabel?: string;
  placeholder?: string;
  confirmLabel?: string;
  pendingLabel?: string;
}

export function ReturnDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  title = "Return record",
  noteLabel = "Note for the author",
  placeholder = "Explain what needs to change before resubmission…",
  confirmLabel = "Send return",
  pendingLabel = "Returning…",
}: ReturnDialogProps) {
  const [note, setNote] = useState("");

  function handleConfirm() {
    if (!note.trim()) return;
    onConfirm(note.trim());
  }

  function handleOpenChange(next: boolean) {
    if (!next) setNote("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="return-note">{noteLabel} <span className="text-red-500">*</span></Label>
          <Textarea
            id="return-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={placeholder}
            rows={4}
            autoFocus
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>
            Cancel
          </DialogClose>
          <Button onClick={handleConfirm} disabled={!note.trim() || isPending}>
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
