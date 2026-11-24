# Atividade Prática - Estágio: requisitos revisados

## Empresa e objetivo

O Studio Tatiane Carrara atua com design de sobrancelhas, extensão de cílios e cuidados pessoais, no bairro Normília da Cunha, Vila Velha, Espírito Santo. A aplicação centraliza o catálogo, os pedidos de orçamento e a agenda, preservando o controle do gestor sobre os atendimentos confirmados.

Desenvolver uma aplicação web em que a cliente selecione um ou mais serviços individualmente, consulte um dia e horário compatíveis com a soma das durações e envie um orçamento com nome e telefone. O gestor deve analisar os pedidos, escolher qual cliente ocupará o intervalo e aprovar todos ou parte dos serviços solicitados. A decisão e o agendamento serão realizados no próprio sistema.

Esta revisão substitui o fluxo anterior de confirmação pelo WhatsApp. O documento PDF de origem foi preservado; os requisitos vigentes estão descritos aqui.

## Catálogo inicial

| Serviço | Duração | Valor |
| --- | --- | --- |
| Design com henna | 60 min | R$ 50,00 |
| Design com tintura | 60 min | R$ 55,00 |
| Brow lamination | 90 min | R$ 125,00 |
| Extensão de cílios | 120 min | R$ 140,00 |
| Spa labial | 30 min | R$ 25,00 |
| Epilação de buço | 15 min | R$ 15,00 |

Os itens não são reunidos em pacotes predefinidos. Cada serviço conserva nome, duração e preço. A cliente pode selecionar mais de um item para um mesmo início de atendimento. Os procedimentos são considerados sequenciais: Design com henna e Spa labial, por exemplo, totalizam 90 minutos e R$ 75,00. Um início às 14h exige disponibilidade até as 15h30.

## Requisitos funcionais

1. Apresentar catálogo e permitir seleção independente de vários serviços, sem repetição do mesmo item no pedido.
2. Calcular valor e duração totais, preservando a discriminação de cada item.
3. Exibir dias e horários que comportem todo o conjunto selecionado.
4. Exigir nome e telefone com DDD para enviar o orçamento.
5. Registrar o pedido como pendente, sem ocupar a agenda.
6. Permitir vários pedidos pendentes sobre o mesmo horário. O gestor decide quem ocupará o intervalo.
7. Fornecer protocolo e chave para acompanhamento privado da decisão no site.
8. Disponibilizar área protegida do gestor com fila de orçamentos e sinalização de pedidos com intervalos sobrepostos.
9. Permitir analisar individualmente os serviços, aprovar todos, aprovar parte ou não aprovar o orçamento.
10. Recalcular duração, valor e término conforme os serviços aprovados. Os itens não aprovados encerram-se nesse pedido e não geram outra reserva.
11. Criar o atendimento e gravar a decisão em uma única transação, com validação de conflito no banco.
12. Mostrar no atendimento o nome e telefone da cliente, os serviços aprovados, o valor e o intervalo ocupado.
13. Manter agenda diária, semanal e de 31 dias; permitir registros manuais com vários serviços, bloqueios, alterações e cancelamentos.
14. Editar o catálogo e reunir os contatos dos atendimentos confirmados na aba Clientes.

## Regras de negócio

- Uma profissional atende por vez, de terça-feira a sábado, das 9h às 18h, no fuso de Brasília.
- Os inícios têm passos de 15 minutos. A soma das durações deve caber integralmente antes das 18h e não sobrepor bloqueios ou atendimentos confirmados.
- Datas e horários passados não podem receber novos pedidos ou aprovações.
- Solicitações pendentes não constituem reserva e não reduzem a disponibilidade pública.
- Só a aprovação ocupa a agenda. Havendo conflito, o banco rejeita a operação e o orçamento continua pendente, sem decisão parcial gravada.
- A aprovação parcial ocupa apenas o tempo dos serviços marcados, a partir do início solicitado. Não há execução simultânea dos procedimentos.
- Pedidos concorrentes não são automaticamente recusados; ficam disponíveis para decisão individual do gestor.
- Orçamentos já decididos não podem ser aprovados novamente. Alterações posteriores ocorrem na agenda e são exibidas na consulta da cliente.
- O catálogo pode mudar, mas os valores e durações do orçamento enviado são preservados para sua análise.
- Os detalhes do pedido só são expostos mediante protocolo e chave de consulta. O painel exige chave administrativa.

## Fluxos de tela

**Cliente:** catálogo com seleção múltipla; resumo de itens e totais; calendário; horários; nome e telefone; envio; comprovante com protocolo e chave; acompanhamento com situação e serviços efetivamente aprovados.

**Gestor:** entrada protegida; aba Orçamentos com filtros de situação; identificação de pedidos sobrepostos; janela de análise com marcação dos serviços e observação; aprovação integral ou parcial; recusa; agenda com contato da cliente e itens discriminados; catálogo e clientes.

