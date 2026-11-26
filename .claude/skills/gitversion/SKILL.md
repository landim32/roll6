---
name: gitversion
description: "Configura versionamento SemVer automático com GitVersion (GitVersion.yml + workflows do GitHub Actions que criam a tag e uma GitHub Release a cada nova versão) e cria commits no formato de mensagem que o GitVersion reconhece (major/minor/patch). Use para configurar GitVersion em um projeto ou sempre que for commitar em um projeto que tenha GitVersion.yml."
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
user-invocable: true
---

# GitVersion — configuração e commits

Esta skill tem dois modos:

1. **Configurar** — cria o `GitVersion.yml` e os workflows de tag e release no projeto
   (quando o usuário pedir, ou quando o projeto ainda não tiver `GitVersion.yml`).
2. **Commitar** — cria commits no formato que o `GitVersion.yml` reconhece (o uso do dia a dia).

## Input

`$ARGUMENTS` pode conter `setup`/`configurar` (modo configurar), uma descrição do que commitar, um
tipo/escopo já decidido pelo usuário, ou nada (analise `git status`/`git diff --staged` para
descobrir).

---

## Modo 1 — Configurar GitVersion no projeto

Os modelos ficam na pasta `templates/` ao lado deste `SKILL.md`:

| Modelo | Destino no projeto | Função |
|---|---|---|
| `templates/GitVersion.yml` | `GitVersion.yml` (raiz do repositório git) | Regras de versionamento: branches, regex de mensagens de commit, prefixo de tag `v` |
| `templates/workflows/version-tag.yml` | `.github/workflows/version-tag.yml` | Workflow **"Version and Tag"**: a cada push no `main`, calcula a versão com GitVersion e cria a tag `vX.Y.Z` |
| `templates/workflows/create-release.yml` | `.github/workflows/create-release.yml` | Workflow **"Create Release"**: roda quando o "Version and Tag" termina com sucesso e cria uma **GitHub Release para cada nova versão — major, minor ou patch** — com notas geradas automaticamente desde a tag anterior |

### Passos

1. Identifique a raiz do repositório git (`git rev-parse --show-toplevel`). Em monorepos com vários
   repositórios git, pergunte em qual(is) configurar.
2. Verifique se algum dos três destinos já existe. **Nunca sobrescreva sem perguntar** — se existir,
   mostre a diferença para o modelo e pergunte se deve substituir, mesclar ou manter.
3. Copie os modelos **sem alterar o conteúdo**, criando `.github/workflows/` se não existir.
   - O nome `Version and Tag` em `version-tag.yml` precisa ser igual ao valor de
     `workflows: ["Version and Tag"]` em `create-release.yml` — se renomear um, renomeie o outro.
   - Se o branch principal não for `main`/`master`, ajuste `on.push.branches` em `version-tag.yml`
     (a regex do branch `main` no `GitVersion.yml` já cobre `main` e `master`).
4. Se o repositório já tiver tags de versão, confira se seguem o formato `vX.Y.Z` — o GitVersion
   parte da maior tag existente. Se não houver nenhuma tag, a primeira versão calculada será `0.1.0`
   (ou a que o histórico de commits indicar); para começar de outra versão, sugira criar a tag
   inicial manualmente (ex.: `git tag v1.0.0 && git push origin v1.0.0`).
5. Informe ao usuário:
   - Os arquivos criados.
   - Que em **Settings → Actions → General → Workflow permissions** o repositório (ou a organização)
     deve permitir *Read and write permissions*, senão o push da tag e a criação da release falham.
   - Que o commit de configuração deve seguir o formato da tabela abaixo (ex.:
     `ci: configura gitversion e workflows de release`) e que, a partir do próximo push no `main`,
     cada commit gera uma tag e uma release.

---

## Modo 2 — Commit no formato do GitVersion

Você vai criar um (ou mais) commit(s) cuja primeira linha segue **exatamente** o formato que o
`GitVersion.yml` do projeto usa para decidir se a próxima versão sobe de **major**, **minor** ou
**patch**. Errar o formato (esquecer o `:`, usar um tipo não reconhecido, ou usar um separador
diferente de `:`) faz o commit cair no incremento padrão do branch — no `main`, normalmente,
isso é sempre **Patch**, silenciosamente, sem aviso nenhum. Com o `create-release.yml` desta skill,
**todo push no `main` gera uma release**, então o tipo do commit decide qual número sobe.

### Antes de tudo: confirme que este projeto usa GitVersion

Procure um `GitVersion.yml` (ou `GitVersion.yaml`) na raiz do repositório git relevante (em
monorepos com vários repositórios git, procure dentro do subprojeto onde as mudanças estão). Se
existir, **leia-o** — os valores de `major-version-bump-message` / `minor-version-bump-message` /
`patch-version-bump-message` / `no-bump-message` são a fonte da verdade. As regras abaixo descrevem
a configuração de `templates/GitVersion.yml`; se o `GitVersion.yml` do projeto divergir, siga o que
ele disser, não este documento. Atenção especial: regex antigas como `'^(feat|feature|minor):'` **não**
aceitam escopo (`feat(api):`) nem `!` — nesse caso, não use escopo e use `major:` para breaking.

