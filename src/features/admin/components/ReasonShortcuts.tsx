import { useId } from 'react'
import { editReason, formatReason, hasMixedReasons, reasonOptions, toggleReason } from '../services/reason-shortcuts'
import type { ReasonDraft } from '../services/reason-shortcuts'
import styles from './ReasonShortcuts.module.css'
export function ReasonShortcuts({ value, onChange, disabled }: { value: ReasonDraft; onChange: (value: ReasonDraft) => void; disabled: boolean }) {
  const id = useId()
  const mixed = hasMixedReasons(value)
  return <div className={styles.field}>
    <fieldset disabled={disabled} className={styles.shortcuts}>
      <legend>Atalhos para o motivo</legend>
      {[true, false].map(positive => <div key={String(positive)} role="group" aria-label={positive ? 'Motivos positivos' : 'Motivos negativos'} className={styles.group}>
        {reasonOptions.filter(option => option.positive === positive).map(option => {
          const checked = value.selected.includes(option.id)
          const next = toggleReason(value, option.id)
          return <label key={option.id} className={styles.option}>
            <input type="checkbox" checked={checked} disabled={!checked && formatReason(next).length > 500} onChange={() => onChange(next)} />
            <span>{option.text}</span>
          </label>
        })}
      </div>)}
    </fieldset>
    <label htmlFor={id}>Motivo da decisão</label>
    <textarea id={id} required minLength={5} maxLength={500} disabled={disabled} value={formatReason(value)} onChange={event => onChange(editReason(value, event.target.value))} aria-describedby={id + '-help' + (mixed ? ' ' + id + '-warning' : '')} />
    <small id={id + '-help'} className="muted">Selecione atalhos e acrescente observações ao final, ou escreva um motivo personalizado. Limite de 500 caracteres.</small>
    {mixed && <p id={id + '-warning'} role="alert">Você selecionou motivos positivos e negativos. Confira se eles são coerentes com a decisão antes de confirmar.</p>}
  </div>
}
