# Fiscaliza · São Paulo

Sistema web para gestão de ações fiscais, prazos de retorno e continuidade da fiscalização municipal.

**Aplicação privada:** [fiscaliza-sp-miche.michell-denny.chatgpt.site](https://fiscaliza-sp-miche.michell-denny.chatgpt.site/)

## Principais recursos

- Dashboard de retornos atrasados, de hoje, em atenção e no prazo.
- Cadastro completo de demandas, edição e exclusão lógica.
- Prazos calculados por postura, em dias corridos ou úteis.
- Histórico de vistorias sem sobrescrever os registros anteriores.
- Busca, filtros, calendário mensal e relatórios em CSV.
- Importação de planilhas Excel e CSV com associação de colunas e prévia.
- Notificações internas e auditoria das alterações.
- Interface responsiva com Plus Jakarta Sans.

## Executar localmente

Requer Node.js 22.13 ou superior.

```sh
npm ci
npm run build
node scripts/prepare-local.mjs
npm run dev
```

Abra o endereço informado no terminal, normalmente `http://localhost:5173`.

Na primeira utilização, entre em **Configurações** e valide os prazos das posturas. Os valores iniciais são exemplos e não representam prazos legais confirmados.

Consulte [LEIA-ME.md](LEIA-ME.md) para instruções detalhadas, regras de cálculo, importação de planilhas, persistência e limitações da versão atual.

## Verificação

```sh
node tests/run.mjs
node node_modules/typescript/bin/tsc --noEmit
```

Tecnologias: React, TypeScript, Vinext/Vite, Radix/Shadcn, ExcelJS, Cloudflare D1 e Upstash Redis.

## Implantar na Vercel

O repositório já contém `vercel.json` e um build Vinext/Nitro compatível com a Vercel. Antes de usar a aplicação, conecte uma integração **Upstash Redis** ao projeto na Vercel; ela fornece automaticamente `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`. Depois, faça um novo deploy.

O site publicado pelo ChatGPT Sites continua usando Cloudflare D1. Os bancos das duas hospedagens são independentes.

Para manter a implantação da Vercel restrita, ative **Deployment Protection** no projeto. Sem essa configuração, a URL da Vercel é pública.
