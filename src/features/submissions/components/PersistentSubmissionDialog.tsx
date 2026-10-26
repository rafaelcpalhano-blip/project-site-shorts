import {extractSharedVideoUrl,sharedVideoInput} from '../../../lib/validation/shared-video-url'
import {createVideoLinkClient} from '../services/video-link-api'
import {getGameCatalogVersion,subscribeGameCatalog,invalidateGameCatalog} from '../../games/services/catalog-cache'
import { GameCombobox } from '../../games/components/GameCombobox'
import { createVideoPreviewClient,SourceRateLimitError } from '../services/video-preview-api'
import { validateSubmissionInput } from '../../../lib/validation/public-input'
import { OfficialGamePicker } from '../../games/components/OfficialGamePicker'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
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
const resolveLink = createVideoLinkClient()
const defaultServices={listGames:repository.listGames,preview,submit}
export type SubmissionDialogServices=typeof defaultServices
export function PersistentSubmissionDialog({ onClose, onSubmitted, services=defaultServices }: {
  services?:SubmissionDialogServices
  onClose: () => void; onSubmitted: (result: SubmissionResult) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [titleNotice, setTitleNotice] = useState('')
  const [previewFailed,setPreviewFailed]=useState(false)
  const titleEdited = useRef(false)
  const channelEdited = useRef(false)
  const [gameId, setGameId] = useState('')
  const [channelName, setChannelName] = useState('')
  const catalogVersion=useSyncExternalStore(subscribeGameCatalog,getGameCatalogVersion,getGameCatalogVersion)
  const [games, setGames] = useState<Game[]>([])
  const [catalogBusy, setLoading] = useState(true)
  const [loadedCatalogVersion,setLoadedCatalogVersion]=useState(catalogVersion)
  const loading=catalogBusy||loadedCatalogVersion!==catalogVersion
  const [catalogError, setCatalogError] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const busy = useRef(false)
  const form=useRef<HTMLFormElement>(null),urlField=useRef<HTMLInputElement>(null),titleField=useRef<HTMLInputElement>(null),gameField=useRef<HTMLButtonElement>(null),channelField=useRef<HTMLInputElement>(null),cancelButton=useRef<HTMLButtonElement>(null)
  const returnFocus=useRef<HTMLElement|null>(null),restoreFocus=useRef(false),advanceUrl=useRef<string|null>(null)
  const latestPreview=useRef<{url:string;status:'pending'|'success'|'failed'}|null>(null)
  const [previewAttempt,setPreviewAttempt]=useState(0),[confirming,setConfirming]=useState(false)
  useLayoutEffect(()=>{if(confirming)cancelButton.current?.focus();else if(restoreFocus.current){restoreFocus.current=false;returnFocus.current?.focus()}},[confirming])
  const cancelConfirmation=()=>{if(busy.current)return;restoreFocus.current=true;setConfirming(false)}
  const changeUrl=(raw:string,pasted=false)=>{const value=extractSharedVideoUrl(raw);advanceUrl.current=pasted?value:null;latestPreview.current=null;setPreviewFailed(false);setUrl(value);if(!channelEdited.current)setChannelName('');if(!titleEdited.current)setTitle('');setTitleNotice('');setError('')}
  const requestConfirmation=()=>{
    if(busy.current||choosing||loading||confirming)return
    if(!form.current?.reportValidity())return
    try{if(sharedVideoInput(url).short)throw Error('Aguarde a resolução do link curto. Se falhar, tente novamente ou use o link completo.');validateSubmissionInput({url,gameId,channelName,title})}catch(reason){setError(reason instanceof Error?reason.message:'Confira os campos.');return}
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
      if(active){setGames([...catalog.values()]);setGameId(current=>catalog.has(current)?current:'');setCatalogError('');setLoadedCatalogVersion(catalogVersion);setLoading(false)}
    })().catch(()=>{if(active){setGames([]);setGameId('');setCatalogError('Não foi possível carregar os jogos.');setLoadedCatalogVersion(catalogVersion);setLoading(false)}})
    return () => { active = false }
  }, [attempt,services,catalogVersion])
  useEffect(() => {
    try { sharedVideoInput(url) } catch { return }
    const controller = new AbortController()
    let active = true
    latestPreview.current={url,status:'pending'}
    const timer = setTimeout(() => {
      setPreviewFailed(false);setTitleNotice(sharedVideoInput(url).short?'Resolvendo link do TikTok...':'Buscando título original...')
      resolveLink(url,controller.signal).then(resolved=>{
        if(!active)return null
        if(resolved!==url){if(advanceUrl.current===url)advanceUrl.current=resolved;setUrl(resolved);return null}
        return services.preview(resolved,controller.signal)
      }).then(original => {
        if(!original)return
        if (!active) return
        setPreviewFailed(false);latestPreview.current={url,status:'success'}
        if(advanceUrl.current===url&&document.activeElement===urlField.current){advanceUrl.current=null;titleField.current?.focus()}
        if (!channelEdited.current) setChannelName(original.channelName)
        if (original.title === null) {
          setTitleNotice('O identificador do canal vem do link; não é o nome de exibição verificado. Título opcional. O vídeo será validado ao confirmar o envio.')
          return
        }
        if (!titleEdited.current) setTitle(original.title)
        setTitleNotice('Título original carregado. Você pode editar o título.')
      }).catch(reason => {
        if(active){setPreviewFailed(true);latestPreview.current={url,status:'failed'};advanceUrl.current=null;setTitleNotice(reason instanceof SourceRateLimitError?reason.message:sharedVideoInput(url).short?'Não foi possível resolver o link curto do TikTok. Tente novamente ou copie o link completo do vídeo.':'Título original indisponível. Você pode informar um título; o vídeo será validado no envio.')}
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
        <input ref={urlField} id="persistent-url" type="url" required maxLength={2048} value={url} disabled={sending} onPaste={event=>{event.preventDefault();changeUrl(event.clipboardData.getData('text'),true)}} onBlur={()=>{advanceUrl.current=null}} onKeyDown={event=>{
          if(!enter(event))return;event.preventDefault()
          try{sharedVideoInput(url)}catch{setError('Informe um link válido de uma plataforma suportada.');urlField.current?.reportValidity();return}
          if(latestPreview.current?.url===url&&latestPreview.current.status==='success'){titleField.current?.focus();return}
          advanceUrl.current=url
          if(latestPreview.current?.url!==url||latestPreview.current.status==='failed')setPreviewAttempt(value=>value+1)
        }} onChange={event => changeUrl(event.target.value)} /></div>
      <div className="form-field"><label htmlFor="persistent-title">Título</label>
        <input ref={titleField} id="persistent-title" onKeyDown={event=>{if(enter(event)){event.preventDefault();gameField.current?.focus()}}} maxLength={500} value={title} disabled={sending} aria-describedby="title-notice"
          onChange={event => { titleEdited.current = true; setTitle(event.target.value) }} />
        <p id="title-notice" className="muted" role="status">{titleNotice || 'Preenchido pela fonte quando disponível. A edição é opcional.'}</p>
        {previewFailed&&<button type="button" disabled={sending} onClick={()=>setPreviewAttempt(value=>value+1)}>Tentar obter título e canal</button>}
      </div>
      <div className="form-field">
        <GameCombobox games={loading?[]:games} value={gameId} onChange={setGameId} disabled={sending||choosing||!!catalogError&&games.length===0} loading={loading} controlRef={gameField} onAdvance={()=>channelField.current?.focus()}/>
        {loadedCatalogVersion===catalogVersion && catalogError && <p role="alert">{catalogError} <button type="button" disabled={sending || choosing || loading} onClick={() => {
          setLoading(true); setCatalogError(''); invalidateGameCatalog(); setAttempt(value => value + 1)
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
