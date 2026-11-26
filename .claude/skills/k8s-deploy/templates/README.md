<!-- Template k8s-deploy · placeholders: __APP__, __APP_PREFIX__, __DOMAIN__, __GHCR_OWNER__ (ver SKILL.md). -->
# __APP__ no Kubernetes (DigitalOcean)

Cluster DOKS `do-nyc2-emagine-k8s`, namespace `__APP__`. Tráfego: **Cloudflare** (TLS público,
proxy) → **Cloudflare Tunnel compartilhado** `emagine-k8s` (pods `cloudflared` no namespace
`cloudflared`, conexão de saída, sem IP público nem Load Balancer) → **ingress-nginx compartilhado**
(interno, Service ClusterIP, HTTP) → Services `__APP__-api` (8080) e `__APP__-web` (80). O banco de
dados é externo ao cluster.

| Pasta | Conteúdo | Quem aplica |
|---|---|---|
| [`bootstrap/`](bootstrap/) | namespace `__APP__` e a credencial restrita da pipeline (ServiceAccount `__APP__-deployer`) | admin do cluster, uma vez |
| [`__APP__/`](__APP__/) | recursos do projeto (Deployments, Services, Ingress, ConfigMap) via Kustomize | pipeline **Deploy Production** (`kubectl apply -k`) |

A entrada compartilhada (ingress-nginx e cloudflared) é infra do **cluster** e já existe; não é
mantida neste repositório.

Nenhum arquivo daqui contém credenciais. Os Secrets `__APP__-api-secrets` e `ghcr-pull` são
criados pela pipeline a partir dos secrets do environment `production` do GitHub; o job
`manifests` da pipeline confere a cada execução que nenhum Secret com dados foi versionado. O token
do túnel (Secret `cloudflared-token`, namespace `cloudflared`) é credencial do cluster e não vai
para o GitHub do projeto.

## Arquitetura

```
cliente → Cloudflare (HTTPS, Always Use HTTPS, Redirect Rule do www)
        → túnel emagine-k8s → pods cloudflared
        → http://ingress-nginx-controller.ingress-nginx.svc.cluster.local:80
        → Ingress __APP__ (/api → __APP__-api:8080, / → __APP__-web:80)
        → Ingress __APP__-stream (rotas SSE/streaming, sem buffer)
```

- Sem TLS no Ingress: o HTTPS termina na Cloudflare.
- A API recebe o IP real em `X-Forwarded-For` e `X-Forwarded-Proto: https`, e confia nesses
  headers (o Service é ClusterIP: só o ingress fala com ela).
- A Cloudflare corta requisições sem resposta por mais de ~100 s (erro 524).

## Secrets

| Nome no GitHub | Onde | Uso |
|---|---|---|
| `KUBECONFIG` | environment `production` | kubeconfig da ServiceAccount `__APP__-deployer` (gerado no bootstrap) |
| `GHCR_PULL_USER` (variable) / `GHCR_PULL_TOKEN` | organização ou environment `production` | Secret `ghcr-pull` (PAT classic só com `read:packages`) |
| `__APP_PREFIX___CONNECTION_STRING` | environment `production` | chave `ConnectionStrings__Default` do Secret `__APP__-api-secrets` |
| `__APP_PREFIX___JWT_SECRET` (opcional, ≥ 32 bytes) | environment `production` | chave `Jwt__Secret` do Secret `__APP__-api-secrets` |

## Bootstrap (admin, uma vez)

Requer `kubectl` na máquina do admin, com o kubeconfig **de admin** do cluster. Esse kubeconfig
nunca vai para o GitHub nem para o repositório.

1. **Pré-requisitos**:
   - liberar o cluster no firewall do banco (Managed DB: *Trusted sources*), se for o caso;
   - **anotar o IP do servidor atual** no registro A/AAAA de `__DOMAIN__` (para a reversão);
   - conferir a infra compartilhada: `kubectl -n ingress-nginx get deploy` e
     `kubectl -n cloudflared get pods` (2/2 Running).
2. **Namespace e credencial da pipeline** (gere o kubeconfig num diretório temporário fora do
   repositório):

   ```bash
   kubectl apply -f deploy/k8s/bootstrap/namespace.yaml
   kubectl apply -f deploy/k8s/bootstrap/deployer-rbac.yaml
   umask 077
   deploy/k8s/bootstrap/make-kubeconfig.sh > "$TMP/__APP__-deployer.kubeconfig"
   KUBECONFIG="$TMP/__APP__-deployer.kubeconfig" kubectl auth can-i create deployments -n __APP__   # yes
   KUBECONFIG="$TMP/__APP__-deployer.kubeconfig" kubectl auth can-i get pods -n kube-system          # no
   gh secret set KUBECONFIG --env production < "$TMP/__APP__-deployer.kubeconfig"
   rm -f "$TMP/__APP__-deployer.kubeconfig"
   ```

   Cadastrar também os demais secrets (tabela acima).

