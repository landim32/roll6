---
name: k8s-deploy
description: "Padrão emagine para publicar um projeto (API e/ou frontend) no cluster Kubernetes compartilhado da DigitalOcean (do-nyc2-emagine-k8s), atrás do Cloudflare Tunnel emagine-k8s e do ingress-nginx interno. Use para: configurar Kubernetes num projeto, criar manifestos/namespace/ServiceAccount, gerar a pipeline de deploy no cluster (GHCR + kubectl), operar o cluster (logs, rollback, status) ou fazer a troca de DNS na Cloudflare. Traz templates prontos com placeholders."
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
user-invocable: true
---

# k8s-deploy — padrão emagine para o cluster Kubernetes

Padrão para publicar qualquer projeto no cluster compartilhado da emagine. Os templates ficam em
`templates/` (ao lado deste arquivo): **copie, substitua os placeholders e adapte**, em vez de
escrever do zero.

## 0. Templates e placeholders

```text
templates/
├── README.md                 → deploy/k8s/README.md
├── app/                      → deploy/k8s/__APP__/
│   ├── kustomization.yaml
│   ├── api-configmap.yaml  api-deployment.yaml  api-service.yaml
│   ├── web-deployment.yaml web-service.yaml
│   ├── ingress.yaml          # rotas normais (/api → API, / → web)
│   └── ingress-stream.yaml   # rotas SSE/WebSocket/long polling, sem buffer
├── bootstrap/                → deploy/k8s/bootstrap/
│   ├── namespace.yaml  deployer-rbac.yaml  make-kubeconfig.sh
├── workflow/deploy-prod.yml  → .github/workflows/deploy-prod.yml
└── infra/                    # infra COMPARTILHADA do cluster; só se o cluster ainda não a tiver
    ├── ingress-nginx-values.yaml  install-ingress.sh
    └── cloudflared.yaml  install-cloudflared.sh
```

| Placeholder | Significado | Exemplo / padrão |
|---|---|---|
| `__APP__` | nome do projeto em minúsculas (DNS-1123): namespace e prefixo dos recursos (`__APP__-api`, `__APP__-web`, `__APP__-deployer`, `__APP__-api-secrets`, `__APP__-api-env`) | `meuapp` |
| `__APP_PREFIX__` | prefixo MAIÚSCULO dos secrets exclusivos do projeto no GitHub (`__APP_PREFIX___CONNECTION_STRING`, `__APP_PREFIX___JWT_SECRET`) | `MEUAPP` |
| `__DOMAIN__` | domínio público (host do Ingress, URL do environment) | `exemplo.com.br` |
| `__GHCR_OWNER__` | dono das imagens no GHCR (`ghcr.io/__GHCR_OWNER__/__APP__-api`) | `emaginebr` |
| `__BACKEND_DIR__` | contexto do build da imagem da API e pasta dos testes do backend | `backend` |
| `__FRONTEND_DIR__` | contexto do build da imagem do frontend e pasta dos testes do frontend | `frontend` |

Fluxo, na raiz do projeto (`SKILL_DIR` = pasta desta skill):

```bash
APP=meuapp; PREFIX=MEUAPP; DOMAIN=exemplo.com.br; OWNER=emaginebr; BACKEND=backend; FRONTEND=frontend
mkdir -p "deploy/k8s/$APP" deploy/k8s/bootstrap .github/workflows
cp "$SKILL_DIR"/templates/app/*            "deploy/k8s/$APP/"
cp "$SKILL_DIR"/templates/bootstrap/*      deploy/k8s/bootstrap/
cp "$SKILL_DIR"/templates/README.md        deploy/k8s/README.md
cp "$SKILL_DIR"/templates/workflow/deploy-prod.yml .github/workflows/deploy-prod.yml
# 1º apaga a linha de cabeçalho dos templates; __APP_PREFIX__ ANTES de __APP__
find deploy/k8s .github/workflows/deploy-prod.yml -type f -exec sed -i \
  "/Template k8s-deploy · placeholders/d; s/__APP_PREFIX__/$PREFIX/g; s/__APP__/$APP/g; s/__DOMAIN__/$DOMAIN/g; s/__GHCR_OWNER__/$OWNER/g; s/__BACKEND_DIR__/$BACKEND/g; s/__FRONTEND_DIR__/$FRONTEND/g" {} +
grep -rn '__[A-Z_]*__' deploy/k8s .github/workflows/deploy-prod.yml || echo 'ok: nenhum placeholder restante'
kubectl kustomize "deploy/k8s/$APP" > /dev/null && bash -n deploy/k8s/bootstrap/make-kubeconfig.sh
```

