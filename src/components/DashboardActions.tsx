import { useState } from "react";
import { Trash2, Shield } from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";
import { Loader } from "./ui/Loader";

export default function DashboardActions() {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);

    const handleDeleteClick = (e: React.FormEvent) => {
        e.preventDefault();
        setFormRef(e.target as HTMLFormElement);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (formRef) {
            setIsDeleting(true);
            formRef.submit();
        }
    };

    return (
        <>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 text-card-foreground shadow-sm p-6">
                <h3 className="font-semibold text-destructive flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" /> Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data.
                </p>
                <form
                    method="POST"
                    onSubmit={handleDeleteClick}
                >
                    <input
                        type="hidden"
                        name="action"
                        value="delete_account"
                    />
                    <button
                        type="submit"
                        disabled={isDeleting}
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-4 py-2"
                    >
                        {isDeleting ? <Loader className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {isDeleting ? "Deleting..." : "Delete Account"}
                    </button>
                </form>
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Account"
                description="Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data."
                confirmText="Delete Account"
                variant="danger"
            />
        </>
    );
}
