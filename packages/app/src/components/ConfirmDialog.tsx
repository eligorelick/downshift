import { type ReactNode, useEffect, useId, useRef } from 'react'
import '../styles/history.css'
import { Button } from './Button'

interface Props {
  open: boolean
  title: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  children: ReactNode
}

// A native modal <dialog>: the browser traps focus inside it and closes it on Escape.
export function ConfirmDialog({ open, title, confirmLabel, onConfirm, onCancel, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  // Unique per dialog: Settings renders two at once, and a shared id would name both after the first.
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a backdrop click is a convenience; Escape and Cancel work from the keyboard
    <dialog
      ref={ref}
      className="confirm"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      onClick={(e) => {
        // Only a click on the backdrop, outside the box; the dialog's own padding and gaps also report the
        // dialog as the target, and a tap there must not cancel.
        const box = ref.current?.getBoundingClientRect()
        if (e.target !== ref.current || !box) return
        const inside =
          e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom
        if (!inside) onCancel()
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <div className="confirm-body">{children}</div>
      <div className="row confirm-actions">
        {/* Cancel is focused first, so a stray Enter never destroys data. */}
        <Button variant="secondary" onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button className="btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