Depois, adapte: portas, health checks, recursos, rotas do Ingress, lista de secrets da pipeline e o
job `test`. Projeto sem frontend (ou sem API): apague os arquivos `web-*`/`api-*` e tire-os de
`kustomization.yaml` (`resources` e `images`) e da pipeline (build, rollout, diagnóstico).
Sem streaming: apague `ingress-stream.yaml` e tire de `resources`. O `sed` acima apaga a linha
de cabeçalho de cada template (comentário “Template k8s-deploy · placeholders …”).
`templates/infra/` só é copiado se o cluster ainda não tiver a infra compartilhada (seção 2).

## 1. Acesso ao cluster (kubeconfig padrão)

| Item | Valor |
|---|---|
| Cluster | `do-nyc2-emagine-k8s` (DigitalOcean, nyc2, 2 nós, Cilium) |
| Kubeconfig de admin (padrão) | `~/.kube/do-nyc2-emagine-k8s.kubeconfig` — Windows: `%USERPROFILE%\.kube\do-nyc2-emagine-k8s.kubeconfig`; Git Bash: `"$HOME/.kube/do-nyc2-emagine-k8s.kubeconfig"` |
| Ferramentas | `kubectl` e `helm` no PATH. Windows: `winget install -e --id Kubernetes.kubectl` e `winget install -e --id Helm.Helm` (os executáveis ficam em `%LOCALAPPDATA%\Microsoft\WinGet\Links`) |

Em todo comando contra o cluster, use o kubeconfig padrão explicitamente:

```bash
export KUBECONFIG="$HOME/.kube/do-nyc2-emagine-k8s.kubeconfig"
# Git Bash no Windows, se o winget não estiver no PATH:
export PATH="$PATH:$LOCALAPPDATA/Microsoft/WinGet/Links"
kubectl get ns
```

Regras do kubeconfig de admin:
- **Nunca** copiar para o repositório, para secrets do GitHub, para logs ou para a resposta ao usuário.
  Não usar `cat`/`kubectl config view --raw` nele. Não extrair o token.
- Ele é só para **operações de admin na máquina local** (bootstrap, infra compartilhada, diagnóstico).
  Pipelines usam a ServiceAccount do projeto (seção 5).
- Se o arquivo não existir ou der `401/Unauthorized`, pare e peça ao usuário um kubeconfig novo
  (DigitalOcean → Kubernetes → cluster → *Download Config File*, ou `doctl kubernetes cluster
  kubeconfig show do-nyc2-emagine-k8s`) para salvar nesse mesmo caminho.
- Antes de qualquer ação que altere o cluster, confirme com o usuário (é produção compartilhada).
  Leituras (`get`, `describe`, `logs`) podem ser feitas direto.

## 2. Arquitetura (o que já existe no cluster)

```
cliente → Cloudflare (TLS público, Always Use HTTPS, Redirect Rules)
        → Cloudflare Tunnel `emagine-k8s` (ID 83e57102-a794-4d31-aa28-1852f8820ffc, remotely-managed)
        → pods cloudflared (namespace cloudflared, 2 réplicas, conexão de SAÍDA)
        → http://ingress-nginx-controller.ingress-nginx.svc.cluster.local:80 (ClusterIP)
        → namespace do projeto → Services
```

**Infra compartilhada — NÃO reinstalar nem alterar sem pedido explícito** (afeta todos os projetos):

| Componente | Namespace | Template | Observações |
|---|---|---|---|
| ingress-nginx (chart `4.15.1`) | `ingress-nginx` | `templates/infra/ingress-nginx-values.yaml` + `install-ingress.sh` | `ClusterIP`, sem LB pago; `use-forwarded-headers`, `enable-real-ip`, `forwarded-for-header: CF-Connecting-IP`, `proxy-real-ip-cidr: 10.109.0.0/16` (faixa de pods) |
| cloudflared (`cloudflare/cloudflared:2026.11.2`) | `cloudflared` | `templates/infra/cloudflared.yaml` + `install-cloudflared.sh` | Token no Secret `cloudflared-token` (nunca no Git/GitHub) |

Confira antes de começar: `kubectl -n ingress-nginx get deploy` e `kubectl -n cloudflared get pods`.
Se a infra faltar (cluster novo), os scripts de `templates/infra/` instalam — com o ok do usuário.

