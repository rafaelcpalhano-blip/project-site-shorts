# Proposta — confiança em origens previamente avaliadas

Estado: SUPERADA pela política de publicação automática aprovada em 21/10/2026.
Não implementar confiança por criador, listas de canais aprovados nem OAuth obrigatório.
O jogo é declaração do visitante; sua comprovação externa não condiciona a publicação.
O conteúdo abaixo é somente histórico da proposta anterior, que nunca foi implementada.
Nenhum serviço ou custo foi ativado. Política vigente: fontes-titulos.md.

## Objetivo e risco aceito

Revisar um criador uma vez para permitir vários compartilhamentos anônimos posteriores,
sem aprovar manualmente cada vídeo. A origem confiável é um criador identificado,
em determinada plataforma e com escopo de jogos/formato; não é todo youtube.com ou tiktok.com.

Confiança reduz revisão, mas não prova o conteúdo de cada vídeo. Um criador pode mudar
de assunto ou publicar algo inadequado. Aprovar esta política significa aceitar
essa possibilidade e usar sinais de inconsistência e denúncias como controles.
Não chamar inferência de confirmação técnica ou de análise audiovisual.

## 1. Cadastro pelo administrador

Somente o administrador com Google/TOTP/UID pode cadastrar, alterar, suspender ou reativar confiança.
O visitante continua sem conta e não pode se autodeclarar origem confiável.

Cadastro proposto:
- Plataforma e identificador estável do criador, obtido por mecanismo oficial.
- Link/nome de exibição, apenas informativos; nome parecido não identifica o criador.
- Jogos IGDB autorizados, preferencialmente um único jogo por origem no piloto.
- Escopo explícito: confiança no jogo, no formato curto, ou em ambos.
- Motivo, amostra avaliada, data, administrador responsável, estado e versão.

Avaliação inicial sugerida: três vídeos em datas diferentes, conferindo identidade,
conteúdo gamer, jogo e formato. É um critério operacional proposto, não uma garantia estatística.
Criadores de vários jogos exigem escopo explícito; não inferir o jogo apenas pelo nome do canal.

Estados: em análise, ativo, suspenso e expirado. Não há ativação automática por popularidade,
número de seguidores, domínio oficial ou título contendo o nome de um jogo.

## 2. Regra de publicação proposta

| Situação | Resultado |
|---|---|
| Fonte comprova vídeo inexistente ou formato incompatível | Rejeitar conforme validação técnica existente |
| Identidade da origem não verificável, confiança ausente/inativa ou jogo fora do escopo | Pendente |
| Evidências técnicas suficientes de formato e jogo, sem sinais de revisão | Publicação automática existente |
| Origem ativa, autoria verificada, jogo único autorizado e seleção correspondente | Pode aceitar jogo por confiança, se esse escopo foi aprovado |
| Formato não comprovado, mas origem foi aprovada expressamente como publicadora de curtos e URL é do tipo aceito | Pode aceitar formato por confiança, se esse escopo foi aprovado |
| Contradição técnica, conflito de jogo, identidade divergente ou sinal de abuso | Não usar confiança para contornar o problema; rejeitar ou manter pendente conforme a causa |

Existência continua exigindo consulta oficial bem-sucedida. Sem ela, não publicar.
Confiança em formato não pode superar duração comprovadamente incompatível quando disponível.
Editar o título não remove sinais obtidos da fonte. Título ou jogo escolhido, isoladamente, não liberam postagem.

Para uma origem autorizada em vários jogos, exigir sinal não ambíguo além da seleção
do visitante. Sem esse sinal, manter pendente; não escolher por aproximação silenciosa.
O piloto recomendado começa com origens de jogo único para reduzir essa ambiguidade.

## 3. Evidência e transparência

Separar evidência técnica de decisão por confiança:
- formato técnico confirmado ou formato aceito pela política da origem;
- jogo técnico confirmado ou jogo aceito pela política da origem;
- ID/versão da confiança utilizada e regra aplicada.

