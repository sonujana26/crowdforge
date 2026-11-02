using System;
using System.Linq;
using System.Runtime.InteropServices;
using UnityEngine;

namespace CrowdForge {
    [Serializable] public class IngredientCount { public string ingredientId; public int count; public float percentage; }
    [Serializable] public class Snapshot {
        public int protocol, sequence, roundNumber, contributors, seconds;
        public string roundId, phase, title, intensity, outcome;
        public bool connected, demoMode, encounterActive;
        public float health;
        public string[] effects;
        public IngredientCount[] counts;
        public bool Valid() {
            string[] phases = { "IDLE", "CONTRIBUTION", "FORGING", "REVEAL", "ENCOUNTER", "RESULT", "PAUSED", "ERROR" };
            string[] allowed = { "slippery_floor", "gravity_well", "lightning_strikes", "mirror_decoys", "echo_enemies", "burning_zones" };
            return protocol == 1 && sequence > 0 && Guid.TryParse(roundId, out _) && phases.Contains(phase)
                && effects != null && effects.Length <= 2 && effects.Distinct().Count() == effects.Length
                && effects.All(allowed.Contains) && health >= 0 && health <= 1 && !float.IsNaN(health)
                && seconds >= 0 && seconds <= 60 && new[] { "low", "medium", "high" }.Contains(intensity);
        }
    }
    [Serializable] public class Telemetry { public string roundId; public float health; public int enemies; }
    [Serializable] public class TelemetryEvent { public string type = "telemetry"; public Telemetry payload; }
    [Serializable] public class Hud {
        public float health, dash, bossHealth;
        public int score, wave, bossPhase;
        public bool muted, bossExposed;
    }
    [Serializable] public class HudEvent { public string type = "hud"; public Hud payload; }
    public sealed class ForgeBridge : MonoBehaviour {
        public Snapshot State { get; private set; }
        public bool Connected => State != null && State.connected && Time.realtimeSinceStartup - received < 2;
        private float received, sent, hudSent;
        private ArenaGame game;
        #if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void CrowdForgeEvent(string json);
        #endif
        public void Initialize(ArenaGame arena) { game = arena; gameObject.name = "CrowdForgeBridge"; }
        private void Start() { Emit("{\"type\":\"ready\",\"protocol\":1}"); }
        public void SetMuted(string value) { if(value=="true"||value=="false")game.SetMuted(value=="true"); }
        public void SetQuality(string value) { if(!string.IsNullOrEmpty(value))game.SetQuality(value); }
        public void ReceiveSnapshot(string json) {
            if (string.IsNullOrEmpty(json) || json.Length > 8192) return;
            try {
                var next = JsonUtility.FromJson<Snapshot>(json);
                if (next == null || !next.Valid() || (State != null && next.sequence <= State.sequence)) return;
                bool reset = State == null || State.roundId != next.roundId ||
                    (next.encounterActive && !State.encounterActive) ||
                    (next.phase == "IDLE" && State.phase != "IDLE");
                State = next; received = Time.realtimeSinceStartup;
                if (reset) game.ResetRound(next);
            } catch (ArgumentException) { /* Drop malformed data; never interpret it as code. */ }
        }
        private void Update() {
            if(Time.realtimeSinceStartup-hudSent>=.15f){
                hudSent=Time.realtimeSinceStartup;
                var hud=new Hud{health=Mathf.Clamp01(game.Player.Health/100),score=Mathf.Clamp(game.Score,0,10000000),wave=Mathf.Clamp(game.Wave,0,100),dash=Mathf.Clamp(game.Player.DashRemaining,0,3),muted=game.Muted};
                foreach(var enemy in game.Enemies)if(enemy.Alive&&enemy.Boss){hud.bossHealth=Mathf.Clamp01(enemy.Health/enemy.MaxHealth);hud.bossPhase=enemy.Health<enemy.MaxHealth*.5f?2:1;hud.bossExposed=game.Clock<enemy.ExposedUntil;break;}
                Emit(JsonUtility.ToJson(new HudEvent{payload=hud}));
            }
            if (!Connected || State.phase != "ENCOUNTER" || Time.realtimeSinceStartup - sent < 2.1f) return;
            sent = Time.realtimeSinceStartup;
            Emit(JsonUtility.ToJson(new TelemetryEvent { payload = new Telemetry { roundId = State.roundId, health = Mathf.Clamp01(game.Player.Health / 100f), enemies = Mathf.Clamp(game.EnemyCount, 0, 40) } }));
        }
        private static void Emit(string json) {
            #if UNITY_WEBGL && !UNITY_EDITOR
            CrowdForgeEvent(json);
            #endif
        }
    }
}
