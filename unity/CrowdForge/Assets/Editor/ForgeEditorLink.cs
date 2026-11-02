using System;
using System.Net.Http;
using UnityEditor;
using UnityEngine;

namespace CrowdForge.Editor {
    // Editor rehearsal is read-only. Creator actions and results stay in the authenticated browser.
    [InitializeOnLoad]
    public static class ForgeEditorLink {
        [Serializable] class Recipe { public string title, intensity; public string[] effectIds; }
        [Serializable] class Summary { public float playerHealthRatio; public string[] activeEffectIds; }
        [Serializable] class PublicState {
            public string roundId, phase; public int roundNumber, distinctContributors;
            public long phaseEndsAt, remainingMs, serverNow; public bool demoMode;
            public Recipe recipe; public Summary gameSummary; public IngredientCount[] counts;
        }
        static readonly HttpClient client = new HttpClient { Timeout = TimeSpan.FromSeconds(2), MaxResponseContentBufferSize = 65536 };
        static double next; static bool pending; static int sequence; static ForgeBridge previous;
        static ForgeEditorLink() { EditorApplication.update += Poll; }
        static async void Poll() {
            if (!EditorApplication.isPlaying || EditorApplication.isCompiling || pending ||
                SessionState.GetBool("CrowdForge.checks", false) || EditorApplication.timeSinceStartup < next) return;
            next = EditorApplication.timeSinceStartup + .5;
            var bridge = UnityEngine.Object.FindAnyObjectByType<ForgeBridge>();
            if (!bridge) return;
            if (previous != bridge) { previous = bridge; sequence = 0; }
            pending = true;
            try {
                // Fixed loopback destination; no tokens, cookies or credential files are read.
                var json = await client.GetStringAsync("http://localhost:4000/api/game/state");
                if (!EditorApplication.isPlaying || !bridge) return;
                var state = JsonUtility.FromJson<PublicState>(json);
                if (state?.gameSummary == null) return;
                var packet = new Snapshot {
                    protocol = 1, sequence = ++sequence, roundId = state.roundId, phase = state.phase,
                    roundNumber = state.roundNumber, connected = true, demoMode = state.demoMode,
                    encounterActive = state.phase == "ENCOUNTER" || (state.phase == "PAUSED" && state.gameSummary.activeEffectIds?.Length > 0),
                    seconds = Mathf.Clamp((int)Math.Ceiling((state.phase == "PAUSED" ? state.remainingMs : state.phaseEndsAt - state.serverNow) / 1000d), 0, 60),
                    health = state.gameSummary.playerHealthRatio, contributors = state.distinctContributors,
                    title = state.recipe?.title ?? "The next challenge is yours.", intensity = state.recipe?.intensity ?? "medium",
                    effects = state.recipe?.effectIds ?? Array.Empty<string>(), counts = state.counts, outcome = "unreported"
                };
                bridge.ReceiveSnapshot(JsonUtility.ToJson(packet));
            } catch (Exception error) when (error is HttpRequestException || error is System.Threading.Tasks.TaskCanceledException || error is ArgumentException) {
                // Heartbeat expiry visibly suspends play. Do not fabricate a connection or round.
            } finally { pending = false; }
        }
    }
}
