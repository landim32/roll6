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
          (campaign NPC) and places **occurrences** on maps (each occurrence has its own name, status and current
          life/energy, at most the NPC's totals; its piece shows them with the NPC's sheet).
        - **Map models**: the image + grid layout (a reusable map). A **campaign map** is a map model added to a
          campaign; its pieces live on the campaign map.

        ## Campaigns and participation
        - Campaigns are listed for everyone (`list_campaigns`, `mine=true` for your own). **Open** campaigns approve
          access requests immediately; closed ones wait for the master.
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
        - The campaign's **current map** (`set_current_map`, master) is the map all players follow in the app.
        - Every campaign and every campaign map has an immutable **slug** (built from the name, unique on the whole
          site; renaming does not change it). `get_campaign_by_slug` and `get_map_by_slug` open them.
          `list_my_table_campaigns` lists the campaigns where you are the master or have an approved character, each
          with the map the table is following.

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
        - Every map can be seen in 3D in the web app (a button on the map): a Wolfenstein 3D style view — walls drawn as
          vertical columns, the map image as the floor — with a camera behind the chosen character. The viewer only
          observes; pieces still move through the 2D map. The camera is in the app: tools change data, not the camera.
        - **`maskImage`** (from `upload_image`) is an image of the **same proportion as the map `image`** covering the same
          area. Its tone is the wall height: **black = a wall of full height, white = empty space, a gray in between = a
          lower wall** (50% gray = half the height, so one sees over it; very light grays count as empty). A mask that is
          only black and white behaves exactly as before. It only affects the 3D view — never the 2D map or the pieces,
          which may stand on wall areas. Without it the 3D view has no walls.
        - **`backgroundImage`** is a 360° panorama shown behind the walls, like a sky; a narrow image repeats.
        - **`wallTextureImage`** is one picture (stone, brick, wood…) that covers **every wall** the mask draws, repeated
          along them and as tall as a full wall (a low wall shows its lower part). Without it the walls take the colors of
          the map image, as before. Only the 3D view uses it.
        - The floor goes on past the edge of the map image with the color of its nearest edge, and the speech balloons of
          the turn in progress appear over the figures in the 3D view (they are the turn's action texts, not new data).
        - Tokens may have four **"2.5D" images**, one per side of the standing character: **`frontImage`** (seen from the
          front), **`rightImage`** (in profile, looking to the RIGHT of the image), **`leftImage`** (in profile, looking
          to the LEFT of the image) and **`backImage`** (seen from behind). "Right" and "left" are the character's own
          sides. All four are the same 3:4 portrait over the same silhouette, and each one is optional.
        - The 3D view draws, for every standing piece, the image of the side the camera sees, compared with the direction
          the piece faces (`look`): its front within ±45° of that direction, its back within ±45° of the opposite one,
          the two sides in between. Where that image is missing it mirrors the opposite side (only sides mirror), then
          uses `frontImage`, then the standing `upImage`; the back is never mirrored.
        - `update_map_model` and `update_token` replace every field: send `maskImage`, `backgroundImage`,
          `wallTextureImage` and the four "2.5D" images back unchanged or they are removed.

        ## Chat
        - Each campaign has one **chat**, and it is the campaign's whole timeline: what the players and the master say
          (text, photo, audio), **every turn record** (moves, actions, action results, character/NPC changes,
          narrations) and a "Turno N finalizado" divider where each turn ended. The turn tools below read and write
          those same records, so `get_turn_summary` and `list_chat_messages` show the same turn.
        - `list_chat_messages` pages it (newest first page, `before`/`after` cursors); `send_chat_message` speaks as one
          of your approved characters or, without `characterId`, as the master; `delete_chat_message` removes a message
          (its author or the master) or a narration (the master). Conversation is not a turn record: it never shows in
          the turn summary, the turn data or the pending actions.
        - `roll_dice` rolls **3d6** in the chat: the server draws the dice, the roll stays in the chat history for
          everyone (kind `roll`, `dice` = the three faces, `text` = the optional reason) and only the master can delete it.

        ## Turns
        - A campaign is always in turn `N` (`get_turn_state`). Each character and each NPC occurrence can **move
          once** per turn (moving records a Movement entry) and **act** any number of times (`act_in_turn`, text).
        - `reset_turn` deletes a piece's entries of the current turn and moves it back if the former hex is free.
        - Every entry records who made it (`userId`/`userName`); moves record the movement points spent (`moved`); any
          change to a character's campaign values or an NPC occurrence is logged as a CharacterUpdate (type 4) with the
          fields before/after. `get_turn_summary` returns the whole turn as readable markdown (actions + positions).
        - Running a turn as an assistant: `get_turn_data` (characters, NPC occurrences and actions in one call) → decide →
          `process_turn` (all changes + narration in one atomic call; it also finishes the turn). Older story:
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
