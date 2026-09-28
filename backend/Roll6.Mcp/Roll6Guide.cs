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
          values, pieces and turn entries stay exactly as they were.
        - **NPCs**: belong to a master's library (require a token). The master adds his own NPCs to a campaign
          (campaign NPC) and places **occurrences** on maps (each occurrence has its own name/life/energy/status).
        - **Map models**: the image + grid layout (a reusable map). A **campaign map** is a map model added to a
          campaign; its pieces live on the campaign map.

        ## Campaigns and participation
        - Campaigns are listed for everyone (`list_campaigns`, `mine=true` for your own). **Open** campaigns approve
          access requests immediately; closed ones wait for the master.
        - Participation status: `1 Invited`, `2 RequestedAccess`, `3 Approved`, `4 Denied`.
          Player: `request_campaign_access`, `accept_invite`, `decline_invite`. Master: `invite_character`,
          `approve_access_request`, `deny_access_request`, `remove_participation`.
        - Each participation holds the campaign values of the character: current life/energy (may go to 0 or below =
          fallen), a free-text status and a campaign copy of the sheet (`update_participation`, by the owner or the
          master).
        - The campaign's **current map** (`set_current_map`, master) is the map all players follow in the app.

        ## Hex grid (maps)
        - Flat-top hexagons in a rectangle of `gridWidth` columns × `gridHeight` rows; odd columns are shifted half a
          hex down ("odd-q" layout).
        - Positions are **`x` = column** and **`y` = row**, both 0-based, inside the grid. One piece per hex.
        - **`look`** = the side a piece faces, **0–5 clockwise starting at the top**: 0 up, 1 up-right, 2 down-right,
          3 down, 4 down-left, 5 up-left.
        - Movement cost (enforced for players): 1 for each step into the hex ahead, 1 for each 60° turn; the shortest
          path goes around other pieces; the total must fit the character's `move`. The master moves anything freely.

        ## Pieces (map tokens)
        - Types: `1 Character` (a campaign participation, blue), `2 Npc` (an NPC occurrence, red), `4 Object`
          (anything else, gray).
        - Master: `add_object_to_map`, `place_character_on_map` (a participation; each character once per map),
          `place_npc_on_map` (creates the occurrence and its piece), `change_map_token_image`, `update_map_token`,
          `delete_map_token`. Everyone at the table: `list_map_tokens`, `list_map_npcs`.
        - `move_map_token` moves and turns a piece (master: any piece; player: his own approved character).

        ## Turns
        - A campaign is always in turn `N` (`get_turn_state`). Each character and each NPC occurrence can **move
          once** per turn (moving records a Movement entry) and **act** any number of times (`act_in_turn`, text).
        - `reset_turn` deletes a piece's entries of the current turn and moves it back if the former hex is free.
        - `finish_turn` (master) moves to the next turn; without `force` it only lists the approved characters that
          have not acted yet. NPCs never block.
        - `create_turn_entry` / `delete_turn_entry` (master) write entries directly — the only way to record an
          ActionResult (turn type 3). `list_turn_entries` returns the entries of any turn (a summary).

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
