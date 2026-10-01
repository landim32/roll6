# Specification Quality Checklist: Ficha do personagem por campanha (texto e arquivo)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Validação: 2 iterações, todos os itens passando.** Iteração 1 reprovou 3 itens por 3 markers `[NEEDS CLARIFICATION]`; as 4 decisões foram coletadas com o usuário e incorporadas na seção "Decisões incorporadas" da spec. Iteração 2: nenhum marker restante (verificado por busca no arquivo).
- Decisões registradas: (1) a ficha da campanha em texto **substitui** as "Anotações da Campanha" da 023; (2) **dois modais separados** — o do personagem (ficha original) e o da campanha; (3) a edição do personagem é alcançada por um **ícone de editar na lista "Selecionar personagem"**; (4) na migração, **cópia da ficha atual + anotações existentes anexadas ao final**, sem perda de dados.
- Formatos citados (markdown, PNG/JPG/WebP, PDF, 10 MB, 20.000 caracteres) são requisitos de domínio pedidos pelo usuário e já usados nas specs 010 e 022 — não são vazamento de implementação.
- Conflito de histórico resolvido: a 010 definia a ficha da campanha como cópia da original; a 023 (commit `85a5010`) mudou para anotações que começam vazias. Esta feature **reverte a 023** e estende a cópia ao arquivo — registrado na Terminologia e em FR-001/FR-023.
- Regressão evitada: hoje o modal do card da campanha é o **único** caminho de edição do personagem (confirmado no código — `CharacterFormModal` só é aberto por `MainPage` via card e por `TopMenu` em modo criação). A US3 e os FR-015 a FR-018 existem para que o dono não perca o acesso à ficha original; por isso a US3 é P1, não P2.
- Ponto de atenção para o `/speckit.plan`: FR-010 preserva a exceção do **token** (dado do personagem que o mestre já pode alterar pela tela da campanha, features 011/012). Implementar "o mestre não altera nada do personagem" de forma absoluta quebraria isso.
- Ponto de atenção para o `/speckit.plan`: FR-008 exige que salvar o modal do personagem não altere participações, **exceto** o ajuste de valores atuais quando os totais descem (009), que hoje é feito no salvamento combinado do card.
