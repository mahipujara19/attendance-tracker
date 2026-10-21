import Icon from './Icon'
import Modal from './Modal'
import { Spinner } from './States'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  pending = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={pending ? () => {} : onCancel} size="sm">
      <div className="modal-body">
        <p>{message}</p>
        {error && (
          <div className="alert alert-error" role="alert">
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
      <footer className="modal-footer">
        <button className="btn btn-ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={pending}>
          {pending ? <Spinner /> : <Icon name="trash" size={16} />}
          {pending ? 'Working…' : error ? 'Try again' : confirmLabel}
        </button>
      </footer>
    </Modal>
  )
}
