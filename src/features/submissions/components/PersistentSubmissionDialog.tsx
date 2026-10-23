import { GameCombobox } from '../../games/components/GameCombobox'
import { createVideoPreviewClient } from '../services/video-preview-api'
import { validateSubmissionInput } from '../../../lib/validation/public-input'
import { parseVideoUrl } from '../../../lib/validation/video-url'
import { OfficialGamePicker } from '../../games/components/OfficialGamePicker'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { database } from '../../../lib/firebase/client'
import { createPublicRepository } from '../../../lib/firebase/public-repository'
import type { Game } from '../../shorts/types/models'
import { createSubmissionClient } from '../services/submission-api'
import type { SubmissionResult } from '../services/submission-api'
const repository = createPublicRepository(database)
const submit = createSubmissionClient()
const preview = createVideoPreviewClient()
const defaultServices={listGames:repository.listGames,preview,submit}
export type SubmissionDialogServices=typeof defaultServices
export function PersistentSubmissionDialog({ onClose, onSubmitted, services=defaultServices }: {
  services?:SubmissionDialogServices
  onClose: () => void; onSubmitted: (result: SubmissionResult) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [titleNotice, setTitleNotice] = useState('')
  const titleEdited = useRef(false)
  const channelEdited = useRef(false)
  const [gameId, setGameId] = useState('')
  const [channelName, setChannelName] = useState('')
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const busy = useRef(false)
  const form=useRef<HTMLFormElement>(null),urlField=useRef<HTMLInputElement>(null),titleField=useRef<HTMLInputElement>(null),gameField=useRef<HTMLButtonElement>(null),channelField=useRef<HTMLInputElement>(null),cancelButton=useRef<HTMLButtonElement>(null)
  const returnFocus=useRef<HTMLElement|null>(null),restoreFocus=useRef(false),advanceUrl=useRef<string|null>(null),pasting=useRef(false)
  const latestPreview=useRef<{url:string;status:'pending'|'success'|'failed'}|null>(null)
  const [previewAttempt,setPreviewAttempt]=useState(0),[confirming,setConfirming]=useState(false)
  useLayoutEffect(()=>{if(confirming)cancelButton.current?.focus();else if(restoreFocus.current){restoreFocus.current=false;returnFocus.current?.focus()}},[confirming])
  const cancelConfirmation=()=>{if(busy.current)return;restoreFocus.current=true;setConfirming(false)}
  const requestConfirmation=()=>{
    if(busy.current||choosing||loading||confirming)return
    if(!form.current?.reportValidity())return
    try{validateSubmissionInput({url,gameId,channelName,title})}catch(reason){setError(reason instanceof Error?reason.message:'Confira os campos.');return}
    returnFocus.current=document.activeElement as HTMLElement|null;setError('');setConfirming(true)
  }
  const send=async()=>{
    if(busy.current||choosing||loading||!confirming)return
    busy.current=true;setSending(true);setError('')
    try{validateSubmissionInput({url,gameId,channelName,title});onSubmitted(await services.submit({url,gameId,channelName,title}))}
    catch(reason){setError(reason instanceof Error&&!['AbortError','TimeoutError','TypeError'].includes(reason.name)?reason.message:'Não foi possível confirmar o envio. Seus campos foram preservados; confira o feed antes de tentar novamente.');restoreFocus.current=true;setConfirming(false)}
    finally{busy.current=false;setSending(false)}
  }
  const enter=(event:KeyboardEvent<HTMLElement>)=>event.key==='Enter'&&!event.nativeEvent.isComposing&&event.keyCode!==229&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey

  useEffect(() => {
    let active = true
    void (async()=>{
      let cursor:Parameters<typeof services.listGames>[0]
      const catalog=new Map<string,Game>()
      do {
        const page=await services.listGames(cursor)
        if(!active)return
        page.items.forEach(game=>catalog.set(game.id,game))
        cursor=page.next??undefined
      } while(cursor)
      if(active){setGames([...catalog.values()]);setLoading(false)}
    })().catch(()=>{if(active){setCatalogError('Não foi possível carregar os jogos.');setLoading(false)}})
    return () => { active = false }
  }, [attempt,services])
  useEffect(() => {
    try { parseVideoUrl(url) } catch { return }
    const controller = new AbortController()
    let active = true
    latestPreview.current={url,status:'pending'}
    const timer = setTimeout(() => {
      setTitleNotice('Buscando título original...')
      services.preview(url, controller.signal).then(original => {
        if (!active) return
        latestPreview.current={url,status:'success'}
        if(advanceUrl.current===url&&document.activeElement===urlField.current){advanceUrl.current=null;titleField.current?.focus()}
        if (!channelEdited.current) setChannelName(original.channelName)
        if (original.title === null) {
          setTitleNotice('O TikTok não forneceu um título utilizável. Informe-o manualmente; o vídeo será validado no envio.')
          return
        }
        if (!titleEdited.current) setTitle(original.title)
        setTitleNotice('Título original carregado. Você pode editar o título.')
      }).catch(() => {
        if(active){latestPreview.current={url,status:'failed'};advanceUrl.current=null;setTitleNotice('Título original indisponível. Você pode informar um título; o vídeo será validado no envio.')}
      })
    }, 600)
    return () => { active = false; clearTimeout(timer); controller.abort() }
  }, [url,previewAttempt,services])
  return <Modal title={confirming?"Confirmar compartilhamento":"Compartilhar short"} closeDisabled={sending || choosing} onClose={() => { if(confirming)cancelConfirmation();else if (!busy.current && !choosing) onClose() }}>
    <p hidden={confirming} className="muted">O envio depende da disponibilidade do servidor. Conteúdo que precisar de revisão ficará fora do feed.</p>
    {confirming&&<section aria-label="Confirmar publicação" aria-busy={sending}>
      <p>Tem certeza de que deseja compartilhar este short?</p>
      <p className="muted">{title || 'O título será obtido da fonte quando disponível.'}</p>
      <div className="actions"><button ref={cancelButton} type="button" disabled={sending} onClick={cancelConfirmation}>Cancelar</button><button className="primary" type="button" disabled={sending} onClick={()=>void send()}>{sending?'Enviando...':'Confirmar publicação'}</button></div>
    </section>}
    <form ref={form} hidden={confirming} style={confirming?{display:'none'}:undefined} className="form" aria-busy={sending} onSubmit={event=>{event.preventDefault();requestConfirmation()}}>
      <div className="form-field"><label htmlFor="persistent-url">Link do short *</label>
        <input ref={urlField} id="persistent-url" type="url" required maxLength={2048} value={url} disabled={sending} onPaste={()=>{pasting.current=true}} onBlur={()=>{advanceUrl.current=null}} onKeyDown={event=>{
          if(!enter(event))return;event.preventDefault()
          try{parseVideoUrl(url)}catch{setError('Informe um link válido de uma plataforma suportada.');urlField.current?.reportValidity();return}
          if(latestPreview.current?.url===url&&latestPreview.current.status==='success'){titleField.current?.focus();return}
          advanceUrl.current=url
          if(latestPreview.current?.url!==url||latestPreview.current.status==='failed')setPreviewAttempt(value=>value+1)
        }} onChange={event => { const value=event.target.value;advanceUrl.current=pasting.current?value:null;pasting.current=false;latestPreview.current=null;setUrl(value);if(!channelEdited.current)setChannelName('');if(!titleEdited.current)setTitle('');setTitleNotice('');setError('') }} /></div>
      <div className="form-field"><label htmlFor="persistent-title">Título</label>
        <input ref={titleField} id="persistent-title" onKeyDown={event=>{if(enter(event)){event.preventDefault();gameField.current?.focus()}}} maxLength={500} value={title} disabled={sending} aria-describedby="title-notice"
          onChange={event => { titleEdited.current = true; setTitle(event.target.value) }} />
        <p id="title-notice" className="muted" role="status">{titleNotice || 'Preenchido pela fonte quando disponível. A edição é opcional.'}</p>
      </div>
      <div className="form-field">
        <GameCombobox games={games} value={gameId} onChange={setGameId} disabled={sending||choosing} loading={loading} controlRef={gameField} onAdvance={()=>channelField.current?.focus()}/>
        {catalogError && <p role="alert">{catalogError} <button type="button" disabled={sending || choosing || loading} onClick={() => {
          setLoading(true); setCatalogError(''); setAttempt(value => value + 1)
        }}>Recarregar catálogo</button></p>}
        {!loading && !catalogError && !games.length && <p role="status">Nenhum jogo disponível para publicação.</p>}
      </div>
      <OfficialGamePicker collapsible disabled={sending || loading} onBusyChange={setChoosing} onSelected={game => {
        setGames(current => [...current.filter(item => item.id !== game.id), game]); setGameId(game.id); setError('')
      }} />
      <div className="form-field"><label htmlFor="persistent-channel">Nome do canal</label>
        <input ref={channelField} id="persistent-channel" onKeyDown={event=>{if(enter(event)){event.preventDefault();requestConfirmation()}}} maxLength={80} value={channelName} disabled={sending} onChange={event => {channelEdited.current=true;setChannelName(event.target.value)}} /></div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions"><button type="button" disabled={sending || choosing} onClick={onClose}>Cancelar</button>
        <button className="primary" type="submit" disabled={sending || choosing || loading || !gameId}>{sending ? 'Enviando...' : 'Compartilhar'}</button></div>
    </form>
  </Modal>
}