Consequências que valem para todo projeto:
- Sem TLS no Ingress (o HTTPS termina na Cloudflare). Sempre `nginx.ingress.kubernetes.io/ssl-redirect: "false"`.
- O IP real do cliente chega à aplicação em `X-Forwarded-For` (e `X-Forwarded-Proto: https`).
  A aplicação deve confiar em forwarded headers (o Service é ClusterIP: só o ingress fala com ela).
- Limite de ~100 s da Cloudflare para requisições sem resposta (SSE precisa mandar dados antes disso).
- Sem Load Balancer da DigitalOcean (o LB e o PROXY protocol foram descartados de propósito).

## 3. Estrutura no repositório do projeto

```text
deploy/k8s/
├── README.md               # arquitetura, bootstrap, deploy, rollback, troca na Cloudflare
├── bootstrap/              # aplicado UMA vez pelo admin (kubeconfig padrão)
│   ├── namespace.yaml      # namespace <app>
│   ├── deployer-rbac.yaml  # ServiceAccount <app>-deployer + Role/RoleBinding só no namespace + token Secret
│   └── make-kubeconfig.sh  # imprime o kubeconfig da SA (vai para o secret KUBECONFIG do GitHub)
└── <app>/                  # aplicado pela pipeline (kubectl apply -k)
    ├── kustomization.yaml  # namespace, labels, resources, images (tag latest = marcador)
    ├── <svc>-deployment.yaml / <svc>-service.yaml / <svc>-configmap.yaml
    ├── ingress.yaml        # rotas normais
    └── ingress-stream.yaml # rotas com anotações próprias (SSE/streaming sem buffer)
.github/workflows/deploy-prod.yml
```

`deploy/k8s/infra/` **não** é copiado para os projetos: a infra é do cluster e já existe.
`.gitattributes` com `*.sh text eol=lf`; `.gitignore` com `*.kubeconfig` e `kubeconfig*`;
scripts commitados com `git add --chmod=+x`.

## 4. Padrões dos manifestos (ver `templates/app/`)

**Deployment** (`api-deployment.yaml` / `web-deployment.yaml`):
- `replicas: 1` (parâmetro simples de mudar), `strategy` RollingUpdate `maxSurge: 1`, `maxUnavailable: 0`
  → deploy sem queda; `progressDeadlineSeconds` 600 (API) / 300 (web); `revisionHistoryLimit: 5`.
- `imagePullSecrets: [ghcr-pull]`, `automountServiceAccountToken: false`.
- `envFrom`: ConfigMap `<app>-api-env` + Secret `<app>-api-secrets` (criado pela pipeline).
- Probes: API → `startupProbe` TCP (5 s × 60, cobre migrations no startup), `readinessProbe`
  HTTP `/health` (pode incluir o banco), `livenessProbe` TCP (sem banco, para não reiniciar em
  oscilação do banco). nginx/SPA → readiness/liveness HTTP `/healthz`.
- Recursos: API `100m/256Mi` → `500m/512Mi`; nginx `10m/32Mi` → `200m/128Mi`.
- `securityContext`: `runAsNonRoot: true`, `allowPrivilegeEscalation: false`. Imagens .NET 8 com
  `USER app` precisam de `runAsUser: 1654` (o kubelet exige UID numérico); outras stacks usam o
  UID não root da própria imagem.
- Outras stacks: ajuste porta (8080 é o padrão do .NET 8), caminho do health e recursos.

**Service**: `ClusterIP`, porta nomeada `http`.

**Ingress** (`ingress.yaml` / `ingress-stream.yaml`):
- `ingressClassName: nginx`, sem `tls`, `ssl-redirect: "false"`, `proxy-body-size` conforme o caso.
- Só o host principal (ex.: `app.dominio`). **Não** colocar `www` no Ingress nem no túnel.
- `pathType: Prefix` com caminhos explícitos (`Prefix` casa por segmento). **Não usar
  `ImplementationSpecific`** para prefixo de texto (ex.: `/.well-known/doc-`): o caminho cai na
  rota `/` da SPA e dá 502. Liste cada caminho exato (`/.well-known/<doc-1>`, `/.well-known/<doc-2>`).
- Rotas SSE/WebSocket/long polling em Ingress separado com `proxy-buffering: "off"`,
  `proxy-request-buffering: "off"`, `proxy-read-timeout`/`proxy-send-timeout: "3600"`.
- **Não usar `from-to-www-redirect`**: atrás do túnel ele gera `https://dominio:80/...`.

**Kustomization**: `namespace: <app>`, `labels` com `includeSelectors: false`, `images` com
`newTag: latest` (marcador; a pipeline troca por `sha-<commit>`). Secrets **nunca** em YAML versionado.

