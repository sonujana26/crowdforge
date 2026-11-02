using UnityEngine;

namespace CrowdForge {
    public static class ForgeCharacters {
        public static Transform Build(Transform owner, int kind) {
            bool isPlayer = kind < 0;
            bool isBoss = kind == 5;
            var root = new GameObject(isPlayer ? "Vanguard // player marine" : isBoss ? "Warden // colossus war mech" : "Combat Mech // autonomous droid").transform;
            root.SetParent(owner, false);

            GameObject P(string name, Vector3 pos, Vector3 size, Material mat, PrimitiveType shape = PrimitiveType.Cube, Transform parent = null) {
                return ForgeArt.Part(name, shape, parent ? parent : root, pos, size, mat);
            }

            var rig = root.gameObject.AddComponent<ForgeRig>();

            if (isPlayer) {
                // ==================== PLAYER CHARACTER ====================
                // Tactical white ceramic & navy blue vanguard commando
                var armor = ForgeArt.White;
                var undersuit = ForgeArt.Navy;
                var glow = ForgeArt.Cyan;

                // Torso & Armor Vest
                P("Undersuit torso", new Vector3(0, 1.1f, 0), new Vector3(.68f, .75f, .42f), undersuit);
                P("Chest armor plate", new Vector3(0, 1.22f, .08f), new Vector3(.72f, .55f, .38f), armor);
                P("Abdominal plating", new Vector3(0, .88f, .06f), new Vector3(.58f, .32f, .35f), undersuit);
                P("Tactical utility belt", new Vector3(0, .72f, 0), new Vector3(.66f, .16f, .44f), ForgeArt.Dark);

                // Cyan Chest Reactor
                P("Reactor housing", new Vector3(0, 1.25f, .26f), new Vector3(.32f, .32f, .12f), ForgeArt.Dark, PrimitiveType.Sphere);
                P("Chest power node", new Vector3(0, 1.25f, .32f), new Vector3(.20f, .20f, .06f), glow, PrimitiveType.Sphere);

                // Collar & Helmet
                P("Armor collar", new Vector3(0, 1.54f, 0), new Vector3(.64f, .16f, .48f), armor);
                P("Combat helmet", new Vector3(0, 1.82f, 0), new Vector3(.46f, .48f, .46f), armor);
                P("Helmet crest", new Vector3(0, 2.06f, 0), new Vector3(.12f, .08f, .40f), undersuit);
                P("Visor inset", new Vector3(0, 1.83f, .22f), new Vector3(.40f, .16f, .08f), ForgeArt.Dark);
                P("Glowing visor slit", new Vector3(0, 1.84f, .26f), new Vector3(.36f, .075f, .03f), glow);
                P("Comms module", new Vector3(.24f, 1.82f, -.05f), new Vector3(.08f, .18f, .12f), ForgeArt.Dark);
                P("Comms antenna", new Vector3(.24f, 2.05f, -.05f), new Vector3(.025f, .36f, .025f), ForgeArt.Trim);

                // Articulated Legs
                for (int side = -1; side <= 1; side += 2) {
                    var leg = new GameObject(side < 0 ? "Left Leg" : "Right Leg").transform;
                    leg.SetParent(root, false);
                    leg.localPosition = new Vector3(side * .24f, .72f, 0);

                    P("Thigh armor", new Vector3(0, -.18f, 0), new Vector3(.28f, .38f, .32f), armor, parent: leg);
                    P("Knee guard", new Vector3(0, -.36f, .07f), new Vector3(.26f, .18f, .28f), ForgeArt.Dark, parent: leg);
                    P("Shin greave", new Vector3(0, -.52f, .02f), new Vector3(.26f, .32f, .28f), armor, parent: leg);
                    P("Combat boot", new Vector3(0, -.66f, .10f), new Vector3(.30f, .16f, .52f), ForgeArt.Dark, parent: leg);

                    if (side < 0) rig.LeftLeg = leg; else rig.RightLeg = leg;
                }

                // Articulated Arms & Two-Handed Assault Carbine
                for (int side = -1; side <= 1; side += 2) {
                    var arm = new GameObject(side < 0 ? "Left Arm" : "Right Arm").transform;
                    arm.SetParent(root, false);
                    arm.localPosition = new Vector3(side * .54f, 1.44f, 0);

                    var pauldron = P("Pauldron", Vector3.zero, new Vector3(.44f, .38f, .52f), armor, parent: arm);
                    pauldron.transform.Rotate(0, 0, side * -12);
                    P("Pauldron trim", new Vector3(0, .19f, 0), new Vector3(.30f, .06f, .38f), undersuit, parent: arm);
                    P("Bicep", new Vector3(0, -.28f, 0), new Vector3(.20f, .28f, .22f), undersuit, parent: arm);
                    P("Forearm plate", new Vector3(0, -.44f, .12f), new Vector3(.28f, .28f, .38f), armor, parent: arm);

                    if (side > 0) {
                        // Right arm holds futuristic plasma carbine / rifle pointing forward
                        var gun = new GameObject("Plasma carbine").transform;
                        gun.SetParent(arm, false);
                        gun.localPosition = new Vector3(-.18f, -.44f, .48f);

                        P("Rifle body", Vector3.zero, new Vector3(.18f, .22f, .85f), ForgeArt.Dark, parent: gun);
                        P("Rifle shroud", new Vector3(0, .06f, 0), new Vector3(.22f, .14f, .60f), armor, parent: gun);
                        P("Barrel", new Vector3(0, 0, .58f), new Vector3(.10f, .10f, .45f), ForgeArt.Trim, parent: gun);
                        P("Plasma muzzle", new Vector3(0, 0, .82f), new Vector3(.14f, .14f, .08f), glow, parent: gun);
                        P("Energy cell", new Vector3(0, -.16f, .05f), new Vector3(.12f, .24f, .20f), glow, parent: gun);
                    } else {
                        // Left arm supports weapon forearm grip
                        P("Tactical glove", new Vector3(0, -.58f, .22f), new Vector3(.22f, .18f, .26f), ForgeArt.Dark, parent: arm);
                    }

                    if (side < 0) rig.LeftArm = arm; else rig.RightArm = arm;
                }
                root.localScale = Vector3.one * 1.25f;

            } else if (isBoss) {
                // ==================== BOSS (THE WARDEN) ====================
                // Massive war colossus with heavy bronze & steel armor and giant orange chest core
                var steel = ForgeArt.Steel;
                var dark = ForgeArt.Dark;
                var bronze = ForgeArt.Bronze;
                var glow = ForgeArt.Amber;

                // Heavy rounded torso chassis
                P("Chassis core", new Vector3(0, 1.35f, 0), new Vector3(1.4f, 1.2f, .95f), dark);
                P("Chest armor plate", new Vector3(0, 1.48f, .22f), new Vector3(1.5f, .95f, .75f), steel);
                P("Collar plating", new Vector3(0, 1.95f, 0), new Vector3(1.3f, .30f, .90f), bronze);
                P("Waist hydraulics", new Vector3(0, .75f, 0), new Vector3(.85f, .45f, .65f), dark);

                // Giant Glowing Orange/Red Reactor Core in Chest
                P("Reactor housing ring", new Vector3(0, 1.42f, .55f), new Vector3(.76f, .76f, .22f), dark, PrimitiveType.Sphere);
                P("Outer core bezel", new Vector3(0, 1.42f, .62f), new Vector3(.62f, .62f, .16f), bronze, PrimitiveType.Sphere);
                var core = P("Fiery plasma core", new Vector3(0, 1.42f, .68f), new Vector3(.46f, .46f, .12f), glow, PrimitiveType.Sphere);
                P("Core inner focus", new Vector3(0, 1.42f, .73f), new Vector3(.26f, .26f, .08f), ForgeArt.White, PrimitiveType.Sphere);

                // Containment clamps locking around chest core
                for (int n = 0; n < 8; n++) {
                    float a = n * Mathf.PI / 4f;
                    var clamp = P("Core clamp", new Vector3(Mathf.Cos(a) * .38f, 1.42f + Mathf.Sin(a) * .38f, .64f), new Vector3(.10f, .16f, .18f), bronze);
                    clamp.transform.Rotate(0, 0, -n * 45f);
                }

                // Dedicated warm orange point light on boss chest
                var bossLight = new GameObject("Boss core glow").AddComponent<Light>();
                bossLight.transform.SetParent(root, false);
                bossLight.transform.localPosition = new Vector3(0, 1.42f, .95f);
                bossLight.type = LightType.Point;
                bossLight.color = new Color(1f, .38f, .05f);
                bossLight.range = 8f;
                bossLight.intensity = 4.5f;

                // Heavy armored turret head with glowing red eye visor
                P("Armored head dome", new Vector3(0, 2.12f, .12f), new Vector3(.82f, .55f, .72f), steel);
                P("Head brow shield", new Vector3(0, 2.28f, .22f), new Vector3(.72f, .18f, .48f), bronze);
                P("Visor recess", new Vector3(0, 2.12f, .46f), new Vector3(.58f, .20f, .14f), dark);
                P("Glowing optic eye", new Vector3(0, 2.12f, .52f), new Vector3(.44f, .12f, .06f), ForgeArt.Red);
                P("Armor crown", new Vector3(0, 2.40f, .05f), new Vector3(.95f, .20f, .65f), bronze);

                // Heavy Digitigrade Stomper Legs
                for (int side = -1; side <= 1; side += 2) {
                    var leg = new GameObject(side < 0 ? "Boss Left Leg" : "Boss Right Leg").transform;
                    leg.SetParent(root, false);
                    leg.localPosition = new Vector3(side * .62f, .85f, 0);

                    P("Hip actuator", new Vector3(0, 0, 0), new Vector3(.48f, .42f, .52f), bronze, parent: leg);
                    P("Thigh armor", new Vector3(0, -.28f, -.04f), new Vector3(.52f, .58f, .58f), steel, parent: leg);
                    P("Knee servo", new Vector3(0, -.60f, .16f), new Vector3(.48f, .36f, .48f), dark, parent: leg);
                    P("Knee plate", new Vector3(0, -.60f, .38f), new Vector3(.44f, .32f, .18f), bronze, parent: leg);
                    P("Shin greave", new Vector3(0, -.88f, .06f), new Vector3(.48f, .52f, .52f), steel, parent: leg);
                    P("Stomper foot", new Vector3(0, -1.14f, .22f), new Vector3(.62f, .24f, .88f), dark, parent: leg);
                    P("Foot stabilizer", new Vector3(0, -1.12f, -.18f), new Vector3(.54f, .20f, .34f), bronze, parent: leg);

                    if (side < 0) rig.LeftLeg = leg; else rig.RightLeg = leg;
                }

                // Massive Hydraulic Arms & Crushing Fists
                for (int side = -1; side <= 1; side += 2) {
                    var arm = new GameObject(side < 0 ? "Boss Left Arm" : "Boss Right Arm").transform;
                    arm.SetParent(root, false);
                    arm.localPosition = new Vector3(side * 1.05f, 1.75f, 0);

                    var pauldron = P("Massive pauldron", Vector3.zero, new Vector3(.85f, .70f, .95f), steel, parent: arm);
                    pauldron.transform.Rotate(0, 0, side * -16f);
                    P("Pauldron shield plate", new Vector3(side * .22f, .18f, 0), new Vector3(.55f, .45f, .85f), bronze, parent: arm);
                    P("Pauldron hazard stripe", new Vector3(side * .24f, .36f, 0), new Vector3(.45f, .08f, .60f), glow, parent: arm);
                    P("Shoulder bolt", new Vector3(side * .38f, 0, 0), new Vector3(.18f, .22f, .22f), ForgeArt.Trim, parent: arm);

                    P("Bicep piston", new Vector3(0, -.48f, 0), new Vector3(.38f, .48f, .42f), dark, parent: arm);
                    P("Elbow joint", new Vector3(0, -.72f, -.08f), new Vector3(.36f, .28f, .36f), bronze, parent: arm);
                    P("Forearm chassis", new Vector3(0, -.98f, .18f), new Vector3(.52f, .52f, .68f), steel, parent: arm);

                    // Massive crushing fist knuckles
                    P("Fist gauntlet", new Vector3(0, -1.25f, .32f), new Vector3(.56f, .32f, .56f), dark, parent: arm);
                    for (int f = 0; f < 3; f++) {
                        P("Crusher knuckle", new Vector3(-.18f + f * .18f, -1.40f, .46f), new Vector3(.14f, .38f, .18f), bronze, parent: arm);
                    }

                    if (side < 0) rig.LeftArm = arm; else rig.RightArm = arm;
                }
                root.localScale = new Vector3(2.55f, 2.2f, 2.35f);

            } else {
                // ==================== REGULAR ENEMY ROBOTS ====================
                // Heavy bipedal combat mechs with rounded chassis and central glowing red eye!
                var steel = ForgeArt.Steel;
                var dark = ForgeArt.Dark;
                var bronze = ForgeArt.Bronze;
                var eyeGlow = kind == 3 ? ForgeArt.Green : kind == 1 || kind == 4 ? ForgeArt.Violet : ForgeArt.Red;
                var accentGlow = kind == 2 ? ForgeArt.Amber : eyeGlow;

                // Hunched armored torso
                P("Torso chassis", new Vector3(0, 1.15f, 0), new Vector3(.78f, .78f, .52f), dark);
                P("Chest armor plate", new Vector3(0, 1.22f, .18f), new Vector3(.82f, .58f, .38f), steel);
                P("Chest bronze accent", new Vector3(0, 1.05f, .24f), new Vector3(.65f, .24f, .28f), bronze);
                P("Waist servo", new Vector3(0, .68f, 0), new Vector3(.46f, .22f, .36f), dark);

                // Small chest vent glow
                P("Torso heat vent", new Vector3(0, 1.25f, .32f), new Vector3(.24f, .18f, .08f), accentGlow, PrimitiveType.Sphere);

                // Rounded armored dome head with prominent central glowing red eye!
                P("Armored head dome", new Vector3(0, 1.76f, .04f), new Vector3(.56f, .48f, .52f), steel, PrimitiveType.Sphere);
                P("Head cowl", new Vector3(0, 1.88f, .06f), new Vector3(.54f, .24f, .44f), bronze);
                P("Eye socket", new Vector3(0, 1.74f, .26f), new Vector3(.34f, .22f, .12f), dark);
                // Prominent glowing circular red eye in center of head!
                P("Glowing eye optic", new Vector3(0, 1.74f, .32f), new Vector3(.24f, .14f, .06f), eyeGlow, PrimitiveType.Sphere);

                // Articulated Legs
                for (int side = -1; side <= 1; side += 2) {
                    var leg = new GameObject(side < 0 ? "Mech Left Leg" : "Mech Right Leg").transform;
                    leg.SetParent(root, false);
                    leg.localPosition = new Vector3(side * .28f, .70f, 0);

                    P("Thigh armor", new Vector3(0, -.18f, 0), new Vector3(.30f, .38f, .34f), steel, parent: leg);
                    P("Knee servo", new Vector3(0, -.36f, .08f), new Vector3(.28f, .20f, .30f), dark, parent: leg);
                    P("Shin plate", new Vector3(0, -.52f, .04f), new Vector3(.28f, .32f, .30f), bronze, parent: leg);
                    P("Combat boot", new Vector3(0, -.66f, .12f), new Vector3(.34f, .16f, .54f), dark, parent: leg);

                    if (side < 0) rig.LeftLeg = leg; else rig.RightLeg = leg;
                }

                // Articulated Arms & Weapons
                for (int side = -1; side <= 1; side += 2) {
                    var arm = new GameObject(side < 0 ? "Mech Left Arm" : "Mech Right Arm").transform;
                    arm.SetParent(root, false);
                    arm.localPosition = new Vector3(side * .56f, 1.42f, 0);

                    var pauldron = P("Pauldron", Vector3.zero, new Vector3(.46f, .40f, .56f), steel, parent: arm);
                    pauldron.transform.Rotate(0, 0, side * -12);
                    P("Pauldron bronze trim", new Vector3(0, .20f, 0), new Vector3(.32f, .06f, .36f), bronze, parent: arm);
                    P("Arm joint", new Vector3(0, -.28f, 0), new Vector3(.20f, .28f, .22f), dark, parent: arm);
                    P("Forearm plate", new Vector3(0, -.44f, .12f), new Vector3(.30f, .28f, .42f), bronze, parent: arm);

                    if (kind == 1 || kind == 4) {
                        // Ranged / Elite: Plasma blasters mounted on arms
                        P("Plasma blaster", new Vector3(0, -.44f, .48f), new Vector3(.22f, .22f, .75f), dark, parent: arm);
                        P("Blaster muzzle", new Vector3(0, -.44f, .86f), new Vector3(.16f, .14f, .08f), eyeGlow, parent: arm);
                    } else {
                        // Chaser / Tank / Swarm: Combat claw knuckles
                        P("Claw knuckle", new Vector3(0, -.58f, .18f), new Vector3(.32f, .18f, .34f), dark, parent: arm);
                        for (int n = 0; n < 3; n++) {
                            P("Alloy claw", new Vector3(-.10f + n * .10f, -.72f, .28f), new Vector3(.06f, .28f, .08f), ForgeArt.Trim, parent: arm);
                        }
                    }

                    if (side < 0) rig.LeftArm = arm; else rig.RightArm = arm;
                }

                // Archetype scaling
                if (kind == 2) {
                    // Tank: Bulkier, heavy chassis
                    root.localScale = new Vector3(1.65f, 1.40f, 1.50f);
                } else if (kind == 3) {
                    // Swarm: Compact, fast scout
                    root.localScale = Vector3.one * 0.72f;
                } else if (kind == 4) {
                    // Elite: Heavy commander with twin antennae
                    root.localScale = Vector3.one * 1.20f;
                    for (int side = -1; side <= 1; side += 2) {
                        P("Elite antenna", new Vector3(side * .26f, 2.15f, -.08f), new Vector3(.06f, .65f, .06f), ForgeArt.Trim);
                        P("Antenna beacon", new Vector3(side * .26f, 2.48f, -.08f), new Vector3(.10f, .10f, .10f), ForgeArt.Violet);
                    }
                } else {
                    // Standard Chaser
                    root.localScale = Vector3.one * 1.15f;
                }
            }

            rig.Setup();
            return root;
        }
    }

