using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace CrowdForge {
    public static class ForgeEnvironment {
        static Transform world;

        static GameObject Box(string name, Vector3 p, Vector3 scale, Material material, bool solid = false) =>
            ForgeArt.Part(name, PrimitiveType.Cube, world, p, scale, material, solid);

        static GameObject Cylinder(string name, Vector3 p, Vector3 scale, Material material) =>
            ForgeArt.Part(name, PrimitiveType.Cylinder, world, p, scale, material);

        public static void Build() {
            world = new GameObject("AURORA // alpine tactical facility").transform;

            var floor = ForgeArt.Floor;
            var trim = ForgeArt.Trim;
            var dark = ForgeArt.Dark;
            var steel = ForgeArt.Steel;
            var hazard = ForgeArt.Hazard;
            var bronze = ForgeArt.Bronze;

            // 1. Lower service trench and walkable main platform
            Box("Lower service deck", new Vector3(0, -1.2f, 0), new Vector3(48f, 1.6f, 34f), dark);
            Box("Walkable foundation", new Vector3(0, -0.23f, 0), new Vector3(40f, 0.5f, 26f), dark, true);

            // 2. Modular metallic floor grid
            for (int x = -19; x <= 19; x += 2) {
                for (int z = -12; z <= 12; z += 2) {
                    Box("Metal panel", new Vector3(x, 0.02f, z), new Vector3(1.97f, 0.06f, 1.97f), floor);
                    // Recessed ventilation and drainage grates at regular intervals
                    if ((x + z) % 4 == 0) {
                        for (int n = 0; n < 4; n++) {
                            Box("Recessed vent", new Vector3(x + n * 0.16f - 0.24f, 0.055f, z + 0.55f), new Vector3(0.08f, 0.02f, 0.50f), dark);
                        }
                    }
                    // Corner fastener rivets
                    if ((x + z) % 3 == 0) {
                        for (int sx = -1; sx <= 1; sx += 2) {
                            for (int sz = -1; sz <= 1; sz += 2) {
                                Box("Panel rivet", new Vector3(x + sx * 0.85f, 0.055f, z + sz * 0.85f), new Vector3(0.08f, 0.02f, 0.08f), trim);
                            }
                        }
                    }
                }
            }

            // 3. Central Reactor with segmented glowing cyan power track and concentric plasma core
            BuildCentralReactor(trim, steel, dark);

            // 4. Perimeter Walls, Inset Lighting, Catwalks, and Banners
            BuildPerimeterWalls(trim, steel, dark, hazard);

            // 5. Warning hazard striping along the inner wall rim
            for (int x = -18; x <= 18; x++) {
                for (int side = -1; side <= 1; side += 2) {
                    var s = Box("Hazard stripe", new Vector3(x, 0.065f, side * 12.05f), new Vector3(0.42f, 0.02f, 0.35f), hazard);
                    s.transform.Rotate(0, 35f, 0);
                }
            }

            // 6. Crates, Pallets, and Industrial Machinery (matching the AFTER reference composition)
            BuildCratesAndMachinery(trim, steel, dark, hazard, bronze);

            // 7. High-Tech Comms & Energy Towers on the corners
            BuildEnergyTower(new Vector3(-19.5f, 0f, 12.5f), trim, steel, dark, true);
            BuildEnergyTower(new Vector3(19.5f, 0f, 12.5f), trim, steel, dark, true);
            BuildEnergyPylon(new Vector3(-19.5f, 0f, -12.2f), trim, steel, dark);
            BuildEnergyPylon(new Vector3(19.5f, 0f, -12.2f), trim, steel, dark);

            // 8. Outside Landscape: Transformers, Catwalk Railings, Conifer Trees, and Alpine Mountains
            BuildLandscapeAndAtmosphere(trim, steel, dark);

            // 9. Bake all static geometry into batched meshes for 99% draw call reduction
            BakeStaticGeometry(world.gameObject);
        }

        static void BakeStaticGeometry(GameObject root) {
            var meshFilters = root.GetComponentsInChildren<MeshFilter>(true);
            var groups = new Dictionary<Material, List<CombineInstance>>();

            for (int i = 0; i < meshFilters.Length; i++) {
                var mf = meshFilters[i];
                if (!mf || !mf.sharedMesh) continue;
                var mr = mf.GetComponent<MeshRenderer>();
                if (!mr || !mr.sharedMaterial) continue;

                var mat = mr.sharedMaterial;
                if (!groups.TryGetValue(mat, out var list)) {
                    list = new List<CombineInstance>();
                    groups[mat] = list;
                }

                var ci = new CombineInstance {
                    mesh = mf.sharedMesh,
                    transform = root.transform.worldToLocalMatrix * mf.transform.localToWorldMatrix
                };
                list.Add(ci);

                // Preserve collider if present; delete the visual MeshRenderer & MeshFilter
                if (mf.GetComponent<Collider>()) {
                    Object.Destroy(mr);
                    Object.Destroy(mf);
                } else {
                    Object.Destroy(mf.gameObject);
                }
            }

            var batchesRoot = new GameObject("Environment Batches");
            batchesRoot.transform.SetParent(root.transform, false);

            foreach (var kvp in groups) {
                var mat = kvp.Key;
                var instances = kvp.Value;
                if (instances.Count == 0) continue;

                var combinedMesh = new Mesh {
                    name = $"Batch_{mat.name}",
                    indexFormat = IndexFormat.UInt32
                };
                combinedMesh.CombineMeshes(instances.ToArray(), true, true, false);
                combinedMesh.Optimize();

                var batchGo = new GameObject($"Batch_{mat.name}");
                batchGo.transform.SetParent(batchesRoot.transform, false);
                var mf = batchGo.AddComponent<MeshFilter>();
                mf.sharedMesh = combinedMesh;
                var mr = batchGo.AddComponent<MeshRenderer>();
                mr.sharedMaterial = mat;

                bool castShadows = mat != ForgeArt.Floor && mat != ForgeArt.Snow && mat != ForgeArt.Rock && mat != ForgeArt.Bark;
                mr.shadowCastingMode = castShadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
                mr.receiveShadows = true;
            }
        }

        static void BuildCentralReactor(Material trim, Material steel, Material dark) {
            var reactorNeon = ForgeArt.ReactorGlow;
            var plasmaCore = ForgeArt.PlasmaCore;

            // Concentric platform rings
            Cylinder("Reactor foundation", new Vector3(0, 0.04f, 0), new Vector3(10.8f, 0.07f, 10.8f), dark);
            Cylinder("Reactor outer titanium rim", new Vector3(0, 0.12f, 0), new Vector3(10.2f, 0.04f, 10.2f), steel);
            Cylinder("Reactor recessed channel", new Vector3(0, 0.16f, 0), new Vector3(9.2f, 0.03f, 9.2f), dark);

            // 16 curved glowing cyan neon arc segments forming the distinct circular power track
            int segments = 16;
            float arcSpan = (Mathf.PI * 2f / segments) * 0.78f; // leave dark gaps between segments
            for (int i = 0; i < segments; i++) {
                float startAngle = i * (Mathf.PI * 2f / segments);
                var arcMesh = ForgeMesh.CreateArcSegment(4.05f, 4.45f, startAngle, arcSpan, 0.05f, 8);
                var arcObj = new GameObject($"Reactor neon arc {i}");
                arcObj.transform.SetParent(world, false);
                arcObj.transform.position = new Vector3(0, 0.17f, 0);
                arcObj.AddComponent<MeshFilter>().sharedMesh = arcMesh;
                arcObj.AddComponent<MeshRenderer>().sharedMaterial = reactorNeon;
            }

            // Raised inner concentric deck
            Cylinder("Reactor inner deck", new Vector3(0, 0.22f, 0), new Vector3(7.6f, 0.05f, 7.6f), steel);
            Cylinder("Inner carbon ring", new Vector3(0, 0.28f, 0), new Vector3(5.8f, 0.05f, 5.8f), dark);
            Cylinder("Machined inner bezel", new Vector3(0, 0.33f, 0), new Vector3(5.2f, 0.04f, 5.2f), trim);

            // 16 radial containment clamps / teeth locking into the inner core
            for (int n = 0; n < 16; n++) {
                float a = n * Mathf.PI / 8f;
                var p = new Vector3(Mathf.Cos(a) * 3.35f, 0.35f, Mathf.Sin(a) * 3.35f);
                var clamp = Box("Reactor radial clamp", p, new Vector3(0.26f, 0.12f, 0.85f), n % 4 == 0 ? reactorNeon : trim);
                clamp.transform.Rotate(0, -n * 22.5f, 0);
            }

            // Central Plasma Core Vortex (calibrated, crisp glow matching the reference)
            Cylinder("Core socket", new Vector3(0, 0.38f, 0), new Vector3(3.2f, 0.05f, 3.2f), dark);
            Cylinder("Outer energy ring", new Vector3(0, 0.43f, 0), new Vector3(2.3f, 0.035f, 2.3f), plasmaCore);
            Cylinder("Concentric dark divider", new Vector3(0, 0.46f, 0), new Vector3(1.75f, 0.04f, 1.75f), dark);
            Cylinder("Inner plasma ring", new Vector3(0, 0.49f, 0), new Vector3(1.25f, 0.035f, 1.25f), reactorNeon);
            Cylinder("Core node", new Vector3(0, 0.52f, 0), new Vector3(0.55f, 0.04f, 0.55f), trim);
            Cylinder("White-hot core focus", new Vector3(0, 0.55f, 0), new Vector3(0.25f, 0.03f, 0.25f), ForgeArt.White);

            // Dedicated soft cyan point light over reactor (tuned to 1.1f to prevent blinding glare)
            var reactorLight = new GameObject("Central reactor light").AddComponent<Light>();
            reactorLight.transform.SetParent(world, false);
            reactorLight.transform.position = new Vector3(0, 0.55f, 0);
            reactorLight.type = LightType.Point;
            reactorLight.color = new Color(0.12f, 0.70f, 0.95f);
            reactorLight.intensity = 1.1f;
            reactorLight.range = 6.0f;
            reactorLight.shadows = LightShadows.None;
        }

        static void BuildPerimeterWalls(Material trim, Material steel, Material dark, Material hazard) {
            var cyan = ForgeArt.Cyan;
            var amber = ForgeArt.Amber;
            var red = ForgeArt.Red;

            // ==================== BACK WALL (Z = 12.5) ====================
            // Modular wall sections with vertical buttress pillars, horizontal lighting, and catwalk
            for (int x = -18; x <= 18; x += 3) {
                var p = new Vector3(x, 0, 12.5f);
                var root = new GameObject($"Back wall modular unit {x}").transform;
                root.SetParent(world, false);
                root.position = p;

                void P(string n, Vector3 pos, Vector3 s, Material m, bool col = false) => ForgeArt.Part(n, PrimitiveType.Cube, root, pos, s, m, col);

                // Collision & main armor plate
                P("Wall collision", new Vector3(0, 1.4f, 0), new Vector3(3.0f, 2.8f, 1.4f), dark, true);
                P("Inset steel armor", new Vector3(0, 1.35f, -0.65f), new Vector3(2.75f, 2.2f, 0.25f), steel);
                P("Vertical structural rib", new Vector3(-1.35f, 1.45f, -0.72f), new Vector3(0.32f, 2.9f, 0.45f), trim);
                P("Vertical structural rib", new Vector3(1.35f, 1.45f, -0.72f), new Vector3(0.32f, 2.9f, 0.45f), trim);
                P("Catwalk deck", new Vector3(0, 2.85f, 0.8f), new Vector3(2.95f, 0.15f, 2.2f), steel);

                // Upper safety yellow catwalk railings
                P("Railing post L", new Vector3(-1.35f, 3.45f, -0.2f), new Vector3(0.08f, 1.1f, 0.08f), hazard);
                P("Railing post R", new Vector3(1.35f, 3.45f, -0.2f), new Vector3(0.08f, 1.1f, 0.08f), hazard);
                P("Top rail", new Vector3(0, 3.95f, -0.2f), new Vector3(2.95f, 0.08f, 0.08f), hazard);
                P("Mid rail", new Vector3(0, 3.55f, -0.2f), new Vector3(2.95f, 0.08f, 0.08f), hazard);

                // Horizontal Lighting Bars matching the AFTER reference:
                // Left side: Cyan horizontal light bars
                // Center: Bright Red/Orange alert light bar
                // Right side: Cyan horizontal light bars
                if (Mathf.Abs(x) <= 3) {
                    // Center alert bar (Red/Orange)
                    P("Light recess", new Vector3(0, 1.55f, -0.80f), new Vector3(2.4f, 0.35f, 0.08f), dark);
                    P("Center alert bar", new Vector3(0, 1.55f, -0.85f), new Vector3(2.2f, 0.18f, 0.06f), red);
                } else if (Mathf.Abs(x) >= 6 && Mathf.Abs(x) <= 12) {
                    // Cyan dual horizontal light bars
                    P("Light recess top", new Vector3(0, 1.85f, -0.80f), new Vector3(2.2f, 0.25f, 0.08f), dark);
                    P("Cyan strip top", new Vector3(0, 1.85f, -0.85f), new Vector3(2.0f, 0.12f, 0.06f), cyan);
                    P("Light recess bot", new Vector3(0, 1.25f, -0.80f), new Vector3(2.2f, 0.25f, 0.08f), dark);
                    P("Cyan strip bot", new Vector3(0, 1.25f, -0.85f), new Vector3(2.0f, 0.12f, 0.06f), cyan);
                }
            }

            // Back wall colored wash light
            CreateWallWashLight(new Vector3(0f, 2.2f, 11.2f), new Color(1f, 0.15f, 0.05f), 3.5f, 12f);

            // ==================== SIDE WALLS (X = -19.5 and X = +19.5) ====================
            // Modular wall sections with vertical columns, inset glowing amber panels, and CrowdForge banners
            for (int z = -9; z <= 9; z += 3) {
                for (int side = -1; side <= 1; side += 2) {
                    float x = side * 19.5f;
                    var root = new GameObject($"Side wall unit {side}_{z}").transform;
                    root.SetParent(world, false);
                    root.position = new Vector3(x, 0, z);
                    root.rotation = Quaternion.Euler(0, side > 0 ? -90f : 90f, 0);

                    void SP(string n, Vector3 pos, Vector3 s, Material m, bool col = false) => ForgeArt.Part(n, PrimitiveType.Cube, root, pos, s, m, col);

                    SP("Wall collision", new Vector3(0, 1.4f, 0), new Vector3(3.0f, 2.8f, 1.4f), dark, true);
                    SP("Inset steel armor", new Vector3(0, 1.35f, -0.65f), new Vector3(2.75f, 2.2f, 0.25f), steel);
                    SP("Structural rib L", new Vector3(-1.35f, 1.45f, -0.72f), new Vector3(0.32f, 2.9f, 0.45f), trim);
                    SP("Structural rib R", new Vector3(1.35f, 1.45f, -0.72f), new Vector3(0.32f, 2.9f, 0.45f), trim);
                    SP("Catwalk deck", new Vector3(0, 2.85f, 0.8f), new Vector3(2.95f, 0.15f, 2.2f), steel);

                    // Catwalk railings
                    SP("Railing post L", new Vector3(-1.35f, 3.45f, -0.2f), new Vector3(0.08f, 1.1f, 0.08f), hazard);
                    SP("Railing post R", new Vector3(1.35f, 3.45f, -0.2f), new Vector3(0.08f, 1.1f, 0.08f), hazard);
                    SP("Top rail", new Vector3(0, 3.95f, -0.2f), new Vector3(2.95f, 0.08f, 0.08f), hazard);
                    SP("Mid rail", new Vector3(0, 3.55f, -0.2f), new Vector3(2.95f, 0.08f, 0.08f), hazard);

                    // Inset Glowing Amber Panels (as shown prominently in the AFTER reference on side walls)
                    SP("Amber light recess", new Vector3(0, 1.45f, -0.80f), new Vector3(2.2f, 0.85f, 0.08f), dark);
                    SP("Amber panel glow", new Vector3(0, 1.45f, -0.85f), new Vector3(1.95f, 0.65f, 0.06f), amber);
                }
            }

            // Side wall banners (Blue CrowdForge diamond banners hanging on interior face)
            ForgeMesh.Banner(world, new Vector3(-18.6f, 2.5f, 3.0f), new Vector2(1.2f, 2.0f), 90f, ForgeArt.Banner);
            ForgeMesh.Banner(world, new Vector3(-18.6f, 2.5f, -3.0f), new Vector2(1.2f, 2.0f), 90f, ForgeArt.Banner);
            ForgeMesh.Banner(world, new Vector3(18.6f, 2.5f, 3.0f), new Vector2(1.2f, 2.0f), -90f, ForgeArt.Banner);
            ForgeMesh.Banner(world, new Vector3(18.6f, 2.5f, -3.0f), new Vector2(1.2f, 2.0f), -90f, ForgeArt.Banner);

            // Side wall warm amber wash lights (wide flank coverage)
            CreateWallWashLight(new Vector3(-18.2f, 2.0f, 0f), new Color(1f, 0.45f, 0.05f), 3.5f, 14f);
            CreateWallWashLight(new Vector3(18.2f, 2.0f, 0f), new Color(1f, 0.45f, 0.05f), 3.5f, 14f);

            // ==================== FRONT PERIMETER (Z = -12.5) ====================
            // Low armored retaining wall with hazard stripes and railing posts
            for (int x = -18; x <= 18; x += 3) {
                var p = new Vector3(x, 0, -12.5f);
                var root = new GameObject($"Front wall low curb {x}").transform;
                root.SetParent(world, false);
                root.position = p;

                void FP(string n, Vector3 pos, Vector3 s, Material m, bool col = false) => ForgeArt.Part(n, PrimitiveType.Cube, root, pos, s, m, col);

                FP("Curb collision", new Vector3(0, 0.6f, 0), new Vector3(3.0f, 1.2f, 1.2f), dark, true);
                FP("Armored front plate", new Vector3(0, 0.55f, 0.55f), new Vector3(2.9f, 1.0f, 0.2f), steel);
                FP("Hazard top cap", new Vector3(0, 1.15f, 0), new Vector3(2.95f, 0.15f, 1.3f), hazard);
                FP("Railing stanchion", new Vector3(-1.35f, 1.7f, 0), new Vector3(0.10f, 1.0f, 0.10f), trim);
                FP("Railing stanchion", new Vector3(1.35f, 1.7f, 0), new Vector3(0.10f, 1.0f, 0.10f), trim);
                FP("Safety rail", new Vector3(0, 2.15f, 0), new Vector3(2.95f, 0.08f, 0.08f), hazard);
            }
        }

        static void CreateWallWashLight(Vector3 pos, Color color, float intensity, float range) {
            var lamp = new GameObject("Wall wash lamp").AddComponent<Light>();
            lamp.transform.SetParent(world, false);
            lamp.transform.position = pos;
            lamp.type = LightType.Point;
            lamp.color = color;
            lamp.intensity = intensity;
            lamp.range = range;
            lamp.shadows = LightShadows.None;
        }

        static void BuildCratesAndMachinery(Material trim, Material steel, Material dark, Material hazard, Material bronze) {
            // Group 1: Bottom-Left heavy container stack (4 containers with hazard braces & vents)
            BuildCargoCrate(new Vector3(-15.2f, 0, -7.5f), 0f, trim, steel, dark, hazard, true);
            BuildCargoCrate(new Vector3(-17.0f, 0, -8.2f), 0f, trim, steel, dark, hazard, true);
            BuildCargoCrate(new Vector3(-15.8f, 1.6f, -7.8f), 15f, trim, steel, dark, hazard, true);
            BuildTechModule(new Vector3(-13.5f, 0, -8.8f), trim, steel, dark, hazard);

            // Group 2: Bottom-Center heavy transformer / generator module with black grates & yellow framing
            BuildIndustrialGenerator(new Vector3(6.5f, 0, -8.8f), trim, steel, dark, hazard);

            // Group 3: Bottom-Right crate stack
            BuildCargoCrate(new Vector3(14.5f, 0, -7.8f), 0f, trim, steel, dark, hazard, true);
            BuildCargoCrate(new Vector3(16.4f, 0, -8.2f), 0f, trim, steel, dark, hazard, true);
            BuildCargoCrate(new Vector3(15.2f, 1.6f, -7.9f), -12f, trim, steel, dark, hazard, true);

            // Group 4: Top-Left wall crates & power couplings
            BuildCargoCrate(new Vector3(-14.2f, 0, 9.8f), 0f, trim, steel, dark, hazard, true);
            BuildCargoCrate(new Vector3(-16.0f, 0, 9.5f), 0f, trim, steel, dark, hazard, true);
            BuildTechModule(new Vector3(-12.5f, 0, 10.2f), trim, steel, dark, hazard);

            // Group 5: Top-Right wall crates & supply units
            BuildCargoCrate(new Vector3(14.2f, 0, 9.8f), 0f, trim, steel, dark, hazard, true);
            BuildCargoCrate(new Vector3(16.0f, 0, 9.5f), 0f, trim, steel, dark, hazard, true);

            // Group 6: Mid-wall supply units
            BuildCargoCrate(new Vector3(-17.2f, 0, -1.5f), 0f, trim, steel, dark, hazard, true);
            BuildCargoCrate(new Vector3(17.2f, 0, 2.5f), 0f, trim, steel, dark, hazard, true);
        }

        static void BuildCargoCrate(Vector3 p, float rotY, Material trim, Material steel, Material dark, Material hazard, bool solid) {
            var root = new GameObject("Military cargo container").transform;
            root.SetParent(world, false);
            root.position = p;
            root.rotation = Quaternion.Euler(0, rotY, 0);

            GameObject CP(string n, Vector3 pos, Vector3 s, Material m, bool col = false) => ForgeArt.Part(n, PrimitiveType.Cube, root, pos, s, m, col);

            // Main body
            CP("Crate body", new Vector3(0, 0.8f, 0), new Vector3(1.85f, 1.55f, 1.75f), steel, solid);

            // Chamfered alloy corner framing
            for (int sx = -1; sx <= 1; sx += 2) {
                for (int sz = -1; sz <= 1; sz += 2) {
                    CP("Corner post", new Vector3(sx * 0.88f, 0.8f, sz * 0.83f), new Vector3(0.14f, 1.6f, 0.14f), trim);
                }
            }
            // Diagonal safety hazard braces on sides
            for (int sz = -1; sz <= 1; sz += 2) {
                var brace = CP("Diagonal brace", new Vector3(0, 0.8f, sz * 0.89f), new Vector3(0.12f, 2.1f, 0.05f), hazard);
                brace.transform.Rotate(0, 0, 45f);
            }
            // Top lid and ventilation grille
            CP("Top lid", new Vector3(0, 1.62f, 0), new Vector3(1.7f, 0.12f, 1.6f), dark);
            for (int n = 0; n < 4; n++) {
                CP("Cooling fin", new Vector3(-0.45f + n * 0.30f, 1.70f, 0), new Vector3(0.08f, 0.06f, 1.2f), trim);
            }
        }

        static void BuildTechModule(Vector3 p, Material trim, Material steel, Material dark, Material hazard) {
            var root = new GameObject("Tech storage module").transform;
            root.SetParent(world, false);
            root.position = p;

            void TP(string n, Vector3 pos, Vector3 s, Material m, bool col = false) => ForgeArt.Part(n, PrimitiveType.Cube, root, pos, s, m, col);

            TP("Module body", new Vector3(0, 0.6f, 0), new Vector3(1.3f, 1.15f, 1.3f), dark, true);
            TP("Module casing", new Vector3(0, 0.62f, 0), new Vector3(1.38f, 1.0f, 1.15f), steel);
            TP("Hazard trim", new Vector3(0, 1.22f, 0), new Vector3(1.35f, 0.10f, 1.35f), hazard);
            TP("Status indicator", new Vector3(0, 0.7f, 0.68f), new Vector3(0.35f, 0.12f, 0.05f), ForgeArt.Cyan);
        }

        static void BuildIndustrialGenerator(Vector3 p, Material trim, Material steel, Material dark, Material hazard) {
            var root = new GameObject("Industrial generator station").transform;
            root.SetParent(world, false);
            root.position = p;

            void GP(string n, Vector3 pos, Vector3 s, Material m, bool col = false) => ForgeArt.Part(n, PrimitiveType.Cube, root, pos, s, m, col);

            // Heavy yellow-painted outer chassis
            GP("Generator chassis", new Vector3(0, 0.95f, 0), new Vector3(2.4f, 1.85f, 2.2f), hazard, true);
            GP("Inner dark core", new Vector3(0, 0.95f, 0), new Vector3(2.1f, 1.65f, 2.25f), dark);
            GP("Front black grille", new Vector3(0, 0.85f, 1.14f), new Vector3(1.75f, 1.25f, 0.08f), dark);

            // Cooling louvers on front
            for (int n = 0; n < 6; n++) {
                GP("Louver bar", new Vector3(0, 0.45f + n * 0.18f, 1.16f), new Vector3(1.6f, 0.06f, 0.04f), trim);
            }

            // Top exhaust vents & cables
            GP("Top exhaust dome", new Vector3(-0.55f, 1.95f, 0), new Vector3(0.85f, 0.20f, 0.85f), dark);
            GP("Top exhaust dome R", new Vector3(0.55f, 1.95f, 0), new Vector3(0.85f, 0.20f, 0.85f), dark);
            GP("Power conduit box", new Vector3(1.22f, 0.65f, 0), new Vector3(0.18f, 0.65f, 0.85f), steel);
        }

        static void BuildEnergyTower(Vector3 p, Material trim, Material steel, Material dark, bool hasBeacon) {
            var root = new GameObject("High-tech comms energy tower").transform;
            root.SetParent(world, false);
            root.position = p;

            void TP(string n, Vector3 pos, Vector3 s, Material m, bool col = false) => ForgeArt.Part(n, PrimitiveType.Cube, root, pos, s, m, col);

            // Stepped base foundation
            TP("Tower foundation base", new Vector3(0, 0.5f, 0), new Vector3(3.2f, 1.0f, 3.2f), dark);
            TP("Tower base plinth", new Vector3(0, 1.2f, 0), new Vector3(2.6f, 0.5f, 2.6f), steel);

            // Tall Central Glowing Cyan Plasma Energy Conduit
            TP("Central plasma conduit", new Vector3(0, 5.2f, 0), new Vector3(0.75f, 7.8f, 0.75f), ForgeArt.Cyan);

            // 4-Pillar Tapered Open-Frame Lattice Truss Structure
            for (int sx = -1; sx <= 1; sx += 2) {
                for (int sz = -1; sz <= 1; sz += 2) {
                    TP("Truss leg", new Vector3(sx * 0.95f, 5.2f, sz * 0.95f), new Vector3(0.24f, 8.2f, 0.24f), trim);
                    // Horizontal girt rings at multiple heights
                    for (int h = 0; h < 4; h++) {
                        float y = 2.4f + h * 1.8f;
                        TP("Cross ring", new Vector3(sx * 0.95f, y, 0), new Vector3(0.12f, 0.12f, 1.9f), trim);
                        TP("Cross ring", new Vector3(0, y, sz * 0.95f), new Vector3(1.9f, 0.12f, 0.12f), trim);
                    }
                }
            }

            // Intermediate equipment deck
            TP("Mid platform", new Vector3(0, 6.2f, 0), new Vector3(2.4f, 0.25f, 2.4f), steel);
            TP("Transformer fin box", new Vector3(0.95f, 6.6f, 0), new Vector3(0.4f, 0.6f, 0.8f), dark);

            // Top Comms & Sensor Array
            TP("Tower cap housing", new Vector3(0, 9.4f, 0), new Vector3(2.2f, 0.65f, 2.2f), steel);
            TP("Sensor dome", new Vector3(0, 9.9f, 0), new Vector3(1.4f, 0.45f, 1.4f), dark);

            // Tall Comms Spire / Antenna reaching into the sky
            TP("Antenna mast", new Vector3(0, 11.2f, 0), new Vector3(0.14f, 2.4f, 0.14f), trim);
            TP("Warning beacon tip", new Vector3(0, 12.5f, 0), new Vector3(0.22f, 0.22f, 0.22f), ForgeArt.Amber);

            // Brilliant Cyan Beacon Point Light casting dramatic light on corner walls and trees
            var light = new GameObject("Tower energy beacon").AddComponent<Light>();
            light.transform.SetParent(root, false);
            light.transform.localPosition = new Vector3(0, 5.5f, -1.0f);
            light.type = LightType.Point;
            light.color = new Color(0.05f, 0.85f, 1.0f);
            light.range = 16f;
            light.intensity = 5.5f;
            light.shadows = LightShadows.None;
        }

        static void BuildEnergyPylon(Vector3 p, Material trim, Material steel, Material dark) {
            var root = new GameObject("Front corner pylon").transform;
            root.SetParent(world, false);
            root.position = p;

            void PP(string n, Vector3 pos, Vector3 s, Material m) => ForgeArt.Part(n, PrimitiveType.Cube, root, pos, s, m);

            PP("Pylon base", new Vector3(0, 0.5f, 0), new Vector3(2.2f, 1.0f, 2.2f), dark);
            PP("Pylon steel collar", new Vector3(0, 1.2f, 0), new Vector3(1.8f, 0.5f, 1.8f), steel);
            PP("Vertical cyan column", new Vector3(0, 3.2f, 0), new Vector3(0.6f, 3.8f, 0.6f), ForgeArt.Cyan);

            for (int s = -1; s <= 1; s += 2) {
                PP("Pylon frame", new Vector3(s * 0.65f, 3.2f, 0), new Vector3(0.22f, 4.2f, 0.85f), trim);
            }
            PP("Pylon cap", new Vector3(0, 5.4f, 0), new Vector3(1.6f, 0.5f, 1.6f), dark);
            PP("Caution top marker", new Vector3(0, 5.8f, 0), new Vector3(0.35f, 0.35f, 0.35f), ForgeArt.Amber);
        }

        static void BuildLandscapeAndAtmosphere(Material trim, Material steel, Material dark) {
            var foliage = ForgeArt.Foliage;
            var bark = ForgeArt.Bark;
            var rock = ForgeArt.Rock;
            var snow = ForgeArt.Snow;

            // Service deck machinery and railings outside the arena enclosure
            for (int s = -1; s <= 1; s += 2) {
                // External transformer substations
                Box("Substation transformer", new Vector3(s * 22.5f, 0.9f, 6.0f), new Vector3(2.4f, 2.4f, 3.6f), steel);
                for (int n = 0; n < 5; n++) {
                    Box("Cooling fin plate", new Vector3(s * 23.8f, 1.0f, 4.8f + n * 0.5f), new Vector3(0.12f, 2.0f, 0.16f), trim);
                }
                Box("Electrical conduit tank", new Vector3(s * 22.5f, 1.0f, -4.5f), new Vector3(1.8f, 2.6f, 1.8f), dark);
            }

            // Lush Coniferous Pine Trees flanking the arena (Left, Right, and Background)
            // Left flank
            ForgeMesh.PineTree(world, new Vector3(-24.5f, -1.0f, -9.0f), 1.35f, bark, foliage, 101);
            ForgeMesh.PineTree(world, new Vector3(-27.0f, -1.0f, -4.0f), 1.65f, bark, foliage, 102);
            ForgeMesh.PineTree(world, new Vector3(-24.0f, -1.0f, 1.5f), 1.25f, bark, foliage, 103);
            ForgeMesh.PineTree(world, new Vector3(-26.5f, -1.0f, 7.0f), 1.50f, bark, foliage, 104);
            ForgeMesh.PineTree(world, new Vector3(-23.5f, -1.0f, 12.0f), 1.40f, bark, foliage, 105);

            // Right flank
            ForgeMesh.PineTree(world, new Vector3(24.5f, -1.0f, -9.0f), 1.40f, bark, foliage, 201);
            ForgeMesh.PineTree(world, new Vector3(27.5f, -1.0f, -3.5f), 1.60f, bark, foliage, 202);
            ForgeMesh.PineTree(world, new Vector3(24.0f, -1.0f, 2.0f), 1.30f, bark, foliage, 203);
            ForgeMesh.PineTree(world, new Vector3(26.5f, -1.0f, 7.5f), 1.55f, bark, foliage, 204);
            ForgeMesh.PineTree(world, new Vector3(24.0f, -1.0f, 12.5f), 1.45f, bark, foliage, 205);

            // Background trees behind the facility wall
            for (int n = 0; n < 8; n++) {
                ForgeMesh.PineTree(world, new Vector3(-22f + n * 6.2f, -0.5f, 18.5f + (n % 2) * 3f), 1.45f + (n % 3) * 0.25f, bark, foliage, 300 + n);
            }

            // Distant Alpine Mountain Peaks & Rocky Ridges
            for (int n = 0; n < 9; n++) {
                ForgeMesh.Ridge(world, new Vector3(-55 + n * 14, -8, 30 + (n % 3) * 5), new Vector3(28, 14 + (n % 4) * 4, 28), rock, n * 13);
                ForgeMesh.Ridge(world, new Vector3(-55 + n * 14, -2, 34 + (n % 3) * 5), new Vector3(18, 9 + (n % 3) * 3, 16), snow, n * 13 + 7);
            }

            // Distant atmospheric cloud banks
            for (int n = 0; n < 14; n++) {
                ForgeArt.Part("Distant cloud", PrimitiveType.Sphere, world, new Vector3(-60 + n * 9, 14 + (n % 3) * 1.5f, 52), new Vector3(12, 2.5f, 5), snow);
            }

            // Directional Sun Light: warm golden-hour afternoon sunlight casting crisp diagonal shadows
            var sun = new GameObject("Afternoon sun").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.transform.rotation = Quaternion.Euler(48f, -38f, 0f);
            sun.color = new Color(1.0f, 0.94f, 0.86f);
            sun.intensity = 2.6f;
            sun.shadows = LightShadows.Soft;
            sun.shadowResolution = LightShadowResolution.High;
            RenderSettings.sun = sun;

            // Ambient sky lighting (cool blue sky fill + dark ground bounce)
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.44f, 0.68f, 0.88f);
            RenderSettings.ambientEquatorColor = new Color(0.32f, 0.42f, 0.52f);
            RenderSettings.ambientGroundColor = new Color(0.18f, 0.22f, 0.26f);

            var ambient = new SphericalHarmonicsL2();
            ambient.AddAmbientLight(new Color(0.48f, 0.58f, 0.68f));
            RenderSettings.ambientProbe = ambient;

            // Atmospheric fog blending the distant mountain ridges into the sky
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.42f, 0.60f, 0.76f);
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = 0.0035f;
        }
    }
}