Exemplo: duas clientes enviam pedidos para as 14h. O gestor escolhe um deles, desmarca um dos serviços e aprova apenas o Spa labial. A agenda registra 14h a 14h30, por R$ 25,00, com nome e telefone. O outro pedido permanece pendente. Qualquer tentativa posterior de ocupar um intervalo sobreposto é rejeitada até que o gestor ajuste a agenda ou escolha outro horário.

## Tecnologias e estrutura de dados

Consulte a [seção 4 com justificativas, fluxograma e dicionário de dados](TECNOLOGIAS-E-FLUXO.md).

| Tecnologia | Foi usada? | Finalidade na aplicação |
| --- | --- | --- |
| HTML5 | Sim | Estrutura o catálogo, o formulário de orçamento, o acompanhamento e o painel administrativo. Usa elementos nativos como formulários, botões e diálogos. Código em [public/index.html](../public/index.html). |
| CSS3 e Bootstrap 5.3.9 | Sim | O CSS do Bootstrap fornece a grade responsiva, classes de espaçamento e estilos de formulários e botões. O CSS próprio define cores, cartões, calendário e aparência do painel. Código em [public/styles.css](../public/styles.css) e [public/vendor/bootstrap.min.css](../public/vendor/bootstrap.min.css). |
| JavaScript | Sim | No navegador, atualiza as telas, calcula preços e durações e consulta a API. No servidor, valida solicitações e controla orçamentos, aprovações e cancelamentos. Código em [public/app.js](../public/app.js), [src/domain.js](../src/domain.js) e [src/api.js](../src/api.js). |
| TypeScript | Não | O código usa módulos JavaScript executados diretamente pelo navegador ou pelo Node.js no ambiente local. |
| Banco de dados | Sim | O SQLite local e o Cloudflare D1, configurado para hospedagem, armazenam serviços, orçamentos, agenda e notificações. As [migrações SQL](../drizzle/) criam e atualizam as tabelas e incluem gatilhos que impedem sobreposições na agenda. |
| Prototipagem de telas (Figma) | Não documentada | O projeto registra que nenhum arquivo Figma foi produzido. As telas podem ser avaliadas na própria aplicação funcional. |

| Tabela | Conteúdo e finalidade |
| --- | --- |
| `settings` | Catálogo editável. Configuração antiga de telefone é preservada, sem uso pelo fluxo atual. |
| `quotes` | Protocolo, hash da chave, nome, telefone, dia, início, itens separados em JSON, duração e preço totais, situação, observação e datas da decisão. |
| `appointments` | Intervalo confirmado ou bloqueado, contato, serviços aprovados em JSON, preço total, situação e vínculo único com o orçamento. |
| `notifications` | Eventos de aprovação e cancelamento, estado de envio e resposta do provedor de WhatsApp. |

Valores monetários são armazenados em centavos e horários em minutos desde meia-noite. A migração incremental `0001_quotes.sql` acrescenta os dados de orçamento sem apagar atendimentos antigos. Os gatilhos existentes continuam impedindo sobreposições. O código acompanha este documento na pasta do projeto; o README descreve execução, publicação e uso.

## Validação e limites

Dez testes automatizados cobrem soma das durações, disponibilidade, contatos, pedidos concorrentes, aprovação parcial, duas aprovações simultâneas, proteção dos dados, preservação dos valores originais, cancelamento e migração de registros antigos. O fluxo de envio e aprovação parcial também foi conferido no navegador local.

A confirmação deve ser consultada no site; não há mensagens ou notificações automáticas. Não há integração WhatsApp, pagamento ou lembrete de 24 horas nesta versão. A publicação mantém sua política privada de acesso. A liberação às clientes exige alteração posterior de compartilhamento pelo proprietário.

## Referências

- Documento de origem: Atividade Prática - Estágio.pdf, fornecido pelo solicitante.
- Requisitos complementares do solicitante: seleção múltipla, orçamento e aprovação integral ou parcial pelo gestor, dispensando WhatsApp para agendamento.
- [Bootstrap](https://getbootstrap.com/docs/5.3/getting-started/download/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Node.js SQLite](https://nodejs.org/api/sqlite.html)

## Revisão: cancelamento pela cliente e notificações

Esta revisão substitui as restrições anteriores de cancelamento e de ausência de integração WhatsApp. O cadastro informa que o telefone será usado para aprovações, atualizações do serviço e cancelamentos e registra a autorização. A cliente pode cancelar pelo acompanhamento, com protocolo e chave, antes do início do atendimento; o gestor também pode cancelar, com motivo opcional. Ambos os fluxos liberam o horário e preservam o histórico de quem cancelou. Aprovações e cancelamentos registram uma notificação transacional, com tentativa de envio pela Meta Cloud API quando configurada. Falhas de envio não desfazem a operação da agenda. O envio real ainda depende de conectar a conta comercial e configurar credenciais e modelos. Consulte CONFIGURAR-WHATSAPP.md. Não há confirmação de entrega/leitura por webhook nesta versão. As 19 verificações automatizadas incluem envio simulado, cancelamento concorrente, proteção do protocolo e não duplicação de notificações.