Um vídeo aceito por confiança não receberá internamente marca de confirmação técnica inexistente.
O painel mostrará a base da decisão. Sem porcentagens de certeza ou promessa de conteúdo seguro.
Nenhuma confiança concede acesso administrativo ou substitui a autorização do servidor.

## 4. Denúncias e suspensão

Uma denúncia abre análise e mantém o vídeo visível, como aprovado anteriormente.
Não suspender automaticamente o criador nem ocultar vídeos apenas pela primeira denúncia.
Limiares por volume continuam fora desta proposta e aguardam definição separada.

Violação confirmada pelo administrador permite suspender futuras publicações automáticas
dessa origem. Remover vídeos antigos exige decisões individuais; sem remoção em lote implícita.
Vídeos existentes não são republicados ao reativar confiança. Reservas permanentes permanecem.

Mudança de identidade, falha de verificação ou dados conflitantes interrompe o uso da confiança
para novos envios. Não remover o acervo automaticamente.

## 5. Revalidação e concorrência

Conferir a confiança atual no servidor em cada envio, dentro da transação final:
estado, versão, jogo, escopo e validade. Suspensão concorrente deve impedir a publicação.
Resultado de prévia ou dado enviado pelo navegador não substitui essa consulta.

Proposta inicial: validade de 30 dias, sem renovação silenciosa.
Expiração suspende somente o uso da confiança em novos envios, até revisão do cadastro;
não exige revisar cada postagem. A periodicidade deve ser aprovada junto da política.

A cota de cinco continua pertencendo à sessão visitante, não ao canal confiável.
Sem isenção de cota, prioridade administrativa, desconto duplicado ou liberação de links removidos.

## 6. Viabilidade por plataforma

YouTube: channelId oficial é o identificador adequado. O adaptador atual não o coleta;
ativação/configuração da Data API ainda depende de participação e aprovação separadas.
Dados de título ou link do autor no oEmbed não devem ser tratados como identidade imutável.

TikTok: não assumir que @usuario é um identificador permanente. A API pública usada hoje
não fornece toda a verificação estável necessária. Sem mecanismo oficial confiável para
vincular o vídeo ao criador cadastrado, a confiança permanece indisponível e o envio pendente.
Esta política, sozinha, não resolve esse acesso nem autoriza OAuth ou serviço adicional.

Não há promessa de automação imediata de qualquer criador ou das três fontes.

## 7. Arquitetura e custos propostos

Somente o Firestore já aprovado: registros privados de confiança e logs de alterações/uso.
Sem novo banco, biblioteca, IA paga ou agendador. Revalidação ocorre no envio.
No emulador não há nova cobrança; produção acrescentará leituras de confiança e logs
aos limites/custos do Firestore existente. Orçamento deve ser medido antes de deploy.

APIs oficiais podem exigir cotas, credenciais, consentimentos e revisão de app.
Nenhuma ativação ou cobrança foi autorizada nesta avaliação. Nome de provedor externo
ou preço de reconhecimento de conteúdo não foi escolhido.

## 8. Plano de implementação após aprovação

1. Registro privado de origens e API administrativa protegida, com trilha de alterações.
2. Verificação oficial de autoria onde houver acesso autorizado; sem fallback por nome parecido.
3. Decisão separada de confiança com escopo, validade, versão e auditoria.
4. Testes de suspensão concorrente, ID divergente, expiração, jogo fora do escopo,
   ausência de metadados, cota, reserva removida e título editado.
5. Piloto local com origem de jogo único; sem habilitação pública ou deploy.

Recomendação de piloto: confiança no jogo primeiro, formato ainda técnico.
Ampliar também para formato seria uma concessão adicional de risco, destacada na tabela,
que deve ser aprovada expressamente. Sem essa aprovação, essa exceção fica desativada.

## Aprovações ainda necessárias

- Aprovar ou ajustar esta política, inclusive validade/amostragem.
- Definir se o piloto admite apenas jogo por confiança ou também formato por confiança.
- Autorizar a implementação local correspondente; detalhamento não equivale a implementação.
- Autorizar separadamente qualquer configuração de API, credenciais, serviço ou deploy.
