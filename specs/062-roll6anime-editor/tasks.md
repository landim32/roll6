---

description: "Task list for 062 — roll6anime, editor de animações com o Claude local"
---

# Tasks: roll6anime — editor de animações com o Claude local

**Input**: Design documents from `/specs/062-roll6anime-editor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (claude-cli.md, viewer-bridge.md, configuration.md, samples/claude-ok.jsonl), quickstart.md

**Tests**: o plano define testes (xUnit + FluentAssertions em `roll6anime/Roll6Anime.Tests`, Vitest em `roll6anime/viewer`), como nas features anteriores; eles entram em cada história.

**Organization**: tarefas agrupadas por história de usuário (spec.md: US1 e US2 P1, US3 P2, US4 P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: US1–US4
- Caminhos relativos à raiz do repositório (`C:\repos\Roll6`)

## Convenções que valem para todas as tarefas

- **C#**: namespaces file-scoped `Roll6Anime.*`, PascalCase, campos `_camelCase`, constantes UPPER_CASE, `Nullable`
  e `ImplicitUsings` ligados, `net8.0` no núcleo e nos testes, `net8.0-windows` + `UseWPF` na janela.
- **TypeScript**: `interface`, arrow functions, `const`.
- **Textos**: toda frase que o usuário vê é em português (FR-019).
- **Nunca gravar arquivos de animação** (FR-009). O único arquivo gravado é `state.json`.
- **Nunca rodar `docker`.**

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: a pasta `roll6anime/` com a solução, os três projetos .NET e a vista Vite.

- [X] T001 Create `roll6anime/Roll6Anime.sln` with three projects:
  - `roll6anime/Roll6Anime.Core/Roll6Anime.Core.csproj` (`net8.0`, class library);
  - `roll6anime/Roll6Anime/Roll6Anime.csproj` (`net8.0-windows`, `<UseWPF>true</UseWPF>`, `OutputType` WinExe, references Core);
  - `roll6anime/Roll6Anime.Tests/Roll6Anime.Tests.csproj` (`net8.0`, xUnit + FluentAssertions + Microsoft.NET.Test.Sdk at the same versions as `backend/Roll6.Tests/Roll6.Tests.csproj`, references Core).

  Add a `.gitignore` in `roll6anime/` for `bin/`, `obj/`, `viewer/node_modules/` and `Roll6Anime/wwwroot/viewer/`.
- [X] T002 [P] Link the backend validator into `roll6anime/Roll6Anime.Core/Roll6Anime.Core.csproj` with `<Compile Include="..\..\backend\Roll6.Domain\Animations\AnimationFormat.cs" Link="Linked\AnimationFormat.cs" />`, and the same for `Enums\AnimationType.cs` and `Exceptions\DomainValidationException.cs` (research R4). Do not copy the files.
- [X] T003 [P] Add NuGet packages to `roll6anime/Roll6Anime/Roll6Anime.csproj`:
  - `Microsoft.Web.WebView2` (latest stable);
  - `Microsoft.Extensions.Configuration.Json`, `Microsoft.Extensions.Configuration.Binder` and `Microsoft.Extensions.Configuration.EnvironmentVariables` (8.x).

  Copy `appsettings.json` and `wwwroot\viewer\**` to the output (`CopyToOutputDirectory=PreserveNewest`).
- [X] T004 [P] Link the shared animation fixtures into `roll6anime/Roll6Anime.Tests/Roll6Anime.Tests.csproj` the way `backend/Roll6.Tests/Roll6.Tests.csproj` does (`..\..\specs\059-token-animation-library\fixtures\*.json` with `LinkBase Fixtures\Animations`, copied to output). Also link `..\..\specs\062-roll6anime-editor\contracts\samples\*.jsonl` (`LinkBase Samples`).
- [X] T005 [P] Create the Vite + TypeScript view in `roll6anime/viewer/`:
  - `package.json` with scripts `build` (`vite build`) and `test` (`vitest run`);
  - devDependencies `vite`, `typescript`, `vitest` at the versions of `frontend/package.json`;
  - `tsconfig.json` (strict, `erasableSyntaxOnly`, like `frontend/tsconfig.app.json`);
  - `index.html`;
  - `vite.config.ts` with:
    - `base: './'`;
    - `build.outDir: '../Roll6Anime/wwwroot/viewer'` and `emptyOutDir: true`;
    - `resolve.alias`: `@roll6` → `../../frontend/src`, and `three` → the absolute path of `../../frontend/node_modules/three`, so there is one copy of three (research R2);
    - `server.fs.allow` including `../../frontend`.

**Checkpoint**: `dotnet build roll6anime/Roll6Anime.sln` and `npm run build` in `roll6anime/viewer` both succeed (empty app).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: configuração, leitura e validação da pasta, e o acompanhamento de arquivos. Tudo no núcleo, testado
sem janela.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

- [X] T006 [P] Create `roll6anime/Roll6Anime.Core/Settings/AnimeSettings.cs` (contracts/configuration.md).
  - Section name `Roll6Anime`.
  - Properties and defaults:
    - `AnimationsFolder` = `C:\repos\gurps-adventure\animacoes`;
    - `ClaudeWorkingDirectory` = `C:\repos\gurps-adventure`;
    - `ClaudeExecutable` = `claude`;
    - `ClaudeAllowedTools` = `Bash(python:*)`.
  - `Check()` returns the Portuguese messages for a missing animations folder or working directory (exact texts in contracts/configuration.md).
- [X] T007 [P] Create `roll6anime/Roll6Anime.Core/Settings/UserState.cs`:
  - `LastModel` (string?);
  - `Load()`/`Save()` on `%LOCALAPPDATA%\roll6anime\state.json`, with the folder injectable for tests;
  - a missing or broken file means an empty state, never an exception.
- [X] T008 [P] Create `roll6anime/Roll6Anime.Core/Animations/AnimationEntry.cs` (data-model.md), with:
  - `FileName`, `FullPath`, `Name`, `Type`, `Duration`, `Loop`, `Content` (`JsonElement?`, last valid), `Error` (`AnimationError(Key, Message)?`), `ChangedAt`;
  - `DisplayName` (Name, or the file name without `.json`);
  - `Summary` in Portuguese, e.g. "1,2 s · repete" / "1,4 s · uma vez".
- [X] T009 Create `roll6anime/Roll6Anime.Core/Animations/AnimationFolder.cs`:
  - `Read(string path, AnimationEntry? previous)` reads the file, with up to 5 tries 50 ms apart on `IOException`. A file over `AnimationFormat.MAX_BYTES` gets error `content` without parsing.
  - It parses JSON (broken JSON → key `content`, "O arquivo não é um JSON válido.", the same text as `animationFormat.ts`) and runs `AnimationFormat.Parse`, catching `DomainValidationException` into `Error`.
  - A valid read replaces `Content`. An invalid one keeps `previous.Content` (FR-008).
  - `List(string folder)` returns every `*.json` of the folder (no subfolders), sorted by name ignoring case.
- [X] T010 [P] Create `roll6anime/Roll6Anime.Tests/AnimationFolderTests.cs`:
  - every valid fixture (`aceno.json`, `roll6-*.json`) reads as valid with the right duration/loop;
  - every case of `expected.json` reads as invalid with exactly the expected key (SC-003);
  - a broken JSON gives `content`;
  - an invalid re-read keeps the previous `Content`;
  - `List` ignores non-json files and subfolders.

  Use a temporary directory per test.
- [X] T011 Create `roll6anime/Roll6Anime.Core/Animations/FolderWatcher.cs` (research R5):
  - wraps a `FileSystemWatcher` on `*.json` (`NotifyFilter` FileName | LastWrite | Size, no subdirectories);
  - per-file settle timer of 200 ms (`SettleDelay`, settable for tests), restarted on every event;
  - when it fires, raises `FileSettled(fileName)`;
  - `Deleted` settles like a change (the Claude's Write deletes and creates): when the timer fires, an existing file raises `FileSettled`, a missing one `FileRemoved(fileName)`; `Renamed` raises `FileRenamed(oldName, newName)`;
  - the watcher's `Error` event (buffer overflow) raises `FolderReset`;
  - `IDisposable`; events are raised on a thread-pool thread (the window marshals them).
- [X] T012 [P] Create `roll6anime/Roll6Anime.Tests/FolderWatcherTests.cs`, against a temporary directory with `SettleDelay` 100 ms:
  - three quick writes to the same file raise one `FileSettled`;
  - create, then delete, raises `FileRemoved`;
  - rename raises `FileRenamed`;
  - a `.txt` file raises nothing.

  Await the events with a timeout of 3 s.

**Checkpoint**: `dotnet test roll6anime/Roll6Anime.Tests` green; the folder can be read, validated and watched without a window.

---

## Phase 3: User Story 1 - Ver uma animação tocando num modelo (Priority: P1) 🎯 MVP

**Goal**: abrir um `.glb`, listar as animações da pasta, escolher uma e vê-la tocar como no Roll6, com barra de
tempo, pausa, busca e giro da câmera.

**Independent Test**: quickstart passos 1 e 2. O orc acena com `aceno-duplo.json`, pausa e mostra a pose de
0,6 s, e um arquivo inválido aparece marcado com a mensagem do Roll6.

### Tests for User Story 1

- [X] T013 [P] [US1] Create `roll6anime/viewer/src/player.test.ts` (Vitest), testing the pure part of `player.ts`:
  - `clampTime(time, duration)` keeps a time inside the new duration;
  - `formatTime(seconds)` gives "1,2 s";
  - `nextPlayback(state, message)` follows contracts/viewer-bridge.md:
    - `animation` with `keepTime` keeps the time (clamped) and the playing/paused flag;
    - without `keepTime` it starts at 0, playing;
    - `clear` disables the bar.

### Implementation for User Story 1

- [X] T014 [P] [US1] Create `roll6anime/viewer/src/player.ts` with the pure helpers above, plus `Player`:
  - holds an `AnimationMixer` on the model;
  - `setAnimation(file, fileName, keepTime)` builds the clip with `toRoll6Clip(file, 'animation:' + fileName)` from `@roll6/lib/animationFormat` and `buildRoll6Clip(clip, model, height)` from `@roll6/components/story/threeClips`. A non-looping clip gets `LoopOnce` + `clampWhenFinished`.
  - `play()`, `pause()`, `seek(t)` (`action.time = t; mixer.update(0)`) and `clear()` (stop all and put every node back to its loaded transform, like `ModelPreview`'s rest pose);
  - `playback()` → `{ time, duration, paused }`;
  - posts `animationError` when `buildRoll6Clip` returns null.
- [X] T015 [P] [US1] Create `roll6anime/viewer/src/timeline.ts`:
  - a play/pause button, an `input type="range"` (step 0.01) and a "1,2 s de 3,0 s" label;
  - the range follows `player.playback()` every frame;
  - dragging pauses and seeks;
  - play at the end of a non-looping clip restarts it;
  - disabled without animation.

  Texts in Portuguese, `aria-label`s on the controls.
- [X] T016 [US1] Create `roll6anime/viewer/src/main.ts` and `roll6anime/viewer/index.html`:
  - full-window canvas, `WebGLRenderer` (antialias), dark background `#0b1220`;
  - hemisphere and directional lights and a floor disc;
  - `OrbitControls` (`three/examples/jsm/controls/OrbitControls.js`).
  - **Model loading**: `loadModel(url)` + `instantiate(asset)` from `@roll6/components/story/loadModel`, scaled to 2 units tall and standing on the disc.
  - **Framing**: the camera on +Z looks at the model's centre (glTF +Z is the front); the framing is done on model load only.
  - **Loop**: the render loop updates the mixer.
