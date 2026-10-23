import {GameCover} from '../../games/components/GameCover'
import {useId,useRef,useState} from 'react'
import type {User} from 'firebase/auth'
import {validateManualGameDetails} from '../../../lib/validation/manual-game-details'
import {saveManualGame} from '../services/game-catalog-api'
import type {CatalogDetail} from '../services/game-catalog-api'
import {AdminRequestError} from '../services/moderation-api'
export function ManualGameEditor({user,detail,onSaved,onUnauthorized,onBusyChange}:{user:User;detail:CatalogDetail;onSaved:()=>Promise<void>;onUnauthorized:()=>void;onBusyChange:(busy:boolean)=>void}){
 const id=useId(),lock=useRef(false),[value,setValue]=useState(detail.metadata!),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const change=(key:keyof typeof value,next:string|string[])=>{setValue(current=>({...current,[key]:next}));setConfirmed(false)}
 return <form className="form" aria-label="Editar jogo manual" onSubmit={event=>{event.preventDefault();if(lock.current||!confirmed)return;let data;try{data=validateManualGameDetails(value)}catch{setError('Confira os campos, a data e o caminho da capa.');return}lock.current=true;setBusy(true);onBusyChange(true);setError('');void saveManualGame(user,detail,data,reason).then(onSaved).catch(failure=>{if(failure instanceof AdminRequestError&&failure.unauthorized)onUnauthorized();else setError(failure instanceof Error?failure.message:'Não foi possível salvar.')}).finally(()=>{lock.current=false;setBusy(false);onBusyChange(false)})}}>
 <h4>Editar informações do jogo manual</h4><p>A edição mantém o identificador e os vídeos vinculados. Nomes anteriores continuam reservados.</p>
 <fieldset disabled={busy}><legend>Informações públicas</legend>
 <label htmlFor={id+'name'}>Nome do jogo</label><input id={id+'name'} required maxLength={100} value={value.name} onChange={event=>change('name',event.target.value)}/>
 <label htmlFor={id+'description'}>Descrição</label><textarea id={id+'description'} maxLength={2000} value={value.description} onChange={event=>change('description',event.target.value)}/>
 <label htmlFor={id+'image'}>Capa (opcional)</label><input id={id+'image'} value={value.imageUrl??''} maxLength={2048} onChange={event=>change('imageUrl',event.target.value)}/>
 <p>Informe o link HTTPS público direto de uma imagem PNG, JPG ou WebP, até 500 KiB e 2048 pixels por lado. A capa será conferida ao salvar. Links que abrem páginas de compartilhamento ou login, inclusive do Drive, não são imagens diretas.</p>
 <p>Também aceitamos os caminhos de imagens já incluídas no projeto e as capas IGDB permitidas. Não há upload. O endereço externo precisa continuar público e disponível.</p>
 {detail.metadata?.imageUrl&&<div><p>Capa salva</p><GameCover imageUrl={detail.metadata.imageUrl} name={detail.game.name}/></div>}
 <label htmlFor={id+'date'}>Data de lançamento</label><input id={id+'date'} type="date" value={value.releaseDate??''} onChange={event=>change('releaseDate',event.target.value)}/>
 {(['genres','gameModes','platforms','aliases'] as const).map(key=><div key={key}><label htmlFor={id+key}>{{genres:'Gêneros',gameModes:'Modos de jogo',platforms:'Plataformas',aliases:'Também conhecido como'}[key]} (um por linha)</label><textarea id={id+key} value={value[key].join('\n')} onChange={event=>change(key,event.target.value.split('\n'))}/></div>)}
 </fieldset>
 <label htmlFor={id+'reason'}>Motivo da edição</label><textarea id={id+'reason'} required minLength={5} maxLength={500} disabled={busy} value={reason} onChange={event=>{setReason(event.target.value);setConfirmed(false)}}/>
 <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)}/> Confirmo a alteração destas informações públicas.</label>
 <button type="button" disabled={busy} onClick={()=>{setValue(detail.metadata!);setReason('');setConfirmed(false);setError('')}}>Cancelar edição</button><button className="primary" disabled={busy||!confirmed||reason.trim().length<5}>{busy?'Salvando…':'Salvar informações do jogo'}</button>{error&&<p role="alert">{error}</p>}
 </form>
}
