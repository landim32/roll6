namespace Roll6.Mcp;

/// <summary>Reference guide of the Roll6 domain for AI assistants (020), served as a resource and a tool.</summary>
public static class Roll6Guide
{
    public const string URI = "roll6://guide";

    /// <summary>Short version sent as the server instructions on connect.</summary>
    public const string INSTRUCTIONS = """
        Roll6 is a simple virtual tabletop: campaigns run by a master (game master) with players' characters, hex maps
        with pieces, turns and a secret campaign plan. Every tool acts as the user who owns the API key, with exactly
        the same permissions as the REST API. Before using map, piece or turn tools, read the guide (resource
        roll6://guide or tool get_roll6_guide): it explains the hex coordinates (x = column, y = row, look 0-5
        clockwise from the top), roles and the usual tool sequences. Errors come back as problem details with an
        HTTP-like status and messages in Portuguese. Destructive tools are irreversible: confirm with the user first.
        """;

    public const string MARKDOWN = """
        # Roll6 guide for assistants

        Roll6 is a deliberately simple virtual tabletop (a small Roll20). Everything you do through these tools is
        done **as the user who owns the API key**, with the same permissions and validations as the REST API.
        Error messages come from the API in **Portuguese**; the status tells you the kind of error.

        ## Roles
        - **Master** (game master, GM): the user who created a campaign. Manages its maps, pieces, NPCs, characters'
          participation, turns and the campaign plan. Sees everything in the campaign.
        - **Player**: a user whose character takes part in a campaign.
        - **Owner**: the user who created a library item (token, character, NPC, map model).
        - **Approved participant**: a player with at least one character **approved** in the campaign. Only the master
          and approved participants can read a campaign's maps, pieces, NPCs, party and turns.

        ## Library vs campaign
        - **Tokens**: images used to draw pieces (up image; optional down image). Shared library: anyone can search
          and use them; only the creator changes them.
        - **Characters**: belong to a player (name, picture, token, life, energy, move, markdown sheet). `life` and
          `energy` are **totals**. A character joins campaigns through a **participation**. The owner can hand a
          character to another user by e-mail (`transfer_character`): only the owner changes — participations, campaign
          values, pieces and turn entries stay exactly as they were. Besides the markdown `sheet`, a character may have a
          **sheet file** (image or PDF, stored as sent): `upload_document` → `sheetFile` on create/update_character.
          Both are copied to each participation when the character joins that campaign, and from then on the campaign's
          copy changes only there.
        - **NPCs**: belong to a master's library (require a token). The master adds his own NPCs to a campaign
          (campaign NPC) and places **occurrences** (instances) on maps — what the map shows are the occurrences. Each one
          has its own name (the NPC's, then "{name} 2", "{name} 3"… per map, the smallest free number), status, posture,
          current life/energy (at most the NPC's totals) and Deslocamento (`currentMove`, starts at the NPC's move and
          follows a changed NPC move only while untouched); its piece shows them with the NPC's sheet. `update_map_npc`
          changes one occurrence; `delete_map_npc` takes it off the map keeping the NPC in the campaign and everything it
          did in the chat and the turn summary under its name; `remove_npc_from_campaign` removes the NPC and all its
          occurrences (history kept too). Each campaign NPC has a **category** (071): Inimigo (default), Neutro or Aliado
          (`update_campaign_npc`). Allies show on the party's side and, when the master gives one a **master character**
          (an approved character of the campaign), the current owner of that character commands all its occurrences:
          act, reset, move (within the occurrence's Deslocamento), posture, and life/energy/status. Name, Deslocamento,
          removal and new occurrences stay with the master. Pieces carry `npcCategory` and `commanderUserId`.
        - **Map models**: the image + grid layout (a reusable map). A **campaign map** is a map model added to a
          campaign; its pieces live on the campaign map.

        ## Campaigns and participation
        - Campaigns are listed for everyone (`list_campaigns`, `mine=true` for your own). **Open** campaigns approve
          access requests immediately; closed ones wait for the master.
        - A campaign may have a **picture** for the app's library cards: `image` on `create_campaign`, or
          `set_campaign_image` (master only; upload with `upload_image` first; null removes it).
        - Participation status: `1 Invited`, `2 RequestedAccess`, `3 Approved`, `4 Denied`.
          Player: `request_campaign_access`, `accept_invite`, `decline_invite`. Master: `invite_character`,
          `approve_access_request`, `deny_access_request`, `remove_participation`.
        - Each participation holds the campaign values of the character: current life/energy (may go to 0 or below;
          that does not change posture), a free-text status, the posture, and the character's **campaign sheet** — the
          participation's `sheet` and `sheetFile`, copied from the character when they join and from then on editable
          only here, by the owner or the master (`update_participation`). The character's own sheet and sheet file are
          never changed by campaign play, and the master cannot change them at all.
        - **Deslocamento** (`currentMove`, per participation): how many movement points a player may spend per turn with
          the character on this campaign's maps — the limit of `move_map_token` for players. It starts at the
          character's `move` when the character joins (or is approved again), the owner or the master change it with
          `update_participation` (e.g. lower it for a wounded character; it may also go above `move`), and while nobody
          has adjusted it it follows the character's `move`. It never limits the master, and NPCs keep their own move.
        - The campaign's **current map** (`set_current_map`, master) is the map all players follow in the app. It changes
          only through that call (in the app, the master's "Tornar atual"); opening or editing other maps never moves the
          players, and only an active map can be current. The current map has status 4 ("Atual"; at most one per
          campaign), the previous one goes back to 1, and it can't be archived while current.
        - Every campaign and every campaign map has an immutable **slug** (built from the name, unique on the whole
          site; renaming does not change it). `get_campaign_by_slug` and `get_map_by_slug` open them.
          `list_my_table_campaigns` lists the campaigns where you are the master or have an approved character, each
          with the map the table is following.

        ## Campaign status
        - Every campaign has a `status`: `1 Preparing` ("Preparando", new campaigns start here), `2 Active` ("Ativa"),
          `3 Paused` ("Pausada"), `4 Finished` ("Finalizada"). Only the master changes it (`set_campaign_status`), to any
          other status.
        - Only an **active** campaign plays. Otherwise these answer 409 "A campanha está …": acting, converting to/from
          an action, resetting, finishing/processing/setting the turn, poking, and characters joining (request, invite,
          approve, accept). Pieces, NPC occurrences and new campaign maps answer 409 too — except for the master while
          the campaign is Preparing, so the table can be built before it starts.
        - The conversation chat always works: messages, photos, audios, dice rolls, polls and votes, reactions, replies,
          whispers. Sheets, settings, the plan, archiving maps and the current map are never blocked either.

        ## Free mode
        - The master switches the campaign's `freeMode` (`set_campaign_free_mode`, any status; read it in `get_campaign`,
          `get_campaign_by_slug`, `list_my_table_campaigns`). It is a flag of the campaign: it stays on across turns
          until the master turns it off, and switching it never touches the turn (no confirmation, no finish, nothing
          cancelled or deleted).
        - While it is **on**: character and NPC pieces move any number of times per turn (`move_map_token`), without the Deslocamento limit
          and **without a Movement entry** — nothing is recorded, so there is no trail and the summary's positions are
          just where the pieces are; `finish_turn` finishes at once (no pending list); no "Falta apenas você…" notice;
          `reset_turn` only cancels the actor's actions and leaves the piece where it is.
        - Actions are **not** changed by it: an actor has one valid action per turn in any mode, and a new action (or
          `convert_chat_entry` to an action) cancels the previous one.
        - Never changed by it: `process_turn` (still finishes the turn; the mode stays on), `set_current_turn`, the admin
          log tools, pokes, the chat, the campaign status rules (outside Active everything stays frozen) and the
          occupancy rules of `move_map_token` (an occupied hex or a hex outside the grid is still refused).
        - **Shared walk** (069): while it is on, a player walks his own standing character in the 3D view; everyone sees
          it walk and its piece follows hex by hex (`move_map_token` with `walk: true`, current map only). The walk passes
          through other pieces and may stop on an occupied hex — only walls of the 3D view and the map edge stop it.
        - When it goes **off**, the normal rules return from the next move of each actor: moves are again one per turn
          and limited. Switching it off is
          **refused (409) while pieces share a hex** on any map of the campaign; the error names them, so move them apart
          first.
        - The pending notice over the chat (the pictures of who still owes a play) is a separate flag, `pendingNotice`
          (`set_campaign_pending_notice`, master, any status, on by default). While on it also shows in free mode.

        ## Hex grid (maps)
        - Flat-top hexagons in a rectangle of `gridWidth` columns × `gridHeight` rows; odd columns are shifted half a
          hex down ("odd-q" layout).
        - Positions are **`x` = column** and **`y` = row**, both 0-based, inside the grid. A hex holds one piece; big
          pieces take several hexes (see "Posture and piece size").
        - **`look`** = the side a piece faces, **0–5 clockwise starting at the top**: 0 up, 1 up-right, 2 down-right,
          3 down, 4 down-left, 5 up-left.
        - Movement cost (enforced for players): 1 for each step into the hex ahead, 1 for each 60° turn; the shortest
          path goes around other pieces; the total must fit the character's **Deslocamento** in the campaign
          (`currentMove` of the participation). The master moves anything freely.
          A big piece needs its whole shape free and inside the grid at every step and turn.

        ## Pieces (map tokens)
        - Types: `1 Character` (a campaign participation, blue), `2 Npc` (an NPC occurrence, red), `4 Object`
          (anything else, gray).
        - Master: `add_object_to_map`, `place_character_on_map` (a participation; each character once per map),
          `place_npc_on_map` (creates the occurrence and its piece), `change_map_token_image`, `update_map_token`,
          `delete_map_token`. Everyone at the table: `list_map_tokens`, `list_map_npcs`.
        - `move_map_token` moves and turns a piece (master: any piece; player: his own approved character).

        ## Posture and piece size
        - Characters and NPC occurrences have a **`posture`**: `1` standing, `2` down ("Caído", drawn lying) or `3` out of
          combat ("Fora de combate", lying and in black and white). The character's owner or the master changes a
          character's (for all its pieces in the campaign); only the master changes an NPC's. Tools:
          `set_piece_posture`, or `posture` in `update_participation`, `update_map_npc` and `process_turn`. It is logged
          in the turn and is separate from the free-text status and from life: 0 or below does not lay the piece down.
          Objects have none. A library NPC (`create_npc`/`update_npc`) also has a `posture`: the one each new occurrence
          starts with (default standing); the piece is placed with the size of that posture.
        - Tokens have a standing size (`upSpace`) and an optional down size (`downSpace`), each **1, 2, 3, 7 or 10**
          hexes; a piece takes the down size while down or out of combat. Pieces return `space` = hexes taken now.
        - Shapes, around the piece's position (`x`/`y`) and the side it faces (`look`): 1 = the position; 2 = the
          position + the hex behind it; 3 = a line along the facing with the position in the middle; 7 = the position
          + its 6 neighbors; 10 = a line of 4 along the facing (the position is the 2nd from the front) + a line of 3 on
          each side. Placing, moving or turning needs the whole shape inside the grid and free; lying down never fails:
          the piece may overlap another one until it moves.

        ## 3D view
        - Every map can be seen in 3D in the web app (a button on the map): a real 3D scene built from the mask — blocks
          as tall as its tones, the map image on the floor and on the blocks' tops — with a camera behind the chosen
          character that turns and looks up and down. In free mode a player walks his character there: it climbs by
          itself a block up to about its waist (tones lighter than ~70% gray) and is stopped by anything taller, so a tall
          stage needs a staircase of tones. Otherwise the viewer only observes; pieces still move through the 2D map. The
          camera is in the app: tools change data, not the camera.
        - **`maskImage`** (from `upload_image`) is an image of the **same proportion as the map `image`** covering the same
          area. Its tone is the height: **black = a wall of full height, white = floor, a gray in between = a lower block**
          (50% gray = half the height; very light grays count as floor). Pieces in the 3D view stand on top of the block
          under them. A mask that is
          only black and white behaves exactly as before. It only affects the 3D view — never the 2D map or the pieces,
          which may stand on wall areas. Without it the 3D view has no walls.
        - **`backgroundImage`** is a 360° panorama shown behind the walls, like a sky; a narrow image repeats.
        - **`wallTextureImage`** is one picture (stone, brick, wood…) that covers **every wall** the mask draws, repeated
          along them and as tall as a full wall (a low wall shows its lower part). Without it the walls take the colors of
          the map image, as before. Only the 3D view uses it.
        - The floor goes on past the edge of the map image with the color of its nearest edge, and the speech balloons of
          the 3D view appear over the figures: the actor's action of the turn in progress always shows, and what it says in
          the chat (message, caption, roll) replaces it for 60 seconds from the send, then the action comes back.
        - Tokens may have four **"2.5D" images**, one per side of the standing character: **`frontImage`** (seen from the
          front), **`rightImage`** (in profile, looking to the RIGHT of the image), **`leftImage`** (in profile, looking
          to the LEFT of the image) and **`backImage`** (seen from behind). "Right" and "left" are the character's own
          sides. All four are the same 3:4 portrait over the same silhouette, and each one is optional.
        - The 3D view draws, for every standing piece, the image of the side the camera sees, compared with the direction
          the piece faces (`look`): its front within ±45° of that direction, its back within ±45° of the opposite one,
          the two sides in between. Where that image is missing it mirrors the opposite side (only sides mirror), then
          uses `frontImage`, then the standing `upImage`; the back is never mirrored.
        - A token may also carry a **3D model** (`modelFile`, a `.glb` stored with `upload_token_model`, up to 20 MB).
          The 3D view then draws the model instead of the 2.5D figure: standing on the piece's hex, as tall as the figure
          of a piece of that size, facing the piece's `look` (the model's +Z is its front), hidden by walls like a figure,
          with the same speech balloon. While it loads (or if it fails) the 2.5D figure shows. Animations: clips named
          like "idle"/"parado" and "walk"/"caminhar" in the file are used; when one is missing the model stands still —
          Roll6 has no animation of its own. That is the **automatic** choice; the token's `modelIdleClip` /
          `modelWalkClip` override it per state with `"none"`, `"clip:{name}"` (a clip of the file, by its exact name) or
          a library animation (below) — the web form lists the choices and previews each one.
        - A piece with a model that is **down or out of combat** lies in the 3D view (058): at the last frame of the
          token's `modelDownClip` — automatic = the file's clip named "death"/"die"/"dead"/"morte" — played once for
          whoever is watching when it falls; with no death (`"none"`, or no such clip) the model is laid on its back.
          Pieces without a model that are down stay out of the 3D view. Library animations play in full, so they may
          deform a rig that binds arms and legs to the hips (the web form warns).
        - A state may also play a **library animation** (059, see "Animations" below): `"animation:{id}"` in
          `modelIdleClip` / `modelWalkClip` / `modelDownClip`, for Mixamo skeletons.
        - The token's `modelScale` (063) sizes the model in the 3D view: percent of its automatic height (the 2.5D
          figure's silhouette for the piece's hexes), 25–400 in steps of 5, 100 by default. Feet stay on the floor and
          the balloon over the head; only the 3D view changes (hexes, movement and 2D images do not).
        - The token's `modelFront` (106) is for models **without a skeleton** (props, statues, vehicles) whose file does
          not face glTF's forward (+Z): 0 (+Z, default), 90 (+X), 180 (−Z) or 270 (−X). The 3D and isometric views turn
          the model so that side looks where the piece looks. Models without a skeleton carry no weapons.
        - In **free mode** a player walks his own character in the 3D view, in third person (camera locked behind it,
          zoom = distance). That walk is **local to his screen**: it never moves the piece, records nothing and no tool
          sees it — pieces still move only through `move_map_token`.
        - `update_map_model` and `update_token` replace every field: send `maskImage`, `backgroundImage`,
          `wallTextureImage`, the four "2.5D" images and `modelFile` back unchanged or they are removed.

        ## Animations
        - The **animation library** (059) holds animations anyone can use on a token with a Mixamo skeleton. Each one has
          a name, an owner, a **type** — 1 Parado (idle), 2 Andando (walk), 3 Correndo (run), 4 Agachado (crouch),
          5 Derrotado (defeated), 6 Atacando (attack), 7 Defendendo (defend) — and a file. For now each token state takes
          only its type: `modelIdleClip` ← 1, `modelWalkClip` ← 2, `modelDownClip` ← 5, as `"animation:{animationId}"`;
          the other types are stored for states to come. `create_animation` uploads, `list_animations` /
          `get_animation` / `get_animation_content` read, `update_animation` changes any of name, type and
          content in one call (send only what changes), `update_animation_content` replaces only the file and `delete_animation` removes (owner only; delete is refused with
          409 while a token uses it, and so is a retype away from the type of a state that uses it). Replacing the content
          keeps the id, so every token using `"animation:{id}"` plays the new version; the old file is gone for good.
        - The file is a JSON object in the **"roll6-animation" format, version 1**:
          `{ "format": "roll6-animation", "version": 1, "duration": 1, "loop": true, "tracks": [ { "bone": "RightArm",
          "times": [0, 0.5, 1], "degrees": [[0, 0, -150], [0, 0, -150], [0, 0, -150]] }, { "bone": "RightForeArm",
          "times": [0, 0.25, 0.5, 0.75, 1], "degrees": [[0, 0, 0], [0, 0, 30], [0, 0, 0], [0, 0, -30], [0, 0, 0]] } ],
          "hipsLift": { "times": [0, 0.5, 1], "values": [0, 0.003, 0] } }` (a wave of the right hand above the head).
          Optional `name`, `type` (the English names above) and `description` are only suggestions.
        - `duration` 0–30 s; `loop` true = a cycle (make the first key equal the last), false = played once and held on
          its last frame (deaths, attacks). 1–64 `tracks`, each bone once; `times` 1–600 numbers from 0, ascending, up
          to `duration`; one `[x, y, z]` per time, each within ±360. `hipsLift` (optional) moves the hips up/down: one
          value per time, a share of the model's height (`of: "height"`, default) or of the hips' own height above the
          lowest point (`of: "hips"`, for motions that end on the floor), each within ±2.
        - Bones (Mixamo names without "mixamorig:"): Hips, Spine, Spine1, Spine2, Neck, Head; Left/Right + Shoulder,
          Arm, ForeArm, Hand, UpLeg, Leg, Foot, ToeBase; Left/Right + HandThumb1–3, HandIndex1–3, HandMiddle1–3,
          HandRing1–3, HandPinky1–3. A bone the model lacks is skipped.
        - Turns are degrees about X, then Y, then Z **in the character's frame** (+X its left, +Y up, +Z forward), on top
          of the bone's rest pose; the upper arms first hang relaxed whatever T or A pose the rig rests in. +X takes a
          hanging limb **back** (a negative X raises an arm forward or a thigh forward); knees (`*Leg`) bend with
          positive X, elbows (`*ForeArm`) with negative X; +Y turns the front to the character's left; +Z raises the
          left side (`LeftArm` +Z lifts the left arm sideways, `RightArm` −Z the right one). Hips X −90 with hipsLift
          `of: "hips"` down to about −0.8 lies on the back.
        - Hands: the fingers start from the T pose (palm down), so a finger curls toward the palm with **−Z on the left
          hand and +Z on the right**. A left fist: Index/Middle/Ring/Pinky 1, 2, 3 = Z −70, −90, −60; Thumb1 [0, 45, −20],
          Thumb2 [0, 20, −30], Thumb3 [0, 0, −40]; the right fist changes the sign of Y and Z. Scale it: ~0.3 relaxed,
          ~0.85 gripping a handle, 1 a fist. Hold the hand on every key (the same triple) unless it opens or closes. Without
          finger tracks the hands stay open as in the rest pose.
        - Errors come back keyed: `content`, `content.format`, `content.version`, `content.duration`, `content.loop`,
          `content.tracks`, `content.tracks[i].bone|times|degrees`, `content.hipsLift.times|values|of`.

        - **Library thumbnails** (090): weapons and animations carry `thumbnailImage`/`thumbnailImageUrl`, the picture of
          their card in the app's library. The site renders it (the weapon in its standard pose, the animation as a
          standard skeleton figure in its strongest pose) when the item is saved or first listed by its owner, so an
          assistant normally leaves it out. A new file, a different pose or a new content clears it; the site draws it
          again.

        ## Weapons
        - The **weapon library** is shared like tokens and animations: create_weapon (a name + a .glb uploaded with
          upload_token_model, plus an optional gripPoint and pose), list_weapons, get_weapon; only the owner runs
          update_weapon (name, file, gripPoint and/or pose — same id, so every token carrying it shows the change) or
          delete_weapon (refused with 409 while any token carries it; the stored file is kept).
        - **Grip point and standard pose** live on the weapon (083). gripPoint = where the hand holds it, as fractions of
          the file's bounding box (0…1 per axis; omit = the middle). pose = the rotation, in **whole degrees** (Euler XYZ,
          −360…360, stored 0…359; the site has 90° buttons and 1° sliders), after which the model stands with its **tip along +Y** ("cima"), its
          **edge or attack side along +X** ("direita") and its **outer face along +Z** ("frente": a shield's face, the
          side away from the body). The file's origin and orientation do not matter. Whatever the file's unit, the
          weapon starts with its longest side at half the character's height.
        - A token with a 3D model carries weapons in **five fixed sockets**: weapons on create_token / update_token, a list
          of { socket, weaponId, grip? } — socket 1 right hand, 2 left hand (the grip point in the middle of the palm, the
          tip leaving the fist on the thumb side, the edge toward the knuckles, the face toward the back of the hand — the
          left hand mirrors the weapon across its flat plane to get there, so a shield faces outward in either hand),
          3 back (behind the torso, diagonal, handle above the right shoulder, running to the left hip), 4 right holster,
          5 left holster (beside the hips, tip down). The same weapon may be in several sockets (a sword in the hand and
          another copy on the back); the same socket only once. Without modelFile the list is dropped; update_token
          replaces the whole list, so a socket it does not get is emptied.
        - The 3D view finds each socket on the model's **Mixamo bones** (hands: RightHand / LeftHand and the finger bones
          for the orientation; back: Spine2; holsters: Hips), builds a frame with the same meaning on every model and
          aligns the weapon's grip point and pose to it, so it follows every animation, the lying pose and the model's
          size (modelScale). A socket whose bones are missing shows nothing (the binding stays saved); a hand without
          finger bones is approximate. Weapons never show in the 2D map or on the 2.5D figures, and they change no rule.
        - **grip** belongs to the token and the socket: scale = percent of the default size (10…400, steps of 5) — normally
          the only thing to adjust; x, y, z (fractions of the character's height, −0.5…0.5) and rx, ry, rz (degrees,
          −180…180, Euler XYZ) are the optional **fine adjustment** from the socket's own place, in the socket's frame
          (X = edge, Y = up, Z = face), for rigs that stray from the pattern. Omit it for the default (all 0, scale 100).
          Errors: `weapons[i].socket` (unknown or repeated), `weapons[i].weaponId`, `weapons[i].grip.scale`…
        - The 082 bindings (rightWeapon / leftWeapon) became sockets 1 and 2 with their size kept.

        ## Asking the master's Claude
        - "Perguntar" (093): `ask_question` posts a question in the chat that the campaign master's local Claude answers
          through his Roll6.Console with the skill `perguntar` of his campaign folder. Available only while the master's
          console is connected (`get_ask_status`); one waiting question per person; two minutes to answer, else the
          question shows as failed.
        - That Claude can only READ the master's folder: no writing, no commands, no network, no MCP tools, no secrets;
          the question is wrapped as untrusted player text. The answer (kind `answer`) replies to the question.
        - `private = true`: only the author and the master see the question and the answer. The master corrects an answer
          with `edit_answer` (shown "editada pelo mestre") or deletes it with `delete_chat_message`.

        ## GM mode
        - `set_campaign_gm_mode` (096): while on, the master's local Claude closes the turn by itself through his
          Roll6.Console with the skill `gm` of his campaign folder, whenever every approved character has a valid action
          in the current turn (nothing runs on a partial turn, outside the Active status or without the console; a
          turn that got ready while the console was away is processed when it connects). The skill reads the table
          (get_turn_data/get_turn_state), returns pieces that moved beyond their Deslocamento to the farthest legal
          point of their route, resolves the actions by the rules, records the master's repository and calls
          process_turn — without asking anybody; doubts go into the narration's last paragraph for the master.
        - The chat shows kind `gm` lines: "O GM começou a processar o turno N." when a run starts and, when a run ends
          with the turn still open (failed, stopped, 10 minutes, the skill missing), why; the master also gets a
          notice. `get_ask_status.gmRunningTurn` tells whether a run is going on; turning the mode off stops it and the
          turn stays open — the master then closes it with process_turn or finish_turn, or waits for the next action.
        - One run per campaign at a time; GM runs share the master's console queue with the chat questions.

        ## Chat
        - Each campaign has one **chat**, and it is the campaign's whole timeline: what the players and the master say
          (text, photo, audio), **every turn record** (moves, actions, action results, character/NPC changes,
          narrations) and a "Turno N finalizado" divider where each turn ended. The turn tools below read and write
          those same records, so `get_turn_summary` and `list_chat_messages` show the same turn.
        - `list_chat_messages` pages it (newest first page, `before`/`after` cursors); `send_chat_message` speaks as one
          of your approved characters or, without `characterId`, as the master (a message without a character is the
          master's voice, highlighted in the app); the master who also plays switches the voice of his own message,
          photo, recording or roll with `set_chat_speaker`; `delete_chat_message` removes a message
          (its author or the master) or a narration (the master). Conversation is not a turn record: it never shows in
          the turn summary, the turn data or the pending actions.
        - A character (or NPC occurrence) has **one valid action per turn**: acting again cancels the previous action, and
          resetting the turn or deleting the action cancels it too — it stays in the chat as "Ação cancelada" (`cancelled`)
          and leaves every turn read. `convert_chat_entry` turns a character's text into its action (or back);
          `react_to_chat_message` reacts to an entry (like / love / laugh = Curtir / Amei / Gargalhada); `replyToTurnId` on
          `send_chat_message`/`act_in_turn`/`create_chat_poll` quotes one.
        - `create_chat_poll` asks the table a question with 2–12 options (kind `poll`, like a WhatsApp poll). Each approved
          character votes once and the master has one vote as "Mestre"; `vote_chat_poll` puts, moves or withdraws that
          vote. Votes are public (`poll.options[].voters`) and notify nobody; a poll is conversation, never a turn record.
          To find polls use `list_chat_messages` with `kind = "poll"` (the latest one: `limit = 1`); `get_chat_message`
          re-reads one entry (a poll's current result) by its `turnId`. `kind` filters any kind (e.g. "action", "narration").
          A poll is **open** (`poll.open`) while some approved character has not voted — the master's vote doesn't count —
          and the app pins open polls below everything else in the chat (`list_chat_messages` returns them in `openPolls`,
          loaded or not). Each vote or withdrawal moves the poll to that moment in the chat order, so once everyone has
          voted it stays right after what was said before the last vote. Its author or the master deletes a poll with
          `delete_chat_message`. The master may **close** a poll (`close_chat_poll`, any status): no more votes (409), never
          open nor pinned again (`poll.closed`), only the result is shown; there is no reopening.
        - **Whispers**: `send_chat_message`, `roll_dice` and `act_in_turn` take `whisperCharacterIds` (approved characters,
          not your own) and/or `whisperMaster`. Only the author, the master (always) and the owners of those characters see
          it whole (`whisper.recipients`); everyone else doesn't get a whispered message at all, and gets a whispered action
          with the text "está sussurrando!" (`whisperHidden`) — in the chat, the turn state, the summary and the turn data.
          A whispered action still is the character's action of the turn.
        - `roll_dice` rolls **3d6** in the chat: the server draws the dice, the roll stays in the chat history for
          everyone (kind `roll`, `dice` = the three faces, `text` = the optional reason) and only the master can delete it.

        ## Notifications
        - Players and masters can turn on **notifications** on their phones/computers (Web Push, in the app only — there
          is no tool for that). Every notification goes to **every** device of each recipient, whatever is open on any
          screen (there is no in-app toast), with high priority, and is kept up to 12 hours for a device that is offline.
        - Who gets what: chat messages of others; the master every **action** that is not his own (characters, and ally
          NPCs acted by their commanders) with its text; once half of the approved characters acted, each **first**
          action of a character tells every player still missing "Falta apenas Bruno e você" (or "Falta só você") — in
          any mode, free mode included; "Turno N terminado. Pode agir novamente"; their character's PV/Fadiga changes made
          by someone else; and pokes. So `act_in_turn`, `finish_turn`, `process_turn` and changing PV/energy notify people.
        - `poke_players` pokes everyone whose character hasn't acted in the turn (a gray chat line + a notification; once
          every 30 minutes per person); with nobody else missing, a player's poke goes to the master. `list_notification_settings`
          / `set_campaign_notifications` read and mute campaigns.
        - Testing (master): `simulate_notification` sends any kind to your own devices as a test, and
          `preview_turn_notices` shows the "Falta…" each missing player would get now.

        ## Turns
        - A campaign is always in turn `N` (`get_turn_state`). Outside free mode (see "Free mode"), each character and
          each NPC occurrence can **move once** per turn (moving records a Movement entry) and has **one valid action**
          (`act_in_turn`, text — a new one cancels the previous). A character acts **with or without a piece**:
          `act_in_turn` takes its piece (`mapTokenId`) or, for a character not on any map, `campaignId` + `characterId`
          (balloons only show over pieces); NPC occurrences always act through their piece.
        - **"Agir sobre…"** (098): an action of a piece may be *about a hex* — `act_in_turn` with `targetX`/`targetY`
          (and optionally `targetMapTokenId`, the piece seen there). The server records, with the action, the hex, the
          distance in hexes from the actor's piece and a **snapshot** of the piece covering the hex as it was at that
          moment (kind character/npc/object, side self/ally/enemy/neutral/object — characters are allies to each other,
          NPCs by their campaign category —, name, posture, status, PV/Fadiga, facing); an empty hex records only the
          hex and the distance. It is never re-read: whoever processes the turn sees what the player aimed at even if
          the target moved or left. The chat, `get_turn_summary` and `get_turn_data.actions` end the line with
          "→ sobre …"; entries carry `target`. Resolve against the pointed piece (by `mapTokenId`/`mapNpcId`/
          `characterId`, not by name); a whispered action hides its target with its text.
        - **"Ação repetida"** (099): `set_repeated_action` gives a character or NPC occurrence a standing order that is
          recorded as its action at the start of every turn (`repeated: "turnStart"`) — and right away when it has not
          acted yet (`"declared"`). It stops when removed (empty description), when the actor declares another action, or
          when whoever processes the turn sends `clearRepeatedAction: true` in `process_turn` because its goal was met
          ("until the orc dies" and the orc died). `get_turn_data` shows each actor's `repeatedAction`; the summary
          marks "(ação repetida)". Automatic actions count as acted, but the GM mode only runs a turn with at least one
          declared action, so a fight never runs by itself.
        - `reset_turn` deletes a piece's entries of the current turn and moves it back if the former hex is free.
        - Every entry records who made it (`userId`/`userName`); moves record the movement points spent (`moved`); any
          change to a character's campaign values or an NPC occurrence is logged as a CharacterUpdate (type 4) with the
          fields before/after. `get_turn_summary` returns the whole turn as readable markdown (actions + positions).
        - Running a turn as an assistant: `get_turn_data` (characters, NPC occurrences and actions in one call) → decide →
          `process_turn` (all changes + narration in one atomic call; it also finishes the turn). Outside the GM mode,
          announce it first with `set_turn_processing` (`processing: true`, 101): the chat shows "O mestre começou a
          processar o turno N." and every footer "Processando o turno N…"; closing the turn ends it, and stopping without
          closing is `processing: false` with a short `reason`. It blocks nothing and expires after 30 minutes. Older story:
          `get_turn_history` (one item per narration, newest first, a few pages at a time). `get_turn_narration` returns only the
          narration of one turn, or of the latest finished turn that has one (204 / `{ ok: true }` when there is none).
        - `finish_turn` (master) moves to the next turn; without `force` it only lists the approved characters that
          have not acted yet. NPCs never block.
        - `create_turn_entry` / `delete_turn_entry` (master) write entries directly — the only way to record an
          ActionResult (turn type 3). `list_turn_entries` returns the entries of any turn (a summary).
        - Fixing the turn log (master): `update_turn_entry` corrects any entry of any turn (only the fields sent change;
          type, actor, author and date stay); `create_turn_entry` with `turnNo` logs past turns (1 up to the current
          one; all five types, including CharacterUpdate `changes` and Narration without an actor); `delete_turn_entry`
          removes one; `set_current_turn` sets the turn in progress (forward = like `finish_turn`; back refuses with
          409 while later turns have entries, unless `discardLaterEntries`). None of these move pieces or change
          characters/NPCs — use `process_turn`, `update_participation`, `update_map_npc` or the piece tools for that.

        ## Campaign plan
        - Secret notes of the master: several entries with title and markdown description (`list_campaign_plans`,
          `get_campaign_plan`, `create_campaign_plan`, `update_campaign_plan`, `delete_campaign_plan`). Players
          never see them.

        ## Images
        - `upload_image` sends a png/jpg/webp (base64, up to 10 MB) and returns a `fileName` (`{32 hex}.{ext}`).
          Store that file name in entities (`image`, `upImage`, …). Inside plan markdown reference it as
          `![caption](roll6-image:{fileName})`. Read responses contain temporary URLs — never store URLs.

        ## Lists
        - Paged lists take `page` (from 1), `pageSize` (1–100, default 20) and `search` (name contains), and return
          `items`, `page`, `pageSize` and `totalCount`.

        ## Errors
        - `400` validation (see `errors` per field), `403` not allowed for this user, `404` not found (or not
          visible), `409` conflict (occupied hex, already moved, in use, limits), `500` unexpected.

        ## Common flows
        - Start a table: `create_campaign` → `create_map_model` (grid) → `add_map_to_campaign` → `set_current_map`.
        - Bring a character: player `create_character` → `request_campaign_access`; master
          `approve_access_request` → `place_character_on_map`.
        - Add an enemy: `create_npc` (needs a token: `list_tokens`) → `add_npc_to_campaign` → `place_npc_on_map`.
        - Play a turn: `get_turn_state` → `move_map_token` / `act_in_turn` → master `finish_turn` →
          `list_turn_entries` for the summary.
        - **Destructive** tools (delete/remove/reset) cannot be undone: confirm with the user before calling them.
        """;
}