- [X] T017 [US1] Create `roll6anime/viewer/src/bridge.ts` (contracts/viewer-bridge.md):
  - listen to `window.chrome.webview` messages `model` / `animation` / `clear` and drive `main.ts` / `Player`;
  - post `ready` once listening;
  - post `modelLoaded { mixamo: isMixamoSkeleton(asset.boneNames), bones }` (from `@roll6/lib/modelAnimations`) or `modelError { message }`;
  - post `animationError { message }`.

  Declare a minimal `interface` for `window.chrome.webview` in the file. Then run `npm run build` to fill `roll6anime/Roll6Anime/wwwroot/viewer/`.
- [X] T018 [US1] Create `roll6anime/Roll6Anime/ViewerBridge.cs`:
  - initialises the WebView2 (`EnsureCoreWebView2Async` with a user-data folder under `%LOCALAPPDATA%\roll6anime\WebView2`);
  - maps `viewer.roll6anime` → `<exe>\wwwroot\viewer` and navigates to `https://viewer.roll6anime/index.html`;
  - `OpenModel(path)` maps `model.roll6anime` → the model's folder (clearing the previous mapping) and posts `{ type: 'model', url: 'https://model.roll6anime/' + Uri.EscapeDataString(fileName), name }`;
  - `ShowAnimation(entry, keepTime)` posts `{ type: 'animation', fileName, file: entry.Content, keepTime }`;
  - `Clear()` posts `clear`;
  - raises `Ready`, `ModelLoaded(bool mixamo)`, `ModelError(string)` and `AnimationError(string)` from `WebMessageReceived`;
  - messages before `ready` are queued and sent once ready.
