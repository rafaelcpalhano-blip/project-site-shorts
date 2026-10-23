import { GameCombobox } from './GameCombobox'
import { validateGameRequestInput } from '../../../lib/validation/public-input'
import { useState } from 'react'
import { games } from '../../shorts/data/fixtures'
import { useDemo } from '../../../app/providers/demo-context'
export function GamePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { requestGame } = useDemo()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const results = query.trim() ? games.filter(game => game.name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))) : []
  return <div className="form-field">
    <GameCombobox games={games} value={value} onChange={onChange} />
    <button type="button" className="text-button" aria-expanded={open} onClick={() => setOpen(!open)}>Cadastrar jogo</button>
    {open && <section className="inset" aria-label="Cadastrar jogo">
      <label htmlFor="game-query">Qual jogo você procura?</label>
      <input id="game-query" maxLength={100} value={query} onChange={event => { setQuery(event.target.value); setMessage('') }} />
      <p className="muted">Consulta demonstrativa ao catálogo local. Nenhuma API externa é consultada.</p>
      {results.map(game => <button className="result-button" key={game.id} type="button" onClick={() => {
        onChange(game.id); setOpen(false); setQuery(''); setMessage('')
      }}>Confirmar {game.name}</button>)}
      {query.trim() && results.length === 0 && <>
        <p>Jogo não encontrado. Sua solicitação ficará pendente de revisão nesta sessão.</p>
        <button type="button" onClick={() => {
                    try {
            requestGame(validateGameRequestInput({ name: query }).name)
            setMessage('Solicitação pendente. Selecione um jogo cadastrado para publicar o short.')
          } catch (reason) {
            setMessage(reason instanceof Error ? reason.message : 'Nome de jogo inválido.')
          }
        }}>Solicitar revisão</button>
      </>}
      <p role="status">{message}</p>
    </section>}
  </div>
}