## Deploy

Actions → **Deploy Production** → `ref` = `main` (ou uma tag). A pipeline roda os testes, publica
as imagens `ghcr.io/__GHCR_OWNER__/__APP__-api` e `__APP__-web` com a tag `sha-<commit>`, cria os
Secrets do cluster, aplica `deploy/k8s/__APP__` e espera o rollout. Conferir com
`kubectl -n __APP__ get deploy,pods,ingress`.

Pela linha de comando (inclusive de um branch ainda não mergeado):

```bash
gh workflow run deploy-prod.yml --ref <branch> -f ref=<branch>
```

## Troca da origem na Cloudflare

1. **Validar por dentro** antes da troca, com um pod temporário (sem `--rm`, que perde linhas da
   saída):

   ```bash
   kubectl -n __APP__ run routecheck --restart=Never --image=curlimages/curl:8.17.0 --command -- sh -c \
     "curl -s -H Host:__DOMAIN__ -H X-Forwarded-Proto:https http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/healthz"
   kubectl -n __APP__ wait --for=jsonpath='{.status.phase}'=Succeeded pod/routecheck --timeout=90s
   kubectl -n __APP__ logs routecheck
   kubectl -n __APP__ delete pod routecheck
   ```

2. **www**: verificar **antes** da troca quem faz hoje o redirect `www` → `__DOMAIN__`. Se for o
   servidor antigo, criar na Cloudflare: Rules → Redirect Rules, Request URL
   `https://www.__DOMAIN__/*` → `https://__DOMAIN__/${1}`, 301, preservando a query string (o
   registro do `www` precisa estar proxied); e SSL/TLS → Edge Certificates → **Always Use HTTPS**
   ligado. O `www` não entra no túnel nem no Ingress.
3. **Troca** (alguns segundos fora do ar):
   - Cloudflare → DNS da zona: apagar o registro A/AAAA de `__DOMAIN__` (IP anotado no bootstrap);
   - Zero Trust → Networks → Tunnels → `emagine-k8s` → **Add route → Published application**:
     hostname `__DOMAIN__`, Service `HTTP` `ingress-nginx-controller.ingress-nginx.svc.cluster.local:80`;
   - conferir o CNAME `__DOMAIN__` → `<id-do-túnel>.cfargotunnel.com` (proxied); se o painel não o
     criar, criar à mão.
4. **Confirmar que o tráfego chega ao cluster**: o log do ingress deve mostrar o IP público real
   dos clientes (`kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since=2m | grep __DOMAIN__`).
   Resposta com `server: cloudflare` não prova nada: compare com uma rota cujo conteúdo é diferente
   no servidor antigo. Se a API registrar um IP `10.109.x.x` (pod do cloudflared), o real-ip do
   ingress não está valendo.
5. Rodar o roteiro de validação funcional do projeto (login, fluxos principais, dados).

**Reverter a troca**: remover a rota de `__DOMAIN__` no túnel (e o CNAME, se ficar) e recriar o
registro A/AAAA (proxied) com o IP anotado. O efeito é quase imediato.

## Desligar o ambiente antigo

Só depois da troca validada: parar os containers antigos, retirar encaminhamentos do projeto em
proxies de outros servidores e remover do GitHub os secrets do deploy antigo (ex.: SSH).

## Operação

| Ação | Como |
|---|---|
| Deploy | Actions → Deploy Production (`ref`) |
| Rollback rápido | Deploy Production com a tag anterior e `skip_tests=true` (a imagem já existe, o build é pulado) |
| Rollback de emergência | `kubectl -n __APP__ rollout undo deployment/__APP__-api` (e `__APP__-web`) |
| Logs | `kubectl -n __APP__ logs deploy/__APP__-api --tail=200 -f` |
| Status | `kubectl -n __APP__ get deploy,pods,ingress -o wide` / `kubectl -n __APP__ describe pod <pod>` |
| Túnel | `kubectl -n cloudflared logs deploy/cloudflared --tail=50` (erro 1033 na Cloudflare = túnel sem conector) |
| Rotacionar a credencial da pipeline | apagar o Secret `__APP__-deployer-token`, reaplicar `bootstrap/deployer-rbac.yaml`, gerar outro kubeconfig e atualizar o secret `KUBECONFIG` |