- [X] T019 [US1] Create `roll6anime/Roll6Anime/App.xaml` / `App.xaml.cs`:
  - load configuration with `ConfigurationBuilder` (`appsettings.json` from `AppContext.BaseDirectory` + environment variables), bound to `AnimeSettings`;
  - load `UserState`;
  - open `MainWindow`;
  - log unhandled exceptions to a message box instead of crashing.
- [X] T020 [US1] Create `roll6anime/Roll6Anime/MainViewModel.cs` (`INotifyPropertyChanged`, no MVVM library):
  - `Animations` (`ObservableCollection<AnimationEntry>`), `SelectedAnimation`;
  - `ModelPath`, `ModelWarning` ("O esqueleto deste modelo não usa os nomes do Mixamo: as animações não se aplicam a ele." when `mixamo` is false — FR-004), `StatusMessage`;
  - `OpenModel(path)` saves `UserState.LastModel` after `ModelLoaded`;
  - `Select(entry)`: a valid entry → `ShowAnimation(entry, keepTime: false)`; an invalid entry → no playback and its error shown as "{key}: {message}".
- [X] T021 [US1] Create `roll6anime/Roll6Anime/MainWindow.xaml` / `MainWindow.xaml.cs` with three resizable columns (`GridSplitter`):
  - **left**: "Abrir modelo…" (`OpenFileDialog`, filter `Modelo 3D (*.glb)|*.glb`), the model name, the animation list (display name, summary, a red "inválido" mark with the error as tooltip);
  - **centre**: the `WebView2` (via `ViewerBridge`), with the model warning and the selected animation's error above it;
  - **right**: placeholder for the conversation (US2).
  - On load: `AnimationFolder.List(settings.AnimationsFolder)` fills the list and the last model (`UserState`) reopens if it still exists.
  - Window title "roll6anime".

