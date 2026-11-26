# roll6 no Kubernetes (DigitalOcean)

Cluster DOKS `do-nyc2-emagine-k8s`, namespace `roll6`. Tráfego: **Cloudflare** (TLS público,
proxy) → **Cloudflare Tunnel compartilhado** `emagine-k8s` (pods `cloudflared` no namespace
`cloudflared`, conexão de saída, sem IP público nem Load Balancer) → **ingress-nginx compartilhado**
(interno, Service ClusterIP, HTTP) → Services `roll6-api` (8080), `roll6-mcp` (8080) e `roll6-web` (80).
O banco de dados (PostgreSQL) e o bucket (DigitalOcean Spaces) são externos ao cluster.

| Pasta | Conteúdo | Quem aplica |
|---|---|---|
| [`bootstrap/`](bootstrap/) | namespace `roll6` e a credencial restrita da pipeline (ServiceAccount `roll6-deployer`) | admin do cluster, uma vez |
| [`roll6/`](roll6/) | recursos do projeto (Deployments, Services, Ingress, ConfigMap) via Kustomize | pipeline **Deploy Production** (`kubectl apply -k`) |

A entrada compartilhada (ingress-nginx e cloudflared) é infra do **cluster** e já existe; não é
mantida neste repositório.

Nenhum arquivo daqui contém credenciais. Os Secrets `roll6-api-secrets` e `ghcr-pull` são
criados pela pipeline a partir dos secrets do environment `production` do GitHub; o job
`manifests` da pipeline confere a cada execução que nenhum Secret com dados foi versionado. O token
do túnel (Secret `cloudflared-token`, namespace `cloudflared`) é credencial do cluster e não vai
para o GitHub do projeto.

## Arquitetura

```
cliente → Cloudflare (HTTPS, Always Use HTTPS, Redirect Rule do www)
        → túnel emagine-k8s → pods cloudflared
        → http://ingress-nginx-controller.ingress-nginx.svc.cluster.local:80
        → Ingress roll6 (/api → roll6-api:8080, / → roll6-web:80)
        → Ingress roll6-stream (/hubs → roll6-api:8080 [SignalR/WebSocket], /mcp → roll6-mcp:8080; sem buffer)
```

- Sem TLS no Ingress: o HTTPS termina na Cloudflare.
- A API recebe o IP real em `X-Forwarded-For` e `X-Forwarded-Proto: https`, e confia nesses
  headers (o Service é ClusterIP: só o ingress fala com ela).
- A Cloudflare corta requisições sem resposta por mais de ~100 s (erro 524).
- **`roll6-api` fica com 1 réplica**: grupos do SignalR, fila do console (Claude/Codex), Modo GM e filas de
  notificação vivem em memória numa instância só.
- O nginx da imagem `roll6-web` é o mesmo da homologação (`frontend/nginx.conf`): SSI das prévias de link
  (inclui `/api/meta/head…` por dentro dele), `sw.js`/`manifest.webmanifest`/`version.json` sem cache e
  `/healthz`. Os Services `api` e `mcp` (`roll6/web-upstreams.yaml`) são apelidos para esse nginx resolver
  `proxy_pass http://api:8080`/`http://mcp:8080`.
- O SPA de produção sai na imagem `roll6-web`; depois da troca o `emagine-deploy` (`build-roll6.ps1`) deixa
  de ser usado para o Roll6.

## Secrets

| Nome no GitHub | Onde | Uso |
|---|---|---|
| `KUBECONFIG` | environment `production` | kubeconfig da ServiceAccount `roll6-deployer` (gerado no bootstrap) |
| `GHCR_PULL_USER` (variable) / `GHCR_PULL_TOKEN` | organização ou environment `production` | Secret `ghcr-pull` (PAT classic só com `read:packages`) |
| `ROLL6_CONNECTION_STRING` | repositório ou environment `production` | chave `ConnectionStrings__Roll6Context` do Secret `roll6-api-secrets` |
| `ROLL6_JWT_SECRET` (≥ 32 bytes) | repositório ou environment `production` | chave `Jwt__Secret` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | repositório ou environment `production` | chaves do Spaces (lidas pelo AWS SDK) |
| `ROLL6_VAPID_PUBLIC_KEY` / `ROLL6_VAPID_PRIVATE_KEY` (opcionais) | repositório ou environment `production` | `Push__PublicKey` / `Push__PrivateKey`; vazios = Web Push desligado |

Os secrets `ROLL6_*` e `AWS_*` são os mesmos do deploy antigo por SSH. O repositório é da conta pessoal
`landim32` (imagens em `ghcr.io/landim32/roll6-*`): os secrets da organização `emaginebr` não chegam aqui, então
`GHCR_PULL_USER`/`GHCR_PULL_TOKEN` precisam ser cadastrados no repositório (PAT com `read:packages` de quem
enxerga os pacotes `landim32/roll6-*`).

## Bootstrap (admin, uma vez)

Requer `kubectl` na máquina do admin, com o kubeconfig **de admin** do cluster. Esse kubeconfig
nunca vai para o GitHub nem para o repositório.

1. **Pré-requisitos**:
   - o banco de `ROLL6_CONNECTION_STRING` precisa ser alcançável **a partir do cluster**: se hoje ele roda no
     servidor antigo (rede `emagine-network`), migre-o ou exponha-o; em Managed DB, libere o cluster em
     *Trusted sources*;
   - **anotar o IP do servidor atual** no registro A/AAAA de `roll6.site` (para a reversão);
   - conferir a infra compartilhada: `kubectl -n ingress-nginx get deploy` e
     `kubectl -n cloudflared get pods` (2/2 Running).
