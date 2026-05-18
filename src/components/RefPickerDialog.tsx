import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RefPickerItem {
  id: string;
  title: string;
}

interface RefPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: RefPickerItem[];
  onPick: (id: string) => void;
  isPending?: boolean;
}

export function RefPickerDialog({
  open,
  onOpenChange,
  title,
  items,
  onPick,
  isPending = false,
}: RefPickerDialogProps) {
  const [search, setSearch] = useState("");

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  function handleOpenChange(next: boolean) {
    if (!next) setSearch("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto -mx-1">
          {filtered.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-gray-400">No records found.</p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => { onPick(item.id); handleOpenChange(false); }}
                    className="w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="font-medium text-gray-800">{item.title}</span>
                    <span className="ml-2 font-mono text-xs text-gray-400">{item.id.slice(0, 8)}…</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
