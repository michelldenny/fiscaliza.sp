# Fiscaliza · São Paulo

Aplicação web de acompanhamento da ação fiscal, com dados persistidos no servidor. Interface em português, preparada para computador e celular.

## Executar no seu computador

Requisitos: Node.js 22.13 ou superior, npm e acesso à internet na primeira instalação. Abra um terminal nesta pasta e execute:

```sh
npm ci
npm run build
node scripts/prepare-local.mjs
npm run dev
```

Abra o endereço exibido no terminal (normalmente http://localhost:5173). Para encerrar, pressione Ctrl+C. Nas próximas vezes, execute apenas `npm run dev`. A preparação local registra as migrações e aplica somente as pendentes. Não exclua `.wrangler/state`: é onde ficam os dados locais. A primeira instalação pode demorar alguns minutos.

Para executar a versão compilada, use `npm start` depois da preparação. O terminal informa o endereço. O banco usado é o mesmo da versão de desenvolvimento.

Se o atalho npm falhar no Windows, execute o npm diretamente com `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" ci` (ajuste o caminho da instalação do Node). A compilação também pode ser executada com `node scripts/run-framework.mjs build` e o servidor com `node scripts/run-framework.mjs dev`.

## Primeiro uso

1. Entre em **Configurações → Posturas e prazos**. Há sete categorias predefinidas. Seus valores iniciais (30 dias e alerta de 5 dias) são exemplos e precisam ser revisados e salvos antes do uso. Não constituem prazos legais validados.
2. Se usar dias úteis, cadastre os feriados e dias sem expediente da unidade em **Configurações → Feriados**, uma data por linha, no formato `AAAA-MM-DD`.
3. Clique em **Nova ação fiscal**. Postura, endereço, número da demanda, fiscal e data da vistoria são obrigatórios. SQL, SEI e observações ficam disponíveis no cadastro e no detalhe.
4. Abra uma demanda para editar o cadastro, registrar uma nova vistoria ou excluir. Cada vistoria conserva data, fiscal, observações, regra aplicada e retorno previsto.

## Funcionalidades

- Painel com retornos atrasados, de hoje, em atenção, no prazo, alta prioridade e total ativo. Os cartões abrem a lista filtrada.
- Cadastro, consulta, edição e exclusão lógica de demandas; número da demanda único entre registros não excluídos.
- Busca por endereço, SQL, demanda, SEI, fiscal, postura e observações. Filtros por postura, prazo, prioridade, status, fiscal e intervalo de retorno.
- Situação do prazo calculada automaticamente, separada dos oito status da ação fiscal.
- Calendário mensal com navegação, retornos por dia e lista do período.
- Linha do tempo de vistorias; auditoria com data, operador, valores anteriores e posteriores, inclusive após exclusão.
- Relatórios por postura, fiscal e situação de prazo, conforme os filtros; exportação CSV e impressão pelo navegador.
- Notificações internas com marcação persistente de leitura e renovação quando a situação muda. Não envia e-mail, WhatsApp ou avisos com o aplicativo fechado.
- Configuração de posturas, desativação sem perda de histórico, contagem em dias corridos ou úteis, antecipação de alertas e feriados.

## Regras de cálculo

A data de referência é a da última vistoria, no calendário de São Paulo. O dia da vistoria não é contado. Prazo zero vence na própria data. Dias corridos incluem todos os dias; dias úteis excluem sábado, domingo e as datas cadastradas. O sistema não consulta feriados automaticamente.

O alerta antecipado é contado em dias corridos: retorno anterior a hoje é **Retorno atrasado**; igual a hoje é **Retorno hoje**; até o limite de antecipação é **Atenção**; demais retornos são **No prazo**.

**Regularizado**, **Encerrado** e **Suspenso** não entram na agenda ativa ou nos alertas; continuam consultáveis e nos relatórios. Reativar uma ação volta a usar o último retorno registrado. Se necessário, registre uma nova vistoria.

Alterar uma regra ou um feriado não modifica retornos existentes. Cada vistoria guarda uma cópia da regra e do calendário utilizados. A postura e a data só mudam por nova vistoria; uma edição de cadastro não apaga o histórico. Vistorias futuras ou anteriores à última vistoria são rejeitadas.

## Persistência e acesso

O servidor utiliza SQLite/D1 com gravação atômica do estado e da auditoria. Controle de versão rejeita edições concorrentes para impedir perda silenciosa de alterações. Se aparecer conflito, copie os campos preenchidos, atualize a página e refaça a edição.

No computador, o servidor fica em loopback e identifica as alterações como “Operador local”. Na versão hospedada, o acesso é privado ao proprietário pela plataforma Sites, e a identidade fornecida pela plataforma é registrada na auditoria. O nome do fiscal é um campo do cadastro, distinto da identidade do operador. Não há integração com SEI, SQL municipal ou login da Prefeitura.

Esta entrega é uma área de trabalho privada para uso individual/piloto. Não inclui administração de equipes, perfis de acesso por fiscal ou trilha de auditoria certificada. O armazenamento usa um documento versionado: volumes institucionais grandes exigem normalização em tabelas e paginação no servidor. Antes de uso institucional, a unidade deve validar os prazos e as condições de hospedagem e acesso.

Os bancos local e hospedado são independentes. Faça backup local copiando `.wrangler/state` com o servidor parado. CSV é um relatório, não um backup completo. A auditoria pode ser exportada em JSON. Não há importação automática de backups pela interface.

## Verificação e estrutura

```sh
node tests/run.mjs
node node_modules/typescript/bin/tsc --noEmit
```

Os testes usam banco SQLite em memória separado e cobrem calendário, feriados, anos bissextos, quatro situações de prazo, cadastro, edição, duplicidade, nova vistoria, histórico, auditoria, exclusão, leitura de notificações e conflito de versão.

- `app/fiscaliza.tsx`: interface e navegação.
- `app/product.css`: identidade visual e responsividade.
- `app/api/workspace/route.ts`: validação e persistência.
- `lib/domain.ts`: regras e cálculo de prazos.
- `db/schema.ts` e `drizzle/`: esquema e migrações.
- `tests/`: testes isolados de regras e operações.

Tecnologias: React, TypeScript, Vinext/Vite, componentes Radix/Shadcn e Cloudflare D1. O código-fonte completo acompanha a aplicação.
