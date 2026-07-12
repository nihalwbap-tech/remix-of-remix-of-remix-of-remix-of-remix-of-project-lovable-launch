import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "No More Copium" },
      {
        name: "description",
        content:
          "No More Copium is a workout programming app for coaches and clients. Choose how you want to continue.",
      },
      { property: "og:title", content: "No More Copium" },
      {
        property: "og:description",
        content: "Workout programming for coaches and clients.",
      },
    ],
  }),
  component: EntryPage,
});

function EntryPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          No More Copium
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Choose how you want to continue.</p>

        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" variant="default" onClick={() => setOpen(true)} className="w-full">
            Sign Up / Log In as a Client
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate({ to: "/coach/dashboard" })}
            className="w-full"
          >
            Coach Mode
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Client experience coming soon</DialogTitle>
            <DialogDescription>Client sign-up and login are not available yet.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