**Checkpoint**: quickstart passos 1 e 2 funcionam. US1 entrega sozinha a visualização sem o Claude.

---

## Phase 4: User Story 2 - Pedir ao Claude local para criar ou ajustar a animação (Priority: P1)

**Goal**: o campo de pedidos chama o Claude Code com a conta do usuário na pasta da mesa, com o contexto da tela.
A resposta aparece enquanto chega, o pedido pode ser parado, há uma conversa por animação, e o arquivo gravado
pelo Claude passa a tocar sozinho.

**Independent Test**: quickstart passos 4–8.

### Tests for User Story 2

- [X] T022 [P] [US2] Create `roll6anime/Roll6Anime.Tests/StreamJsonReaderTests.cs`:
  - reading `Samples/claude-ok.jsonl` yields `Started` (session `11111111-2222-4333-8444-555555555555`, `UsesAccount` true), `TextDelta("ok")` and `Finished(IsError false, Result "ok", no denials)`, in that order;
  - an `assistant` line with a `tool_use` item (`name` "Edit", `input.file_path` "animacoes/a.json") yields `ToolUse("Edit", "animacoes/a.json")`;
  - a `result` with `is_error` true and `permission_denials` `[{ tool_name: "Bash" }]` yields them;
  - non-JSON lines and unknown types are ignored.
- [X] T023 [P] [US2] Create `roll6anime/Roll6Anime.Tests/ConversationBookTests.cs`:
  - `For(file)` returns the same conversation (same `SessionId`) every time, ignoring case;
  - two files get different ids;
  - `Reset(file)` gives a new id and no messages;
  - `For(null)` is the "nova animação" conversation;
  - `Adopt(newFile)` moves it to the file and a later `For(null)` is a fresh one;
  - `Rename(old, new)` keeps the id;
  - `Started` is false until marked.
