import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface RunNowConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    repoName: string;
    loading: boolean;
}

export function RunNowConfirmationModal({ isOpen, onClose, onConfirm, repoName, loading }: RunNowConfirmationModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Run Backup Now
                    </DialogTitle>
                    <DialogDescription>
                        Manually trigger the backup workflow for <strong>{repoName}</strong>?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-sm text-muted-foreground">
                    <p>
                        This will dispatch the GitHub Action immediately on the target repository.
                    </p>
                    <p>
                        The status status will be updated to "Pending" and fresh logs should appear shortly.
                    </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} disabled={loading}>
                        {loading ? "Triggering..." : "Confirm & Run"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
