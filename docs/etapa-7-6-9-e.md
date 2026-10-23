# Etapa 7.6.9-E — JavaScript administrativo sob demanda

Concluída localmente em 23/10/2026. Proprietário autorizou E enquanto estava longe do computador e pediu deixar os commits para depois, junto com D. Alterações de D preservadas; nenhum commit, deploy, instalação, mudança de infraestrutura ou dado de negócio.

## Implementação e arquivos

- src/app/router/router.tsx: rota administrativa aponta para o componente de carregamento sob demanda.
- src/features/admin/pages/AdminRoute.tsx: novo limite React.lazy/Suspense para AdminPage, com mensagem acessível durante carregamento.
- src/features/admin/pages/AdminPage.tsx: AdminSections também sob demanda, somente após authorized e user. Login e validações existentes preservados.
- src/features/admin/context/AdminSessionProvider.tsx: importação dinâmica do runtime administrativo. Provedor permanece na raiz, preservando sessão e moderação inline durante navegação. Sem Firebase Auth carregado pela simples entrada pública.
- src/features/admin/services/admin-auth.ts: encapsula observação de token e logout; configuração, persistência somente em memória, Google/TOTP, timeout e verificação no servidor mantidos.

O mecanismo de sessão continua o mesmo: uma assinatura por provedor, invalidação imediata, bloqueio de eventos tardios após sair, verificação ao retornar à aba, temporizador e cleanup existentes. Não foi adicionada persistência de login nem relaxada autorização. Interfaces públicas e players não foram alterados nesta etapa.

## Medição localizada

Build de produção com VITE_DATA_MODE=firestore-emulator, servida localmente em HTTPS. Referência anterior é a build de D capturada antes de E; conjunto inicial anterior inclui main, FirestoreFeed e public-repository. Conjunto atual confirmado pelos recursos efetivamente requisitados na home, incluindo todos os novos chunks compartilhados. Coletor de auditoria excluído dos bytes.

| Medida | Antes | Depois | Variação |
| --- | ---: | ---: | ---: |
| JavaScript inicial minificado, sem compressão | 1.003.926 B | 878.567 B | -125.359 B / -12,49% |
| Soma gzip local dos mesmos arquivos | 304.269 B | 271.519 B | -32.750 B / -10,76% |
| Chunk principal | 508.324 B | 341.204 B | -32,88% |

Gzip é estimativa por arquivo, não prova de compressão HTTP deste servidor local. A redução de 32,88% é apenas do chunk principal; a redução do conjunto inicial é 12,49%. Os módulos adiados continuam disponíveis e serão baixados quando necessários.

Home: 15 cards, zero iframes, nenhum overflow horizontal na captura e CLS bruto 0 na janela de 25s. Zero requisições /api/admin/config, /api/admin/session ou SDK de Firebase Auth. Feed API 200; catálogo ainda usa Firestore público no emulador. O chunk public-repository permanece com 461.947 B: redução futura exige análise do catálogo, não foi feita aqui. A build deixou de emitir aviso de chunk individual acima de 500kB; isso não significa que todo o JavaScript inicial tenha menos de 500kB.

Rota /admin da mesma build validada em servidor temporário 5179: resposta 503 simulada exclusivamente para /api/admin/config, antes de alcançar a API real. Página e SDK de autenticação carregaram sob demanda, exibiram mensagem de indisponibilidade existente; AdminSections não foi baixado e nenhuma consulta privada foi feita. Sem inicializar autenticação real, Google ou TOTP.

Não houve nova execução completa de Lighthouse nem promessa de nota/LCP móvel. Captura local sem throttling não equivale a experiência física no Motorola. A falha de transporte e o timeout do Lighthouse continuam assuntos separados.

## Validação

- 46 testes relacionados aprovados: admin-session, admin-auth, header-admin, admin-stage-7-6-2-components, clipper-communication, admin-selected-comments e admin-bulk.
- ESLint localizado nos cinco arquivos aprovado; TypeScript/build de produção aprovados; git diff --check aprovado.
- Navegador com provedor real e runtime de autenticação simulado: entrada pública não importa auth; duas inicializações concorrentes compartilham uma inicialização e um listener; autorização mostra link Administrar; navegação admin/home mantém sessão e listener; invalidação retira acesso; logout bloqueia evento tardio; desmontagem cancela assinatura; conclusão tardia do SDK após desmontagem não cria listener.
- Build real: home carrega apenas módulos públicos; rota administrativa carrega seus módulos e mantém painel privado ausente para visitante em falha controlada.

Login Google/TOTP real, renovação real de credenciais e uso dos painéis com conta do proprietário não foram repetidos enquanto ele estava ausente. A cobertura da máquina de sessão/verificações permanece nos testes existentes; não declarar teste end-to-end real de autenticação. Código de backend, regras e permissões não foram alterados.

## Evidências e encerramento

Evidências externas em C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-9-e/: before.json, after.json, comparison.json, session-ui-checks.json, late-unmount.txt, home.png e admin-unavailable.png. Capturas de recursos completas: audit-performance/e-home.json e e-admin-unavailable.json. Scripts de auditoria permanecem fora do repositório, sem uso pela aplicação.

Arquivos temporários __admin-session-audit.html e __admin-session-audit.tsx removidos. Servidores temporários 5178/5179 encerrados. Serviços normais 5174, 5175 e emulador 8080 preservados; nenhuma simulação foi adicionada a eles. 5174 reflete o fonte e 5175 serve a build atualizada do mesmo projeto.

Commits sugeridos para quando o proprietário decidir, não executados:

1. perf: carrega administracao e autenticacao sob demanda — cinco arquivos de aplicação listados acima.
2. docs: registra reducao do JavaScript inicial — este relatório e entrada em docs/continuidade.md. Se a documentação D ainda estiver pendente, agrupar ambos os relatórios e a continuidade conforme revisão do proprietário.

Próxima proposta: 7.6.9-F — reduzir consultas desnecessárias de catálogo e avaliar reutilização com invalidação explícita, preservando todos os jogos elegíveis e seleção por ID. Não iniciada; depende de autorização. Etapa 8 não iniciada.