Valide offline: `kubectl kustomize deploy/k8s/<app>`.

## 5. Bootstrap do projeto (admin, uma vez, kubeconfig padrão)

Com `deploy/k8s/bootstrap/` gerado a partir de `templates/bootstrap/` e com o ok do usuário:

```bash
export KUBECONFIG="$HOME/.kube/do-nyc2-emagine-k8s.kubeconfig"
kubectl apply -f deploy/k8s/bootstrap/namespace.yaml
kubectl apply -f deploy/k8s/bootstrap/deployer-rbac.yaml
umask 077; bash deploy/k8s/bootstrap/make-kubeconfig.sh > "$SCRATCH/<app>-deployer.kubeconfig"
K2="$SCRATCH/<app>-deployer.kubeconfig"
KUBECONFIG=$K2 kubectl auth can-i create deployments -n <app>   # yes
KUBECONFIG=$K2 kubectl auth can-i get pods -n kube-system        # no
gh secret set KUBECONFIG --env production < "$K2" && rm -f "$K2"
```

(`$SCRATCH` = diretório temporário da sessão; nunca dentro do repositório.)

## 6. Secrets — convenção de nomes

| Escopo | Nome | Onde |
|---|---|---|
| Exclusivo do projeto | `<APP>_*` (ex.: `MEUAPP_CONNECTION_STRING`, `MEUAPP_JWT_SECRET`) | repositório ou environment `production` |
| Acesso ao cluster do projeto | `KUBECONFIG` (kubeconfig da SA `<app>-deployer`, nunca o admin) | environment `production` |
| Compartilhado (pull do GHCR) | `GHCR_PULL_USER` (variable) e `GHCR_PULL_TOKEN` (PAT classic só `read:packages`, de preferência conta de máquina) | organização `emaginebr` ou environment `production` |
| Token do túnel | — | **só** no Secret `cloudflared-token` do cluster |

Na pipeline, cada secret `<APP>_*` vira uma chave do Secret `<app>-api-secrets` (lida pela API como
variável de ambiente; no .NET `__` = `:`). Exemplos do template:
`__APP_PREFIX___CONNECTION_STRING` → `ConnectionStrings__Default` (obrigatório) e
`__APP_PREFIX___JWT_SECRET` → `Jwt__Secret` (opcional, ≥ 32 bytes). Para adicionar/remover, edite o
`env:` e a lista `NOME:VAR` dos passos **Validar secrets** e **Secrets do cluster**.
Publicação no GHCR usa o `GITHUB_TOKEN` (`permissions: packages: write`).

## 7. Pipeline (`templates/workflow/deploy-prod.yml`)

`workflow_dispatch` com `ref` e `skip_tests`; `concurrency: deploy-production`. Jobs:
1. `test` (pulado com `skip_tests`) — **adapte ao projeto** (exemplos: .NET `dotnet test`
   [`<solução>.sln`]; Node `npm ci && npm test && npm run build`).
2. `manifests` — `kubectl kustomize`, `bash -n` nos scripts e varredura de credenciais em `deploy/k8s/`.
3. `images` — `sha-<commit7>` + tag da ref no GHCR; pula o build se a imagem `sha-` já existe
   (rollback rápido). Build args públicos (ex.: `VITE_API_URL` vazio = mesma origem; outros
   `VITE_*` vindos de `vars`) — nunca segredos.
4. `deploy` — valida secrets obrigatórios (mensagem com o nome do que falta, sem imprimir valores);
   kubeconfig em `$RUNNER_TEMP` com `umask 077`; Secrets do cluster com
   `kubectl create secret ... --from-file ... --dry-run=client -o yaml | kubectl apply -f -`;
   `kustomize edit set image` (fallback `sed`); `kubectl apply -k`; `kubectl rollout status
   --timeout=10m`; diagnóstico `if: failure()` (get/describe/logs); resumo e limpeza `if: always()`.

Secrets entram nos passos só por `env:` (nunca `${{ secrets.X }}` dentro de `run:`), sem `set -x`.
Disparo de um branch ainda não mergeado: `gh workflow run deploy-prod.yml --ref <branch> -f ref=<branch>`.

## 8. Publicação e troca na Cloudflare

