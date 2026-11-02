using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace CrowdForge {
    public sealed class ArenaGame : MonoBehaviour {
        public ForgePlayer Player { get; private set; }
        public ForgeModifiers Modifiers { get; private set; }
        public ForgeEffects Effects { get; private set; }
        public Camera Camera { get; private set; }
        public ForgeEnemy[] Enemies { get; private set; }
        public float Clock { get; private set; }
        public int Score;
        public float Shake;
        public int EnemyCount { get { int n = 0; foreach (var e in Enemies) if (e.Alive) n++; return n; } }

        sealed class Shot { public GameObject View; public MeshRenderer Renderer; public Vector3 Direction; public float Speed, Damage, End; public bool Active, Friendly, Reflected; }
        readonly Shot[] shots = new Shot[120];
        ForgeBridge bridge;
        float nextSpawn;
        int spawnIndex, wave;
        bool bossSpawned, muted = true;

        UniversalRenderPipelineAsset urpAsset;
        float frameTimeAccum;
        int frameCountAccum;
        float currentFps = 60f;
        float targetRenderScale = 1.0f;
        bool isIntegratedGpu;
        string qualityTier = "auto";

        public int Wave => wave;
        public bool Muted => muted;
        public float CurrentFps => currentFps;
        public float RenderScale => targetRenderScale;
        public void SetMuted(bool value) { muted = value; AudioListener.volume = muted ? 0 : .6f; }

        public void SetQuality(string tier) {
            qualityTier = (tier ?? "auto").ToLowerInvariant();
            if (!urpAsset) return;

            if (qualityTier == "high" || qualityTier == "ultra") {
                targetRenderScale = 1.0f;
                urpAsset.renderScale = 1.0f;
                QualitySettings.shadowDistance = 46f;
                Application.targetFrameRate = 60;
            } else if (qualityTier == "balanced") {
                targetRenderScale = 0.85f;
                urpAsset.renderScale = 0.85f;
                QualitySettings.shadowDistance = 38f;
                Application.targetFrameRate = 60;
            } else if (qualityTier == "performance") {
                targetRenderScale = 0.75f;
                urpAsset.renderScale = 0.75f;
                QualitySettings.shadowDistance = 30f;
                Application.targetFrameRate = 60;
            } else if (qualityTier == "battery" || qualityTier == "low30") {
                targetRenderScale = 0.75f;
                urpAsset.renderScale = 0.75f;
                QualitySettings.shadowDistance = 28f;
                Application.targetFrameRate = 30;
            } else {
                qualityTier = "auto";
            }
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Bootstrap() {
            if (UnityEngine.SceneManagement.SceneManager.GetActiveScene().name == "Arena" && !FindAnyObjectByType<ArenaGame>())
                new GameObject("CrowdForge runtime").AddComponent<ArenaGame>();
        }

        void Awake() {
            string gpu = (SystemInfo.graphicsDeviceName ?? "").ToLowerInvariant();
            isIntegratedGpu = gpu.Contains("radeon") || gpu.Contains("intel") || gpu.Contains("uhd") ||
                              gpu.Contains("iris") || gpu.Contains("vega") || gpu.Contains("apple") ||
                              SystemInfo.graphicsMemorySize < 2500;

            urpAsset = GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;
            if (!urpAsset) urpAsset = QualitySettings.renderPipeline as UniversalRenderPipelineAsset;

            QualitySettings.vSyncCount = 0;
            Application.targetFrameRate = 60;
            Application.runInBackground = true;

            QualitySettings.SetQualityLevel(1, true);
            QualitySettings.shadows = UnityEngine.ShadowQuality.All;
            QualitySettings.shadowResolution = UnityEngine.ShadowResolution.Medium;
            QualitySettings.shadowCascades = 2;
            QualitySettings.shadowDistance = isIntegratedGpu ? 38f : 44f;
            targetRenderScale = isIntegratedGpu ? 0.85f : 1.0f;
            if (urpAsset) urpAsset.renderScale = targetRenderScale;

            ForgeArt.Initialize();
            ForgeArt.BuildWorld();

            // Tactical 3/4 isometric camera framing matching the AFTER reference
            Camera = new GameObject("Arena camera").AddComponent<Camera>();
            Camera.gameObject.AddComponent<AudioListener>();
            Camera.transform.position = new Vector3(0, 24.5f, -24.0f);
            Camera.transform.rotation = Quaternion.Euler(46f, 0, 0);
            Camera.fieldOfView = 43f;
            Camera.clearFlags = CameraClearFlags.SolidColor;
            Camera.backgroundColor = new Color(0.42f, 0.60f, 0.76f);
            Camera.nearClipPlane = 0.1f;
            Camera.farClipPlane = 220f;
            Camera.GetUniversalAdditionalCameraData().renderPostProcessing = true;

            // Cinematic post-processing atmosphere (ACES tone, controlled bloom, contrast adjustments)
            var volume = new GameObject("Cinematic atmosphere").AddComponent<Volume>();
            volume.isGlobal = true;
            volume.profile = ScriptableObject.CreateInstance<VolumeProfile>();

            var bloom = volume.profile.Add<Bloom>();
            bloom.intensity.Override(0.38f);
            bloom.threshold.Override(1.25f);
            bloom.scatter.Override(0.65f);

            var tone = volume.profile.Add<Tonemapping>();
            tone.mode.Override(TonemappingMode.ACES);

            var colorAdj = volume.profile.Add<ColorAdjustments>();
            colorAdj.postExposure.Override(0.22f);
            colorAdj.contrast.Override(15f);
            colorAdj.saturation.Override(8f);

            var vignette = volume.profile.Add<Vignette>();
            vignette.intensity.Override(0.16f);
            vignette.smoothness.Override(0.35f);

            Player = new GameObject("Player").AddComponent<ForgePlayer>();
            Player.Initialize(this);

            Effects = new GameObject("Bounded feedback").AddComponent<ForgeEffects>();
            Effects.Initialize();

            Modifiers = new ForgeModifiers(this);
            Enemies = new ForgeEnemy[32];
            for (int n = 0; n < Enemies.Length; n++) {
                Enemies[n] = new GameObject("Pooled enemy").AddComponent<ForgeEnemy>();
                Enemies[n].Initialize(this);
                Enemies[n].gameObject.SetActive(false);
            }
            for (int n = 0; n < shots.Length; n++) {
                var p = ForgeArt.Part("Pooled projectile", PrimitiveType.Cube, null, Vector3.zero, new Vector3(.09f, .09f, .55f), ForgeArt.Cyan);
                shots[n] = new Shot { View = p, Renderer = p.GetComponent<MeshRenderer>() };
                shots[n].View.SetActive(false);
            }

            bridge = new GameObject("CrowdForgeBridge").AddComponent<ForgeBridge>();
            bridge.Initialize(this);
            Player.ResetPlayer(100);
            AudioListener.volume = 0;
        }

        public void ResetRound(Snapshot state) {
            Clock = 0;
            Score = 0;
            wave = 1;
            nextSpawn = 1;
            spawnIndex = 0;
            bossSpawned = false;
            Player.ResetPlayer(state.encounterActive ? state.health * 100 : 100);
            foreach (var e in Enemies) e.gameObject.SetActive(false);
            foreach (var s in shots) { s.Active = false; s.View.SetActive(false); }
            Modifiers.Reset(state.encounterActive ? state.effects : new string[0]);
        }

        public void Spawn(int kind, bool echo = false) {
            foreach (var e in Enemies) {
                if (!e.Alive) {
                    Vector3 pos = Vector3.zero;
                    for (int n = 0; n < 8; n++) {
                        int index = spawnIndex++ % 8;
                        float a = index * Mathf.PI / 4f;
                        pos = new Vector3(Mathf.Cos(a) * 16, .4f, Mathf.Sin(a) * 9);
                        if (Vector3.Distance(pos, Player.transform.position) > 10) break;
                    }
                    e.Spawn(kind, pos, echo);
                    return;
                }
            }
        }

        public void Fire(Vector3 origin, Vector3 direction, bool friendly, float damage, float speed) {
            foreach (var s in shots) {
                if (!s.Active) {
                    s.Active = true;
                    s.Friendly = friendly;
                    s.Reflected = false;
                    s.Direction = direction.normalized;
                    s.Speed = speed;
                    s.Damage = damage;
                    s.End = Clock + 3;
                    s.View.transform.position = origin;
                    s.View.transform.rotation = Quaternion.LookRotation(s.Direction);
                    s.Renderer.sharedMaterial = friendly ? ForgeArt.Cyan : ForgeArt.Amber;
                    s.View.SetActive(true);
                    return;
                }
            }
        }

        void Update() {
            UpdatePerformance();
            Tick(Time.deltaTime);
        }

        void UpdatePerformance() {
            frameTimeAccum += Time.unscaledDeltaTime;
            frameCountAccum++;

            if (frameTimeAccum >= 0.5f) {
                currentFps = frameCountAccum / frameTimeAccum;
                frameTimeAccum = 0f;
                frameCountAccum = 0;

                if (qualityTier == "auto" && urpAsset) {
                    if (currentFps < 48f && targetRenderScale > 0.72f) {
                        targetRenderScale = Mathf.Max(0.70f, targetRenderScale - 0.05f);
                        urpAsset.renderScale = targetRenderScale;
                        QualitySettings.shadowDistance = 32f;
                    } else if (currentFps > 57f && targetRenderScale < (isIntegratedGpu ? 0.90f : 1.0f)) {
                        targetRenderScale = Mathf.Min(1.0f, targetRenderScale + 0.05f);
                        urpAsset.renderScale = targetRenderScale;
                        QualitySettings.shadowDistance = isIntegratedGpu ? 38f : 44f;
                    }

                    if (currentFps < 32f && Application.targetFrameRate != 30) {
                        Application.targetFrameRate = 30;
                    } else if (currentFps > 45f && Application.targetFrameRate == 30) {
                        Application.targetFrameRate = 60;
                    }
                }
            }
        }

        public void Tick(float deltaTime) {
            if (ForgeInput.Pressed(KeyCode.M)) SetMuted(!muted);
            if (!bridge.Connected || bridge.State == null) return;
            var phase = bridge.State.phase;
            if (phase != "IDLE" && phase != "CONTRIBUTION" && phase != "ENCOUNTER") return;

            float dt = Mathf.Clamp(deltaTime, 0, .05f);
            Clock += dt;
            Effects.ClearWarning();

            if (Player.Health > 0) Player.Tick(dt);
            if (phase == "ENCOUNTER" && Player.Health > 0) {
                Modifiers.Tick(dt);
                wave = 1 + (int)(Clock / 7);
                if (Clock >= nextSpawn) {
                    nextSpawn = Clock + Mathf.Max(1.8f, 4.5f - wave * .4f);
                    Spawn(0);
                    Spawn(wave == 1 ? 1 : wave == 2 ? 2 : 4);
                    if (wave > 1) { Spawn(3); Spawn(3); }
                }
                if (Clock >= 6 && !bossSpawned) {
                    bossSpawned = true;
                    Spawn(5);
                    Effects.Tone(80, .2f);
                }
                foreach (var e in Enemies) if (e.Alive) e.Tick(dt);
            }
            TickShots(dt);

            // Responsive Adaptive Camera Framing:
            // Adjusts FOV based on aspect ratio so the arena is never cropped on narrower devices (mobile/tablet/laptop)
            float aspect = (float)Screen.width / Mathf.Max(1, Screen.height);
            float baseFov = 42f;
            float baseAspect = 16f / 9f;
            if (aspect < baseAspect) {
                float targetHalfWidth = Mathf.Tan(baseFov * Mathf.Deg2Rad * 0.5f) * baseAspect;
                float adaptedFov = 2f * Mathf.Atan(targetHalfWidth / Mathf.Max(0.5f, aspect)) * Mathf.Rad2Deg;
                Camera.fieldOfView = Mathf.Lerp(Camera.fieldOfView, Mathf.Clamp(adaptedFov, 38f, 66f), dt * 6f);
            } else {
                Camera.fieldOfView = Mathf.Lerp(Camera.fieldOfView, baseFov, dt * 6f);
            }

            // Smooth gentle camera follow centered on combat arena
            var follow = Player.transform.position;
            var goal = new Vector3(follow.x * 0.08f, 24.5f, -24.0f + follow.z * 0.08f);
            Camera.transform.position = Vector3.Lerp(Camera.transform.position, goal, dt * 4f);

            if (Shake > 0) {
                Shake -= dt;
                Camera.transform.position += Random.insideUnitSphere * 0.06f;
            }
        }

        void TickShots(float dt) {
            foreach (var s in shots) {
                if (!s.Active) continue;
                var old = s.View.transform.position;
                s.Direction = (s.Direction + Modifiers.Pull(old) * dt * .4f).normalized;
                var next = old + s.Direction * s.Speed * dt;

                if (!s.Reflected && Modifiers.Reflect(old, next, ref s.Direction)) {
                    s.Reflected = true;
                    s.Friendly = true;
                    next = old + s.Direction * s.Speed * dt;
                }
                bool end = Clock >= s.End || Mathf.Abs(next.x) > 19 || Mathf.Abs(next.z) > 12;
                if (!end && Physics.Raycast(old, (next - old).normalized, out var hit, Vector3.Distance(old, next))) {
                    if (s.Friendly) {
                        if (hit.collider.TryGetComponent<ForgeEnemy>(out var enemy) && enemy.Alive) {
                            enemy.Damage(s.Damage);
                            Modifiers.Hit(enemy);
                            end = true;
                        } else if (!hit.collider.TryGetComponent<ForgePlayer>(out _)) {
                            end = true;
                        }
                    } else {
                        if (hit.collider.TryGetComponent<ForgePlayer>(out var player)) {
                            player.Damage(s.Damage);
                            end = true;
                        } else if (!hit.collider.TryGetComponent<ForgeEnemy>(out _)) {
                            end = true;
                        }
                    }
                }
                s.View.transform.position = next;
                s.View.transform.rotation = Quaternion.LookRotation(s.Direction);
                if (end) {
                    s.Active = false;
                    s.View.SetActive(false);
                }
            }
        }

        #if UNITY_EDITOR
        void OnGUI() {
            GUI.color = Color.white;
            GUI.Box(new Rect(16, 16, 330, 90), "");
            GUI.Label(new Rect(30, 25, 310, 25), $"HEALTH {Mathf.CeilToInt(Player.Health)}%     SCORE {Score}     WAVE {wave}");
            GUI.Label(new Rect(30, 52, 310, 25), $"DASH {(Player.DashRemaining > 0 ? Player.DashRemaining.ToString("0.0") + "s" : "READY")}   M — {(muted ? "ENABLE SOUND" : "MUTE")}");
            GUI.Label(new Rect(30, 80, 380, 25), "EDITOR PREVIEW — server :4000 / no survival reporting");

            if (!bridge.Connected) GUI.Box(new Rect(Screen.width / 2 - 180, Screen.height / 2 - 35, 360, 70), "Waiting for live browser bridge\nGameplay suspended");
            else if (bridge.State.phase == "PAUSED" || Player.Health <= 0) GUI.Box(new Rect(Screen.width / 2 - 150, Screen.height / 2 - 35, 300, 70), Player.Health <= 0 ? "DEFEAT\nStart a new round to redeploy" : "PAUSED");
            else if (bridge.State.phase == "RESULT") GUI.Box(new Rect(Screen.width / 2 - 180, Screen.height / 2 - 35, 360, 70), bridge.State.outcome == "victory" ? "VICTORY — ENCOUNTER SURVIVED" : bridge.State.outcome == "defeat" ? "DEFEAT" : "ENCOUNTER COMPLETE — NO REPORTED RESULT");

            if (bridge.State != null && bridge.State.demoMode) GUI.Label(new Rect(20, Screen.height - 35, 400, 25), "DEMO MODE — simulated contributions");

            foreach (var e in Enemies) {
                if (e.Alive && e.Boss) {
                    GUI.Box(new Rect(Screen.width / 2 - 230, 130, 460, 60), $"WARDEN / {(e.Health < e.MaxHealth * .5f ? "PHASE 2" : "PHASE 1")} / {(Clock < e.ExposedUntil ? "CORE EXPOSED" : "ARMORED")}");
                    GUI.color = Color.red;
                    GUI.DrawTexture(new Rect(Screen.width / 2 - 215, 170, 430 * Mathf.Clamp01(e.Health / e.MaxHealth), 7), Texture2D.whiteTexture);
                    GUI.color = Color.white;
                }
            }
        }
        #endif
    }
}
