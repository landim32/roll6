# Medições de desempenho — Qualidade da vista 3D (053, FR-015)

Tempo médio de quadro por nível com **50 figuras em pé**, mapa de 4000×4000 com imagem de 1024 px e máscara de 40×40 células (~9% paredes), tela de 1600×900, câmera livre girando 360°, 60 quadros medidos após 5 de aquecimento. Figuras com uma imagem por lado no tamanho do nível (256 ou 480 px) e borda transparente.

## Computador de desenvolvimento (Windows 11, Node/V8 via Vitest — só o JavaScript de `drawRaycastFrame` + `drawFigureLayer`, sem o `putImageData`/`drawImage` do canvas)

| Aparelho | Nível | Colunas × linhas | ms/quadro | fps (JS) | Relativo ao Padrão |
|---|---|---|---|---|---|
| computador (dev) | Padrão | 480 × 270 | 9,83 | 102 | 1,0× |
| computador (dev) | Alta | 720 × 405 | 19,86 | 50 | 2,0× |
| computador (dev) | Ultra | 960 × 540 | 35,88 | 28 | 3,7× |

Leitura: a Alta fica exatamente no limite de 2× do plano; o Ultra fica perto de 30 fps só em JavaScript, antes do custo do canvas — é de fato "só para aparelhos fortes", como o texto do seletor avisa. Os números são relativos: o mesmo código no Chrome tem o mesmo motor (V8), mas a tela e o `drawImage` acrescentam alguns ms por quadro.

Procedimento: arquivo temporário `src/lib/_perf053.test.ts` (removido antes do commit) rodado com `npx vitest run --silent=false`.

## No navegador, com a mesa real (pendente)

| Aparelho | Nível | Colunas | ms/quadro | fps |
|---|---|---|---|---|
| computador (Chrome) | Padrão | 480 | pendente | |
| computador (Chrome) | Alta | 720 | pendente | |
| computador (Chrome) | Ultra | 960 | pendente | |
| celular | Padrão | 480 | pendente | |
| celular | Alta | 720 | pendente | |
| celular | Ultra | 960 | pendente | |

Roteiro: `quickstart.md` › "Medição de desempenho". Se a Alta ficar acima de 2× o Padrão ou o Ultra abaixo de 20 fps num computador comum, ajustar `QUALITY_PROFILES` em `frontend/src/lib/viewQuality.ts` (um só lugar) e medir de novo.
