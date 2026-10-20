# API local com HTTPS

Execute a partir da raiz do projeto. Este ambiente usa exclusivamente o emulador
`demo-clipzone` na porta 8080. Não faça deploy nem exponha por túneis.

Pré-requisito: certificado TLS confiável no navegador, válido para o IP
`127.0.0.1`, com chave privada em arquivo fora do repositório. Não ignore alertas
TLS nem desative a verificação de certificados. A instalação de uma autoridade
certificadora local exige participação do proprietário do computador; este
projeto não instala certificados ou ferramentas automaticamente.

Adicione a `.env.server.local` (ignorado pelo Git):

```dotenv
LOCAL_TLS_CERT=C:/caminho-privado/localhost.pem
LOCAL_TLS_KEY=C:/caminho-privado/localhost-key.pem
```

Mantenha nesse arquivo as credenciais Twitch/IGDB já configuradas. Nunca use
prefixo VITE para segredos. Não copie certificados/chaves para o projeto.

1. Execute `npm run emulators` em um terminal.
2. Se necessário, execute `npm run seed:firestore` para o catálogo demonstrativo.
3. Encerre o Vite que estiver usando a porta 5174.
4. Execute `node --env-file=.env.server.local scripts/dev-api.mjs`.
5. Abra `https://127.0.0.1:5174`.

A interface e `/api` compartilham HTTPS; os cookies Secure/HttpOnly de produção
são preservados. A chave de sessão é aleatória em memória e muda a cada reinício.
O limite local de novas sessões é 20/minuto, global ao processo; não substitui
proteção antiabuso para implantação pública. O catálogo consulta IGDB real quando
configurado, mas grava apenas no emulador. Vídeos tecnicamente confirmados podem ser publicados automaticamente no emulador. O modo demo existente continua igual.

Validação manual pendente: pesquisar jogo, confirmar seleção, enviar short,
conferir persistência pendente e retorno de duplicidade. Sem certificado local
confiável, não considerar o fluxo no navegador validado.

O runner agora verifica metadados de clipes Twitch quando as credenciais estão
configuradas, incluindo a categoria cruzada com o IGDB. Clipes com existência, formato e jogo confirmados podem ser publicados automaticamente, conforme decisão do usuário. Análise audiovisual continua indisponível. Outras fontes permanecem
inconclusivas nesta composição local.


Título automático: ao colar um link aceito, o formulário consulta `/api/shorts/preview`
após breve pausa e oferece edição. A prévia requer sessão e tem limite próprio.
O envio consulta novamente a fonte e preserva `originalTitle` separado de `title`.
No runner atual, a consulta real disponível é Twitch; fontes não configuradas
exibem indisponibilidade. O teste completo de preenchimento, edição e publicação
local foi realizado com um clipe Twitch, sem gravações na nuvem.
