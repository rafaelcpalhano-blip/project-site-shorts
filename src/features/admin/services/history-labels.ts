import type {HistoryKind} from './history-api'
const actions:Record<HistoryKind,Record<string,string>>={
 game:{approve:'Aprovar cadastro provisório',hide:'Ocultar jogo',ban:'Banir jogo',unban:'Desbanir jogo',restore:'Restaurar jogo','edit-metadata':'Editar informações','create-provisional':'Cadastrar jogo provisório'},
 'game-request':{link:'Vincular solicitação ao IGDB',create:'Aceitar cadastro manual',reject:'Rejeitar solicitação'},
 comment:{approve:'Publicar comentário',reject:'Rejeitar comentário',remove:'Remover comentário',restore:'Restaurar comentário'},
 short:{dismiss:'Arquivar denúncias',block:'Bloquear vídeo',approve:'Publicar/desbloquear vídeo',remove:'Remover vídeo',restore:'Restaurar vídeo'},
}
const states:Record<string,string>={active:'Ativo',hidden:'Oculto',disabled:'Oculto',inactive:'Oculto',banned:'Banido',pending:'Pendente',published:'Publicado',approved:'Publicado',removed:'Removido',rejected:'Rejeitado',linked:'Vinculado',reviewed:'Analisado'}
export const historyAction=(kind:HistoryKind,action:string)=>actions[kind][action]??action
export const historyStatus=(status:string)=>states[status]??status