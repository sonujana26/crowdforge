using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace CrowdForge.Editor {
    // Batch Play Mode checks exercise the actual C# runtime, without another test package.
    [InitializeOnLoad]
    public static class ForgeChecks {
        static ForgeChecks() { EditorApplication.update += ExecuteWhenPlaying; }
        public static void Run() {
            SessionState.SetBool("CrowdForge.checks", true);
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            new GameObject("CrowdForge checks").AddComponent<ArenaGame>();
            EditorApplication.EnterPlaymode();
        }
        static int assertions;
        static void Check(bool condition, string label) {
            if (!condition) throw new InvalidOperationException("CrowdForge check failed: " + label);
            assertions++;
        }
        static void ExecuteWhenPlaying() {
            if (!SessionState.GetBool("CrowdForge.checks", false) || !EditorApplication.isPlaying || EditorApplication.isCompiling) return;
            var game = UnityEngine.Object.FindAnyObjectByType<ArenaGame>();
            var bridge = UnityEngine.Object.FindAnyObjectByType<ForgeBridge>();
            if (!game || !bridge) return;
            int exit = 0;
            try {
                var packet = new Snapshot { protocol=1, sequence=1, roundId=Guid.NewGuid().ToString(), phase="IDLE", connected=true, health=1, intensity="medium", effects=Array.Empty<string>() };
                void Send() { packet.sequence++; bridge.ReceiveSnapshot(JsonUtility.ToJson(packet)); }
                void Advance(float seconds) { for(int n=0;n<seconds/.02f;n++){ if(n%10==0) Send(); game.Tick(.02f); } }
                Check(packet.Valid(), "valid server projection accepted");
                packet.effects=new[]{"execute_code"};Check(!packet.Valid(), "unknown mechanics rejected");
                packet.effects=new[]{"gravity_well","gravity_well"};Check(!packet.Valid(), "repeated mechanic rejected");
                packet.effects=Array.Empty<string>();packet.health=2;Check(!packet.Valid(), "invalid health rejected");packet.health=1;
                Send();Check(bridge.Connected, "validated snapshot connects");
                var stale=JsonUtility.FromJson<Snapshot>(JsonUtility.ToJson(packet));stale.sequence--;stale.phase="PAUSED";
                bridge.ReceiveSnapshot(JsonUtility.ToJson(stale));Check(bridge.State.phase=="IDLE", "stale packet cannot pause");
                game.Player.Damage(10);game.Player.Damage(10);Check(game.Player.Health==90, "damage immunity rejects immediate repeat");
                Advance(1);game.Player.Damage(10);Check(game.Player.Health==80, "damage allowed after immunity expires");
                packet.phase="PAUSED";Send();var clock=game.Clock;game.Tick(.03f);Check(game.Clock==clock, "server pause stops simulation");
                packet.phase="IDLE";Send();Check(game.Player.Health==100, "idle transition restores player");
                game.Spawn(0);var combatTarget=game.Enemies[0];combatTarget.transform.position=Vector3.zero;Physics.SyncTransforms();
                game.Fire(new Vector3(0,1,-2),Vector3.forward,true,25,28);Advance(.2f);
                Check(combatTarget.Health==20, "aimed projectile collides with enemy and deals damage");
                game.Fire(new Vector3(0,1,-2),Vector3.forward,true,25,28);Advance(.2f);
                Check(!combatTarget.Alive && game.Score==100, "primary attack defeats enemy and awards score");
                packet.roundId=Guid.NewGuid().ToString();Send();
                for(int i=0;i<100;i++)game.Spawn(i%5);Check(game.EnemyCount==32, "enemy pool remains bounded");
                foreach(var enemy in game.Enemies)Check(Vector3.Distance(enemy.transform.position,game.Player.transform.position)>10, "spawn outside immediate danger");
                packet.roundId=Guid.NewGuid().ToString();Send();Check(game.EnemyCount==0 && game.Player.Health==100, "new round clears enemies and restores health");
                game.Modifiers.Reset(new[]{"slippery_floor"});Check(game.Modifiers.Friction(Vector3.zero)<game.Modifiers.Friction(new Vector3(17,0,0)), "ice changes local friction");
                game.Modifiers.Reset(new[]{"gravity_well"});Check(game.Modifiers.Pull(new Vector3(-2,0,0)).x<0, "gravity pulls toward well");
                game.Modifiers.Reset(new[]{"mirror_decoys"});var direction=Vector3.right;
                Check(game.Modifiers.Reflect(new Vector3(6,0,0),new Vector3(8,0,0),ref direction)&&direction.x<0, "mirror reflects crossing projectile");
                game.Spawn(0);var target=game.Enemies[0];
                game.Modifiers.Reset(new[]{"slippery_floor"});game.Modifiers.Hit(target);Check(target.FrozenUntil>game.Clock, "ice freezes enemies on hit");
                game.Modifiers.Reset(new[]{"burning_zones"});game.Modifiers.Hit(target);Check(target.BurningUntil>game.Clock, "fire applies enemy burn");
                game.Spawn(1);var neighbor=game.Enemies[1];neighbor.transform.position=target.transform.position+Vector3.right;
                var health=neighbor.Health;game.Modifiers.Reset(new[]{"lightning_strikes"});game.Modifiers.Hit(target);
                Check(neighbor.Health<health, "storm chains damage to adjacent enemy");
                game.Modifiers.Reset(new[]{"echo_enemies"});var before=game.EnemyCount;Advance(2);game.Modifiers.Tick(.02f);
                Check(game.EnemyCount==before+3, "clones add bounded echo swarm");
                game.Modifiers.Reset(new[]{"slippery_floor","gravity_well"});Check(game.Modifiers.Friction(new Vector3(6,0,3))<14, "ice gravity combination expands slippery field");
                packet.roundId=Guid.NewGuid().ToString();Send();game.Spawn(5);var boss=game.Enemies[0];
                Check(boss.Boss && boss.Health>300, "boss uses distinct health and archetype");
                var armor=boss.Health;Advance(.1f);boss.Damage(10);Check(boss.Health>armor-10, "boss armor limits damage");
                Advance(3);boss.Tick(.02f);Check(boss.ExposedUntil>game.Clock, "boss attack opens vulnerability window");
                boss.Damage(10000);Check(!boss.Alive && game.Score==5000, "boss defeat awards score and returns to pool");
                Debug.Log($"CrowdForge C# checks passed: {assertions} assertions.");
                File.WriteAllText("../checks-result.json", $"{{\"passed\":true,\"assertions\":{assertions}}}");
            } catch(Exception error) {
                exit=1;Debug.LogException(error);File.WriteAllText("../checks-result.json", "{\"passed\":false}");
            } finally {
                SessionState.SetBool("CrowdForge.checks", false);
                EditorApplication.Exit(exit);
            }
        }
    }
}