- [X] T024 [P] [US2] Create `roll6anime/Roll6Anime.Tests/PromptContextTests.cs`:
  - with an open file inside the working directory, the context text has "Animação aberta: animacoes/x.json" (path relative to the working directory);
  - outside it, the absolute path;
  - without a file, the "Nenhuma animação aberta — crie um arquivo novo em animacoes/" sentence;
  - with a model, its path;
  - the build of the argument list (`ClaudeArguments`) has `-p`, `--output-format`, `stream-json`, `--verbose`, `--include-partial-messages`, `--permission-mode`, `acceptEdits`, `--allowedTools` + the setting, `--append-system-prompt` + context, and `--session-id <id>` when not started or `--resume <id>` when started (contracts/claude-cli.md).

### Implementation for User Story 2

- [X] T025 [P] [US2] Create `roll6anime/Roll6Anime.Core/Claude/ClaudeEvent.cs`:
  - abstract record `ClaudeEvent` with `Started(Guid SessionId, bool UsesAccount)`, `TextDelta(string Text)`, `ToolUse(string Tool, string? Target)` and `Finished(bool IsError, string? Result, IReadOnlyList<string> PermissionDenials)`;
  - `ToolUse.Describe()` in Portuguese: "Lendo {target}" for Read/Glob/Grep, "Editando {target}" for Edit/Write, "Executando {target}" for Bash, else "{tool} {target}".
- [X] T026 [US2] Create `roll6anime/Roll6Anime.Core/Claude/StreamJsonReader.cs`: `static ClaudeEvent? ReadLine(string line)` with `System.Text.Json`, following the event table of contracts/claude-cli.md. The `assistant` text items are not repeated (they came as deltas).
- [X] T027 [P] [US2] Create `roll6anime/Roll6Anime.Core/Claude/ConversationBook.cs` (data-model.md, research R7): conversations keyed by file name (`StringComparer.OrdinalIgnoreCase`) or `NEW`. Each `Conversation` has `SessionId`, `Started` and `Messages` (a list of `ConversationMessage(Role user|claude|notice, Text)`), with `For`, `Reset`, `Adopt` and `Rename`.
- [X] T028 [P] [US2] Create `roll6anime/Roll6Anime.Core/Claude/PromptContext.cs`:
  - `Build(settings, animationPath?, modelPath?)` returns the context text of contracts/claude-cli.md (Portuguese);
  - `ClaudeArguments(settings, conversation, context)` returns the `List<string>` for `ProcessStartInfo.ArgumentList`.
- [X] T029 [US2] Create `roll6anime/Roll6Anime.Core/Claude/ClaudeRunner.cs` (research R6/R9):
  - `RunAsync(settings, conversation, context, prompt, IProgress<ClaudeEvent>, CancellationToken)` starts the process with `ArgumentList` and `WorkingDirectory`, with UTF-8 stdin/stdout/stderr redirected;
  - the environment drops `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_USE_BEDROCK` and `CLAUDE_CODE_USE_VERTEX`;
  - it writes the prompt to stdin and closes it, reads stdout line by line through `StreamJsonReader` and collects stderr;
  - on cancellation: `Kill(entireProcessTree: true)`, result `Stopped`;
  - it returns a `ClaudeOutcome` (`Done` | `Stopped` | `Failed(message)`) with the Portuguese messages of contracts/claude-cli.md (not found → `Win32Exception`; working directory missing; login/auth/401 text; other `is_error`);
  - after a `Started`, `conversation.Started = true`.
- [X] T030 [P] [US2] Create `roll6anime/Roll6Anime.Tests/ClaudeRunnerTests.cs`, without calling the real Claude:
  - `ClaudeExecutable` = a path that does not exist gives `Failed` with the "não foi encontrado" message;
  - a missing working directory gives its message;
  - a fake executable (a tiny `.cmd` written to a temp folder that echoes the lines of `Samples/claude-ok.jsonl`) gives `Done`, the events in order, and `conversation.Started`.

  Mark the fake-exe test `[Trait("OS","Windows")]`.