    public sealed class ForgeRig : MonoBehaviour {
        public Transform LeftLeg, RightLeg, LeftArm, RightArm;
        Renderer[] renderers;
        MaterialPropertyBlock flash;
        float flashEnd;
        bool flashed;

        public void Setup() {
            flash = new MaterialPropertyBlock();
            renderers = GetComponentsInChildren<Renderer>(true);
        }

        public void Animate(float movement, float clock) {
            if (movement > 0.01f) {
                float swing = Mathf.Sin(clock * 12f) * Mathf.Clamp01(movement) * 25f;
                if (LeftLeg) LeftLeg.localRotation = Quaternion.Euler(swing, 0, 0);
                if (RightLeg) RightLeg.localRotation = Quaternion.Euler(-swing, 0, 0);
                if (LeftArm) LeftArm.localRotation = Quaternion.Euler(-swing * 0.35f, 0, 0);
                if (RightArm) RightArm.localRotation = Quaternion.Euler(swing * 0.35f, 0, 0);
            }
            if (flashed && Time.unscaledTime >= flashEnd) {
                flashed = false;
                for (int i = 0; i < renderers.Length; i++) if (renderers[i]) renderers[i].SetPropertyBlock(null);
            }
        }

        public void Flash() {
            flashEnd = Time.unscaledTime + 0.12f;
            flashed = true;
            flash.SetColor("_BaseColor", Color.white);
            for (int i = 0; i < renderers.Length; i++) if (renderers[i]) renderers[i].SetPropertyBlock(flash);
        }
    }

