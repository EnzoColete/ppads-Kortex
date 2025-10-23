import { AlertCircle } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog"

export interface ErrorDialogState {
  title?: string
  message: string
  details?: string
}

interface ErrorDialogProps extends ErrorDialogState {
  open: boolean
  onClose: () => void
  actionLabel?: string
}

export function ErrorDialog({ open, onClose, title, message, details, actionLabel = "Ok" }: ErrorDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="space-y-2 text-left">
            <AlertDialogTitle className="text-xl font-semibold">
              {title || "Algo deu errado"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground whitespace-pre-line">
              {message}
            </AlertDialogDescription>
            {details ? (
              <p className="text-sm text-muted-foreground/80 bg-muted rounded-md p-3 border border-muted-foreground/10">
                {details}
              </p>
            ) : null}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>{actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