2. **Namespace e credencial da pipeline** (gere o kubeconfig num diretório temporário fora do
   repositório):

   ```bash
   kubectl apply -f deploy/k8s/bootstrap/namespace.yaml
   kubectl apply -f deploy/k8s/bootstrap/deployer-rbac.yaml
   umask 077
   deploy/k8s/bootstrap/make-kubeconfig.sh > "$TMP/roll6-deployer.kubeconfig"
   KUBECONFIG="$TMP/roll6-deployer.kubeconfig" kubectl auth can-i create deployments -n roll6   # yes
   KUBECONFIG="$TMP/roll6-deployer.kubeconfig" kubectl auth can-i get pods -n kube-system          # no
   gh secret set KUBECONFIG --env production < "$TMP/roll6-deployer.kubeconfig"
   rm -f "$TMP/roll6-deployer.kubeconfig"
   ```

   Cadastrar também os demais secrets (tabela acima).

## Deploy

Actions → **Deploy Production** → `ref` = `main` (ou uma tag). A pipeline roda os testes, publica
as imagens `ghcr.io/landim32/roll6-api` e `roll6-web` com a tag `sha-<commit>`, cria os
Secrets do cluster, aplica `deploy/k8s/roll6` e espera o rollout. Conferir com
`kubectl -n roll6 get deploy,pods,ingress`.

Pela linha de comando (inclusive de um branch ainda não mergeado):

```bash
gh workflow run deploy-prod.yml --ref <branch> -f ref=<branch>
```

## Troca da origem na Cloudflare

1. **Validar por dentro** antes da troca, com um pod temporário (sem `--rm`, que perde linhas da
   saída):

   ```bash
   kubectl -n roll6 run routecheck --restart=Never --image=curlimages/curl:8.17.0 --command -- sh -c \
     "for p in /healthz /api/meta/head/ /version.json; do curl -s -o /dev/null -w \"\$p %{http_code}\n\" -H Host:roll6.site -H X-Forwarded-Proto:https http://ingress-nginx-controller.ingress-nginx.svc.cluster.local\$p; done"
   kubectl -n roll6 wait --for=jsonpath='{.status.phase}'=Succeeded pod/routecheck --timeout=90s
   kubectl -n roll6 logs routecheck
   kubectl -n roll6 delete pod routecheck
   ```

2. **www**: verificar **antes** da troca quem faz hoje o redirect `www` → `roll6.site`. Se for o
   servidor antigo, criar na Cloudflare: Rules → Redirect Rules, Request URL
   `https://www.roll6.site/*` → `https://roll6.site/${1}`, 301, preservando a query string (o
   registro do `www` precisa estar proxied); e SSL/TLS → Edge Certificates → **Always Use HTTPS**
   ligado. O `www` não entra no túnel nem no Ingress.
3. **Troca** (alguns segundos fora do ar):
   - Cloudflare → DNS da zona: apagar o registro A/AAAA de `roll6.site` (IP anotado no bootstrap);
   - Zero Trust → Networks → Tunnels → `emagine-k8s` → **Add route → Published application**:
     hostname `roll6.site`, Service `HTTP` `ingress-nginx-controller.ingress-nginx.svc.cluster.local:80`;
   - conferir o CNAME `roll6.site` → `<id-do-túnel>.cfargotunnel.com` (proxied); se o painel não o
     criar, criar à mão.
4. **Confirmar que o tráfego chega ao cluster**: o log do ingress deve mostrar o IP público real
   dos clientes (`kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since=2m | grep roll6.site`).
   Resposta com `server: cloudflare` não prova nada: compare com uma rota cujo conteúdo é diferente
   no servidor antigo. Se a API registrar um IP `10.109.x.x` (pod do cloudflared), o real-ip do
   ingress não está valendo.
5. Validação funcional: login, abrir uma campanha (o rodapé não pode mostrar "Sem tempo real" — WebSocket em
   `/hubs`), enviar uma imagem, `claude mcp list` com o servidor `https://roll6.site/mcp`, o console
   (`Roll6.Console`) conectando, e a prévia de link de `/campaign/<slug>` (SSI).

**Reverter a troca**: remover a rota de `roll6.site` no túnel (e o CNAME, se ficar) e recriar o
registro A/AAAA (proxied) com o IP anotado. O efeito é quase imediato.

## Desligar o ambiente antigo

Só depois da troca validada: no servidor antigo, `docker compose --env-file .env.prod -f docker-compose-prod.yml down`
em `/opt/roll6`; tirar o `roll6.site` do nginx compartilhado e do `emagine-deploy` (`builds/roll6`,
`build-roll6.ps1`); remover do GitHub os secrets `PROD_SSH_*`; apagar `docker-compose-prod.yml` e
`.env.prod.example` deste repositório.

## Operação

| Ação | Como |
|---|---|
| Deploy | Actions → Deploy Production (`ref`) |
| Rollback rápido | Deploy Production com a tag anterior e `skip_tests=true` (a imagem já existe, o build é pulado) |
| Rollback de emergência | `kubectl -n roll6 rollout undo deployment/roll6-api` (e `roll6-mcp`, `roll6-web`) |
| Logs | `kubectl -n roll6 logs deploy/roll6-api --tail=200 -f` |
| Status | `kubectl -n roll6 get deploy,pods,ingress -o wide` / `kubectl -n roll6 describe pod <pod>` |
| Túnel | `kubectl -n cloudflared logs deploy/cloudflared --tail=50` (erro 1033 na Cloudflare = túnel sem conector) |
| Rotacionar a credencial da pipeline | apagar o Secret `roll6-deployer-token`, reaplicar `bootstrap/deployer-rbac.yaml`, gerar outro kubeconfig e atualizar o secret `KUBECONFIG` |