Se não existir `GitVersion.yml`, pergunte se o usuário quer configurar (Modo 1) antes de commitar.

### Formato aceito

```
<tipo>(<escopo opcional>)<!opcional>: <descrição no imperativo, minúscula, sem ponto final>
```

- **Dois-pontos obrigatório** logo após o tipo (ou depois do escopo, ou depois do `!`) — sem espaço
  antes do `:`.
- **Escopo é opcional** e vai entre parênteses, sem espaço antes do `(` — ex.: `feat(leads): ...`.
  Use o nome da área/módulo afetado (ex.: `leads`, `auth`, `pipeline`, `compliance`).
- **`!` logo antes do `:`** marca *breaking change* — sempre vira **major**, não importa o tipo
  (ex.: `feat(api)!: remove campo legado do payload`).
- Corpo do commit (linhas depois da primeira, opcional) é livre — descreva o *porquê*, não o *o quê*.

#### Tabela de tipos → incremento de versão

| Tipo (na primeira linha) | Incremento | Quando usar |
|---|---|---|
| `major:` ou `breaking:` | **Major** (`X+1.0.0`) | Mudança que quebra compatibilidade, remove/renomeia contrato público. |
| Qualquer tipo + `!:` (ex. `feat(x)!:`, `fix(x)!:`) | **Major** | Mesma coisa, notação Conventional Commits — prefira esta forma a `major:`/`breaking:` quando o commit também é, por si, um `feat`/`fix`. |
| `feat:`, `feature:` ou `minor:` | **Minor** (`x.Y+1.0`) | Funcionalidade nova, aditiva, não quebra nada existente. |
| `fix:` ou `patch:` | **Patch** (`x.y.Z+1`) | Correção de bug, sem mudar contrato. |
| Qualquer outro tipo (`chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `build:`, `style:`, `perf:`, ou nenhum tipo reconhecido) | Incremento padrão do branch (no `main`: **Patch**) | Não é isso que decide a versão — é só convenção legível. Não force `feat:`/`fix:` num commit que não é isso só para "subir versão". |

#### Nunca incrementar (raro)

Para um commit que **não deve** mudar a versão de jeito nenhum (ex.: ajuste de CI que não afeta o
código versionado), inclua em qualquer linha do commit:

```
+semver: skip
```

(ou `+semver: none` — ambos aceitos). Use com moderação — é uma exceção, não o padrão.

### Exemplos reais

```
feat(leads): adiciona atribuicao automatica de vendedor na pipeline
```
```
fix(webhook): corrige verificacao de segredo em tempo constante

O comparador anterior usava == direto, vulneravel a timing attack.
```
```
feat(api)!: renomeia responsibleSellerUserId para sellerUserId no payload de lead

BREAKING CHANGE: clientes que leem o campo antigo precisam migrar.
```
```
chore(deps): atualiza AutoMapper para corrigir CVE

+semver: skip
```

### Como aplicar

1. Rode `git status` e `git diff --staged` (ou `git diff` se nada estiver staged ainda) para
   entender o que está mudando.
2. Escolha o tipo mais específico que reflita o **efeito observável** da mudança, não o arquivo
   tocado — um novo endpoint é `feat`, mesmo que a maior parte do diff seja em `Infra/`.
3. Escolha um escopo curto (uma palavra, kebab-case se precisar de mais de uma) — o nome da
   área/módulo, não o nome do arquivo.
4. Monte a primeira linha seguindo a tabela acima. Se a mudança quebra compatibilidade, use `!`.
5. Se nada estiver staged, faça `git add` dos arquivos relevantes (nunca `git add -A`/`git add .`
   às cegas — revise o que está sendo incluído).
6. Commite com a mensagem via heredoc (nunca `-m` com aspas simples/duplas quebráveis):

   ```bash
   git commit -m "$(cat <<'EOF'
   feat(leads): adiciona atribuicao automatica de vendedor na pipeline

   Corpo opcional explicando o porque, se precisar.
   EOF
   )"
   ```

7. Depois de commitar, você pode conferir a versão que o GitVersion calcularia com o `dotnet-gitversion`
   local (se instalado): `dotnet-gitversion . /config GitVersion.yml` na raiz do repositório —
   útil para confirmar que o tipo escolhido realmente bateu com a regex antes de dar push.

### Erros comuns que quebram o reconhecimento

- `feat: minha mudanca` com **maiúscula** depois do tipo — funciona (a regex não é case-sensitive
  pro tipo em si), mas `Feat:` (tipo maiúsculo) **não bate** com `^(feat|feature|minor)`. Use o tipo
  sempre em minúsculas.
- Espaço entre o tipo e os dois-pontos (`feat :`) — não bate, o `:` precisa vir colado.
- Escopo sem parênteses (`feat leads: ...`) — não bate; o parêntese é obrigatório se for usar escopo.
- Prefixo dentro do corpo, não na primeira linha (ex.: primeira linha genérica, e "feat: hint" só no
  corpo) — o GitVersion escaneia a mensagem completa, então tecnicamente funciona, mas **não faça
  isso**: deixe o tipo sempre na primeira linha, é o que humanos e ferramentas (changelog, PR title)
  esperam ler primeiro.
