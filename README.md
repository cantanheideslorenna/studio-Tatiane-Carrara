# Studio Tatiane Carrara

Aplicação de orçamento e agendamento com aprovação pelo gestor. Interface em HTML5, CSS3, Bootstrap 5.3.9 e JavaScript. API JavaScript; banco SQLite local e Cloudflare D1 na publicação.

## Executar

Requer Node.js 22.13 ou superior (recomendado 24). Na pasta do projeto:

```sh
npm start
```

Não é necessário instalar pacotes. Bootstrap é distribuído em `public/vendor/`, com sua licença original. Crie `.env` a partir de `.env.example`, com uma chave longa em `ADMIN_KEY`. Na entrega existente, ela já foi configurada. O arquivo privado `ACESSO-ADMINISTRATIVO.txt`, na pasta superior, contém a chave de acesso. Nunca inclua esse arquivo ou `.env` no pacote de código.

Abra `http://127.0.0.1:4173`. A área do gestor é `/admin`. O banco fica em `data/agenda.sqlite`. O servidor aplica as migrações locais pendentes sem apagar os registros existentes. Dados locais e hospedados são independentes. O servidor local escuta apenas em loopback.

## Fluxo da cliente

1. Selecionar um ou mais serviços individualmente no catálogo.
2. Consultar dias e horários que comportem a soma das durações, de terça a sábado, das 9h às 18h, no horário de Brasília.
3. Preencher nome e telefone com DDD, conferir os itens e enviar o orçamento.
4. Guardar protocolo, chave e link privado de acompanhamento.
5. Consultar a decisão no próprio site. A consulta apresenta os itens solicitados, os aprovados, o valor e o horário confirmado.

Enviar orçamento não reserva a agenda. Podem existir pedidos pendentes concorrendo por um mesmo horário. Somente uma aprovação ocupa o intervalo, conforme os serviços efetivamente aprovados. A cliente pode cancelar pelo acompanhamento. Aprovações e cancelamentos geram notificações pelo WhatsApp, cujo envio depende da ativação da Meta Cloud API.

## Fluxo do gestor

- Entre em `/admin` com sua chave e abra **Orçamentos**.
- Compare nome, telefone, horário, serviços separados, valores e duração. Pedidos com intervalos sobrepostos são sinalizados.
- Clique em **Analisar e escolher serviços**. Todos vêm marcados; desmarque os que não serão executados para aprovar parcialmente.
- Confira o novo total e término. É possível registrar uma observação para a cliente.
- **Aprovar selecionados** confirma os itens escolhidos e ocupa a agenda em uma transação. Em caso de conflito, nenhuma decisão é gravada e o pedido permanece pendente.
- **Não aprovar orçamento** encerra o pedido sem ocupar a agenda.
- Outros pedidos concorrentes continuam pendentes para avaliação individual; não são rejeitados automaticamente.
- A agenda permite alterar atendimentos, cancelar, criar registros manuais com vários serviços e bloquear horários.
- A aba **Serviços** permite editar catálogo, preços e durações. Orçamentos já enviados guardam os itens, preços e durações da solicitação.
- A aba **Clientes** reúne nome e telefone dos atendimentos confirmados.

Antes de liberar o site para clientes, cadastre os compromissos já existentes e os intervalos de pausa. A chave administrativa continua a mesma. A publicação permanece privada pelo controle de acesso da plataforma até que o proprietário altere o compartilhamento.

## Dados e proteção

| Tabela | Uso |
| --- | --- |
| `settings` | Catálogo configurado; configuração antiga de telefone preservada, sem uso no fluxo atual |
| `quotes` | Nome, telefone, data, início, itens separados em JSON, totais, decisão, observação e hash da chave de consulta |
| `appointments` | Atendimento aprovado ou bloqueio, intervalo, nome/telefone e itens aprovados; vínculo único com o orçamento |

Somente protocolo e chave corretos permitem consultar os detalhes de um pedido. A chave de consulta não é armazenada em texto no banco, apenas seu hash. A interface não recupera uma chave perdida: a cliente deve guardar os dados ou o link. O link usa fragmento de URL, que não é enviado como parte da requisição HTTP inicial. Não existe listagem pública de nomes e telefones. Todas as decisões exigem autorização administrativa no servidor.

Os gatilhos SQL rejeitam sobreposição de registros confirmados. A aprovação e a criação do atendimento são transacionais, e o vínculo único impede duplicar o atendimento do mesmo orçamento. Cancelamentos mantêm o histórico. Atendimentos da versão anterior são preservados e exibidos com o serviço original.

## Testes e build

```sh
npm test
npm run build
```

Dez testes cobrem expediente, fuso, soma das durações, contatos obrigatórios, itens inválidos, pedidos concorrentes, aprovação parcial, conflito entre aprovações simultâneas, preservação de orçamento quando o catálogo muda, consulta protegida, cancelamento e migração de dados anteriores. Testes usam banco em memória. Foi validado no navegador um pedido local com dois serviços e aprovação de apenas um.

`scripts/build.mjs` incorpora a interface e a API no Worker `dist/server/index.js`. A hospedagem declara `DB` em `.openai/hosting.json`; precisa do segredo de servidor `ADMIN_KEY`. As migrações ficam em `drizzle/`. As migrações já aplicadas não devem ser modificadas. O projeto não é publicado no GitHub; a sincronização da publicação usa o repositório privado do Sites.

## Estrutura

- `public/index.html`, `public/styles.css`, `public/app.js`: interface e interação.
- `public/catalog-editor.js`: formulário de catálogo.
- `src/domain.js`: catálogo inicial e regras de duração/disponibilidade.
- `src/api.js`: pedidos, consulta, decisões, agenda e autorização.
- `server.mjs`: execução local com SQLite.
- `drizzle/`: schema e migrações incrementais.
- `docs/PROJETO-REVISADO.md`: requisitos atualizados.

## Limites

A decisão continua disponível no acompanhamento. Notificações automáticas estão implementadas via Meta Cloud API, mas aguardam conexão da conta e credenciais para envio real. Clientes podem cancelar pedidos e atendimentos futuros com protocolo e chave. A profissional pode cancelar com motivo opcional. Não são implementados pagamento, lembretes ou contas de clientes. Remarcações são executadas pelo gestor na agenda. Cada serviço é escolhido uma vez por pedido e executado sequencialmente; suas durações são somadas.

## Referências técnicas

- [Bootstrap](https://getbootstrap.com/docs/5.3/getting-started/download/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [SQLite em Node.js](https://nodejs.org/api/sqlite.html)


## Cancelamentos e WhatsApp

Consulte docs/CONFIGURAR-WHATSAPP.md. O cadastro apresenta aviso de uso do telefone e exige autorização explícita para atualizações. A aba Notificações distingue mensagens pendentes, falhas e aceite pela API, sem afirmar entrega. A migração 0002_notifications.sql preserva os registros e não inventa autorização para clientes antigos. A suíte possui 19 testes; os testes de envio usam respostas simuladas e não enviam mensagens reais.