1. Deploy pela pipeline; validar **por dentro** antes da troca, com um pod temporário (o `kubectl run
   --rm -i` perde linhas: rode sem `--rm`, espere e leia os logs):
   ```bash
   kubectl -n <app> run routecheck --restart=Never --image=curlimages/curl:8.17.0 --command -- sh -c \
     "curl -s -H Host:<dominio> -H X-Forwarded-Proto:https http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/healthz"
   kubectl -n <app> wait --for=jsonpath='{.status.phase}'=Succeeded pod/routecheck --timeout=90s
   kubectl -n <app> logs routecheck; kubectl -n <app> delete pod routecheck
   ```
2. `www`: verificar **antes** da troca quem faz hoje o redirect `www` → apex (é comum ser o servidor
   antigo, que vai deixar de receber tráfego). Padrão: Rules → Redirect Rules, Request URL
   `https://www.<dominio>/*` → `https://<dominio>/${1}`, 301, preservar query string (registro do
   `www` proxied); e SSL/TLS → Edge Certificates → **Always Use HTTPS** ligado.
3. Troca (usuário, no painel): anotar o IP do registro A/AAAA atual (para reversão) e apagá-lo;
   Zero Trust → Tunnels → `emagine-k8s` → **Add route → Published application**: Subdomain conforme,
   Domain `<dominio>`, Service `HTTP` `ingress-nginx-controller.ingress-nginx.svc.cluster.local:80`.
   Se o CNAME `<tunnel-id>.cfargotunnel.com` (proxied) não for criado, criar à mão.
4. Confirmar que o tráfego chega ao cluster: o log do ingress deve mostrar o IP público real
   (`kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since=2m`). Resposta com
   `server: cloudflare` não prova nada — compare com uma rota cujo conteúdo difere do servidor antigo.
5. Reversão: remover a rota do túnel e recriar o A/AAAA (proxied) com o IP anotado.

## 9. Operação

| Ação | Comando |
|---|---|
| Status | `kubectl -n <app> get deploy,pods,ingress -o wide` |
| Logs | `kubectl -n <app> logs deploy/<app>-api --tail=200 -f` |
| Rollback rápido | pipeline com a tag/ref anterior e `skip_tests=true` |
| Rollback de emergência | `kubectl -n <app> rollout undo deployment/<app>-api` |
| Túnel | `kubectl -n cloudflared logs deploy/cloudflared --tail=50` (procure `Registered tunnel connection` / `Updated to new configuration`) |
| Faixa de pods | `kubectl get ciliumnodes -o jsonpath='{range .items[*]}{.spec.ipam.podCIDRs}{"\n"}{end}'` |
| Acesso ao banco gerenciado (VPC) | pod `busybox` com `nc -z -w 5 <host-privado> 25060` |

## 10. Lições aprendidas

- `pathType: ImplementationSpecific` para prefixo de texto não funciona como esperado: a rota cai
  na SPA e responde 502. Use `Prefix` e liste cada caminho exato.
- `from-to-www-redirect` atrás do túnel gera `https://dominio:80/...`. O redirect do `www` é uma
  Redirect Rule da Cloudflare.
- Verifique **antes** da troca quem faz o redirect do `www`: se era o servidor antigo, ele para de
  funcionar no momento da troca.
- A rota publicada no túnel nem sempre cria o CNAME `<tunnel-id>.cfargotunnel.com`: confira e crie
  à mão (proxied) se faltar.
- `kubectl run --rm -i` perde linhas da saída: rode sem `--rm`, espere `Succeeded`, leia os logs e
  apague o pod.
- `server: cloudflare` na resposta não prova que a requisição chegou ao cluster: confira o log do
  ingress ou uma rota cujo conteúdo difere do servidor antigo.

## 11. Checklist para um projeto novo

- [ ] Confirmar infra compartilhada (ingress-nginx e cloudflared) com o kubeconfig padrão.
- [ ] Templates copiados e placeholders substituídos (seção 0); nenhum `__X__` restante; `kubectl kustomize` ok.
- [ ] Aplicação confia em forwarded headers e expõe health (`/health` API, `/healthz` web).
- [ ] Bootstrap aplicado e `KUBECONFIG` da SA no GitHub (environment `production`).
- [ ] Secrets `<APP>_*` e `GHCR_PULL_*` disponíveis; banco acessível a partir do cluster.
- [ ] `.github/workflows/deploy-prod.yml` adaptado (job `test`, secrets, build args); deploy verde; validação por dentro.
- [ ] Troca na Cloudflare (rota publicada, A antigo removido, `www` e Always Use HTTPS conferidos).
- [ ] Commits no padrão do projeto (ex.: `fix:` com GitVersion); só commitar/push quando o usuário pedir.
