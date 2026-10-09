# Data Model: Metadados do mapa e favicon da marca (040)

Nenhuma tabela, coluna ou migração. Os metadados são calculados na hora a partir de dados que já existem.

## PageMeta (domínio, `Domain/Meta`)

| Campo | Origem (mapa) | Origem (campanha) | Genérica |
|---|---|---|---|
| `Title` | "{map.Name} — {campaign.Name}" | "{campaign.Name}" | "Roll6" |
| `Description` | "Campanha {campaign.Name}, mestre {master.Name}. Mapa {GridWidth}×{GridHeight} hexágonos." | "Campanha {campaign.Name}, mestre {master.Name}." | "Mesa virtual simples para RPG com mapas hexagonais." |
| `Url` | `{base}/map/{slug}` | `{base}/campaign/{slug}` | `{base}/` |
| `ImageUrl` | `{base}/api/meta/image/map/{slug}.jpg` (se o modelo tiver imagem) | idem, do mapa atual (se houver) | `{base}/brand/og-default.png` |
| `ImageAlt` | "Mapa {map.Name}" | "Mapa {currentMap.Name}" | "Roll6" |

Regras: `Title` ≤ 70 e `Description` ≤ 200 caracteres, cortados na última palavra inteira com "…"; tudo passa por encoding HTML na saída; mapas com `Status = Deleted` e slugs inexistentes geram a genérica.

## PreviewImage (Infra)

| Campo | Valor |
|---|---|
| Entrada | arquivo do modelo de mapa (`map_models.image`, lido por `IImageStorageAppService.OpenAsync`) |
| Saída | JPEG 1200×630, qualidade 80, imagem reduzida para caber (proporção mantida) e centralizada sobre `#0b1220` |
| Cache | `IMemoryCache`, chave `og:{fileName}`, tamanho = bytes, limite total ≈ 32 MB, expiração deslizante de 1 dia |

## Arquivos estáticos (`frontend/public/`)

| Arquivo | Tamanho | Uso |
|---|---|---|
| `favicon.ico` | 16/32/48 | endereço padrão do ícone |
| `brand/favicon-32.png`, `brand/favicon-48.png` | 32, 48 | `<link rel="icon">` |
| `brand/apple-touch-icon.png` | 180 | atalho iOS |
| `brand/og-default.png` | 1200×630 | prévia genérica |

## Configuração

`Site:BaseUrl` (string, opcional): URL pública do site sem a barra final. Vazia = derivada da requisição.
