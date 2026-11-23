# Ativar notificações do Studio pelo WhatsApp

## Situação da entrega

O site já possui cancelamento pela cliente, motivo opcional da profissional, aviso de uso do telefone e registro da autorização para atualizações. Aprovações e cancelamentos geram eventos persistentes de notificação. O adaptador de envio para a Meta Cloud API está implementado e foi testado com respostas simuladas. Nenhum disparo real foi testado ou ativado nesta entrega, pois ainda não existe uma conta de API conectada nem credenciais fornecidas.

Remetente informado: **+55 27 98886-2723**, atualmente no **WhatsApp Business**. Esse número não é o `PHONE_NUMBER_ID` da API; a Meta fornece um identificador próprio após a conexão.

## Conectar o número

1. Acesse a [documentação da WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview) com a conta que administra o negócio na Meta.
2. Para manter o número no aplicativo WhatsApp Business, use um fluxo de conexão compatível com **coexistência do aplicativo e da Cloud API**, conforme disponibilidade da conta e do provedor/fluxo de cadastro. A Meta apresenta essa opção em “API solutions for WhatsApp Business app users”. Verifique a elegibilidade no cadastro; não exclua o número atual do aplicativo para tentar liberar a API.
3. Conclua as etapas de identificação do negócio e autorização do número apresentadas pela Meta. Etapas de login, verificação por código e eventual contratação/cobrança devem ser concluídas pelo proprietário.
4. Obtenha o **Phone Number ID** e um **token de acesso** com permissão de envio para esse número. Para produção, não dependa de um token temporário da tela inicial.
5. Configure os modelos de utilidade abaixo no idioma **Português (Brasil)**. Aguarde a situação de aprovação do modelo antes de ativar o envio.
6. Armazene token e configuração nas variáveis de ambiente do servidor Sites. O token deve ser marcado como segredo; não coloque em JavaScript público, Git, ZIP ou em mensagens de chat. Para uso local, preencha apenas o `.env` ignorado pelo Git.

O cadastro e as condições de uso/cobrança pertencem à Meta. Ter o aplicativo WhatsApp Business instalado não fornece, por si só, as credenciais da Cloud API.

## Modelos compatíveis com o código

Os nomes podem mudar se as variáveis de ambiente forem ajustadas. Preserve a quantidade e a ordem dos parâmetros do corpo. Evite adicionar cabeçalhos ou botões com variáveis sem adaptar o código.

### `studio_orcamento_aprovado`

Categoria pretendida: utilidade. Idioma: `pt_BR`. Corpo sugerido:

```text
Olá, {{1}}! O Studio Tatiane Carrara confirmou seu atendimento.
Data: {{2}}, das {{3}} às {{4}}.
Serviços aprovados: {{5}}. Valor total: {{6}}.
Seu orçamento foi aprovado {{7}}.
Estas informações se referem ao serviço que você solicitou no nosso site.
```

Parâmetros: nome, data, início, término, serviços aprovados, valor, tipo de aprovação (integralmente/parcialmente).

### `studio_agendamento_cancelado`

Categoria pretendida: utilidade. Idioma: `pt_BR`. Corpo sugerido:

```text
Olá, {{1}}! O Studio Tatiane Carrara confirma o cancelamento do seu pedido/atendimento.
Data prevista: {{2}}, às {{3}}. Serviços: {{4}}.
Cancelamento realizado {{5}}. Motivo: {{6}}.
O cancelamento já está registrado no sistema.
```

Parâmetros: nome, data, início, serviços, responsável (pela cliente/pelo Studio), motivo (ou “Não informado”).

## Variáveis de ambiente

| Nome | Valor |
| --- | --- |
| `WA_ACCESS_TOKEN` | Token secreto de envio |
| `WA_PHONE_NUMBER_ID` | Identificador numérico fornecido pela Meta |
| `WA_API_VERSION` | Versão suportada pelo aplicativo Meta, por exemplo `v27.0` |
| `WA_TEMPLATE_APPROVAL` | Nome do modelo de aprovação, por exemplo `studio_orcamento_aprovado` |
| `WA_TEMPLATE_CANCELLATION` | Nome do modelo de cancelamento, por exemplo `studio_agendamento_cancelado` |
| `WA_LANGUAGE` | `pt_BR` |

O adaptador chama apenas `https://graph.facebook.com/{versão}/{phone-number-id}/messages`. A API pública do site não expõe o token. Depois de atualizar as variáveis do Sites, uma nova publicação precisa aplicar essa revisão de ambiente.

## Verificar a ativação

1. Use um número real sob seu controle como destinatário e crie um novo pedido, marcando a autorização para receber atualizações.
2. Aprove o pedido. Em **Área do profissional > Notificações**, confira a resposta da Meta.
3. Confira a chegada da mensagem no aparelho destinatário. “Aceita pela Meta” só confirma que a API aceitou a requisição, não a entrega.
4. Consulte o pedido com protocolo e chave; use **Cancelar meu pedido ou atendimento**. Confira a liberação da agenda e a mensagem de cancelamento.
5. Crie outro pedido para testar o cancelamento pela profissional, incluindo um motivo opcional.

## Falhas, pendências e histórico

- **Aguardando configuração:** o evento foi salvo, mas não há configuração completa de envio.
- **Não enviada: sem autorização registrada:** registros antigos e registros manuais sem autorização de WhatsApp não são disparados. Os dez testes anteriores usam telefones fictícios e não devem receber mensagens.
- **Falha no envio:** a API rejeitou a chamada. Depois de corrigir a causa, o gestor pode usar **Tentar enviar**.
- **Resultado incerto / envio em processamento:** não há garantia de que a Meta deixou de aceitar a mensagem. Verifique na Meta antes de qualquer nova tentativa. O código não reenvia automaticamente esse evento para evitar duplicatas.
- **Aceita pela Meta:** recebido um identificador de mensagem do provedor. Esta versão não recebe webhooks de entrega/leitura, portanto não informa “entregue” ou “lida”.
- Uma aprovação ainda não enviada é suprimida se o atendimento já tiver sido cancelado.
- O envio é tentado no evento de aprovação/cancelamento; não depende de o navegador da cliente estar aberto. Há fila persistente e tentativa manual para falhas conhecidas. Não existe rotina periódica de reenvio.
- Falha ou ausência de integração não desfaz a aprovação/cancelamento e não impede a liberação da agenda.

## Referências oficiais

- [WhatsApp Business Platform e coexistência](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview)
- [Modelos de mensagem: coleção oficial da Meta](https://www.postman.com/meta/whatsapp-business-platform/request/lwtlz1k/send-message-template-interactive)