    public sealed class ForgeVitalBar : MonoBehaviour {
        ArenaGame game;
        ForgeEnemy enemy;
        ForgePlayer player;
        Transform fill;
        float lastRatio = -1f;

        public void Initialize(ArenaGame arena, ForgeEnemy hostile, ForgePlayer friendly) {
            game = arena;
            enemy = hostile;
            player = friendly;
            // Sleek floating health bar
            ForgeArt.Part("Vital backdrop", PrimitiveType.Cube, transform, Vector3.zero, new Vector3(1.35f, 0.11f, 0.03f), ForgeArt.Dark);
            fill = ForgeArt.Part("Vital fill", PrimitiveType.Cube, transform, new Vector3(0, 0, -0.03f), new Vector3(1.31f, 0.075f, 0.02f), friendly ? ForgeArt.Green : ForgeArt.Red).transform;
        }

        void LateUpdate() {
            if (!game || !game.Camera) return;
            if (enemy && !enemy.Alive) return;

            var owner = player ? player.transform : enemy.transform;
            float ratio = player ? player.Health / 100f : enemy.Health / enemy.MaxHealth;
            transform.position = owner.position + Vector3.up * (enemy && enemy.Boss ? 5.1f : 2.55f);
            transform.rotation = game.Camera.transform.rotation;

            if (Mathf.Abs(ratio - lastRatio) > 0.005f) {
                lastRatio = ratio;
                float clamped = Mathf.Clamp01(ratio);
                fill.localScale = new Vector3(1.31f * clamped, 0.075f, 0.02f);
                fill.localPosition = new Vector3(-0.655f * (1f - clamped), 0, -0.03f);
            }
        }
    }
}