- [X] T031 [US2] Extend `roll6anime/Roll6Anime/MainViewModel.cs` with the conversation:
  - `Conversation` (the `ConversationBook.For(SelectedAnimation?.FileName)` messages, switching with the selection);
  - `PromptText`, `IsRunning`;
  - `Send()` builds `PromptContext`, runs `ClaudeRunner` and appends `TextDelta`s to the current Claude message, `ToolUse.Describe()` as notices, and the outcome/denials as notices;
  - `Stop()` cancels;
  - `NewConversation()` resets the open animation's conversation;
  - `NewAnimation()` clears the selection, so the next request uses the `NEW` conversation, and sends `clear` to the view.
- [X] T032 [US2] Wire the watcher for the open file in `roll6anime/Roll6Anime/MainViewModel.cs` (FR-008, US2-2, US2-6):
  - start `FolderWatcher` on `AnimationsFolder`;
  - on `FileSettled`, re-read with `AnimationFolder.Read(path, previous)` on the UI dispatcher and update the list item;
  - if it is the selected file and the read is valid → `ShowAnimation(entry, keepTime: true)`;
  - if invalid → show the error and keep playing (no message to the view).
- [X] T033 [US2] Adopt new files during a request in `roll6anime/Roll6Anime/MainViewModel.cs` (FR-015, US2-4): while a request of the `NEW` conversation runs, a `FileSettled` for a file not in the list adds it, `Adopt`s the conversation to it, selects it and plays it. A new file outside such a request is only added (US3).
- [X] T034 [US2] Add the conversation column to `roll6anime/Roll6Anime/MainWindow.xaml`:
  - a scrolling list of messages (user right, Claude left, notices in grey italics; auto-scroll to the end);
  - a multi-line `TextBox` (Enter sends, Shift+Enter new line);
  - the buttons "Enviar", "Parar" (only while running), "Nova conversa" and "Nova animação";
  - a header saying which animation the conversation belongs to ("Conversa: aceno-duplo.json" / "Conversa: nova animação").

  The text box is disabled while a request runs (one at a time).

**Checkpoint**: quickstart passos 4–8 funcionam com o Claude real.

---

## Phase 5: User Story 3 - Acompanhar mudanças feitas fora da ferramenta (Priority: P2)

**Goal**: a lista acompanha a pasta (criar, renomear, apagar), e a animação aberta reage a edições e remoções
feitas por qualquer programa.

**Independent Test**: quickstart passo 3, mais criar, renomear e apagar arquivos na pasta com o Explorer.

- [X] T035 [US3] Handle the rest of the watcher events in `roll6anime/Roll6Anime/MainViewModel.cs`:
  - `FileSettled` for an unknown file adds it in sorted position;
  - `FileRenamed` renames the item, calls `ConversationBook.Rename` and keeps the selection;
  - `FileRemoved` removes the item. If it was selected: `Clear()` on the view and status "A animação {nome} foi apagada da pasta."
  - `FolderReset` relists the folder keeping the selection by name.
- [X] T036 [P] [US3] Add to `roll6anime/Roll6Anime.Tests/FolderWatcherTests.cs` a test that a file written in two halves (first half, 50 ms pause, second half) raises a single `FileSettled`, after which `AnimationFolder.Read` is valid (edge case "arquivo pela metade").

**Checkpoint**: quickstart passo 3 e as mudanças de lista funcionam.

---

## Phase 6: User Story 4 - Configurar as pastas (Priority: P3)

**Goal**: as pastas vêm do `appsettings.json`, e uma pasta errada é explicada sem fechar a janela.

**Independent Test**: quickstart passo 9, e mudar `AnimationsFolder` para outra pasta com `.json`.

- [X] T037 [US4] Create `roll6anime/Roll6Anime/appsettings.json` with the defaults of contracts/configuration.md, and use `AnimeSettings.Check()` on start in `roll6anime/Roll6Anime/MainViewModel.cs`:
  - a missing animations folder shows its message in the status bar, leaves the list empty and starts no watcher;
  - a missing working directory disables "Enviar" with its message as tooltip.
