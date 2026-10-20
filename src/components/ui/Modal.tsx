import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import styles from './Modal.module.css'
export function Modal({ title, onClose, children, closeDisabled = false }: { title: string; onClose: () => void; children: ReactNode; closeDisabled?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current!
    const trigger = document.activeElement as HTMLElement | null
    dialog.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = overflow; trigger?.focus() }
  }, [])
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!closeDisabled) onClose() }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      ))
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus()
      }
    }}>
    <header className={styles.header}>
      <h2 id={titleId}>{title}</h2>
      <button type="button" disabled={closeDisabled} onClick={onClose} aria-label="Fechar janela">✕</button>
    </header>
    {children}
  </dialog>
}