- [X] T038 [P] [US4] Create `roll6anime/Roll6Anime.Tests/AnimeSettingsTests.cs`:
  - binding a configuration with the `Roll6Anime` section gives the values;
  - an empty configuration gives the defaults;
  - `Check()` returns the two messages for missing folders and nothing for existing ones (temporary directories).

**Checkpoint**: quickstart passo 9 funciona.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T039 [P] Create `roll6anime/README.md` in Portuguese: what the tool is, prerequisites (WebView2, Claude Code logged in, `npm install` in `frontend/`), build (`npm run build` in `viewer/`, `dotnet build`), configuration, how the conversation per animation works, and that it never writes animation files nor talks to the Roll6.
- [X] T040 [P] Update `CLAUDE.md`: a short "roll6anime (062)" section after "Frontend layout and commands" covering:
  - the layout of `roll6anime/`;
  - the build commands;
  - that the view imports `frontend/src` (changing `loadModel`/`threeClips`/`animationFormat` affects it);
  - that the validator is the backend file linked, so the format still has three implementations;
  - the Claude call (`claude -p` stream-json, `--session-id`/`--resume`, account login).

  Also a "Recent Changes" entry. Keep it LF and without a BOM.
- [X] T041 Run `npm run build` and `npm test` in `roll6anime/viewer`, `dotnet build roll6anime/Roll6Anime.sln` and `dotnet test roll6anime/Roll6Anime.Tests`. Also run `npm test` in `frontend/` and `dotnet test` in `backend/` (nothing of theirs changed, but the view imports the frontend and the core links backend files).
- [X] T042 Run the quickstart (`specs/062-roll6anime-editor/quickstart.md`) steps 1–10 with the real window, the orc and the real Claude Code, and fix what fails. Step 10 checks with `git status` in `C:\repos\gurps-adventure` that the tool itself wrote no animation file.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependency.
- **Foundational (Phase 2)**: after Setup. Blocks every story.
- **US1 (Phase 3)**: after Foundational. It is the window and the view, which every other story uses.
- **US2 (Phase 4)**: after US1, because it needs the window and `ViewerBridge.ShowAnimation`. Its core tasks (T022–T030) only need Foundational and can start in parallel with US1.
- **US3 (Phase 5)**: after US2's T032, which starts the watcher in the view model.
- **US4 (Phase 6)**: after US1. T038 is independent.
- **Polish (Phase 7)**: after all stories.

### Within Each Story

- Tests are written first and fail.
- Core (`Roll6Anime.Core`) before the window (`Roll6Anime`).
- The view's `npm run build` (T017) before running the window.

### Parallel Opportunities

- Setup: T002, T003, T004 and T005 are parallel after T001.
- Foundational: T006, T007 and T008 are parallel. T010 and T012 run in parallel with each other once T009/T011 exist.
- US1: T013, T014 and T015 (viewer files) are parallel. The C# side (T018–T021) is sequential in the window project.
- US2: T022, T023, T024, T025, T027, T028 and T030 are parallel (different files). The window tasks T031–T034 are sequential.
- US2 core and US1 window can be built at the same time by different people.

---

## Parallel Example: User Story 2 (core)

```bash
Task: "StreamJsonReaderTests in roll6anime/Roll6Anime.Tests/StreamJsonReaderTests.cs"
Task: "ConversationBookTests in roll6anime/Roll6Anime.Tests/ConversationBookTests.cs"
Task: "PromptContextTests in roll6anime/Roll6Anime.Tests/PromptContextTests.cs"
Task: "ClaudeEvent in roll6anime/Roll6Anime.Core/Claude/ClaudeEvent.cs"
Task: "ConversationBook in roll6anime/Roll6Anime.Core/Claude/ConversationBook.cs"
Task: "PromptContext in roll6anime/Roll6Anime.Core/Claude/PromptContext.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 + Phase 2.
2. Phase 3 (US1): open the orc, list the folder, play, pause, drag the bar.
3. **Stop and validate** quickstart steps 1–2. This already replaces "send to the Roll6 to see it".

### Incremental Delivery

1. + US2: requests to the local Claude with live update of the open file. This is the core value.
2. + US3: the list follows the folder, and external edits and removals are handled.
3. + US4: configuration errors explained.
4. Polish: README, CLAUDE.md, full test run and the quickstart with the real Claude.
