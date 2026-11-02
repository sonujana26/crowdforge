using UnityEngine;
using UnityEngine.Rendering;

namespace CrowdForge {
    public static class ForgeArt {
        public static Material Steel, Dark, White, Navy, Cyan, Amber, Violet, Red, Green, Ice;
        public static Material Trim, Hazard, Bronze, Floor, Foliage, Bark, Rock, Snow, Banner;
        public static Material ReactorGlow, PlasmaCore;

        public static void Initialize() {
            Steel = Material("Titanium", new Color(.24f, .32f, .40f), .78f);
            Dark = Material("Carbon", new Color(.05f, .07f, .10f), .50f);
            White = Material("Ceramic", new Color(.90f, .94f, .98f), .40f);
            Navy = Material("Vanguard Navy", new Color(.08f, .22f, .48f), .55f);
            Cyan = Material("Ion cyan", new Color(.02f, .85f, 1f), .30f, 2.2f);
            Amber = Material("Warning amber", new Color(1f, .40f, .04f), .25f, 2.4f);
            Violet = Material("Phase violet", new Color(.55f, .08f, 1f), .40f, 2.0f);
            Red = Material("Hostile red", new Color(1f, .04f, .05f), .50f, 2.4f);
            Green = Material("Echo green", new Color(.03f, .85f, .38f), .40f, 2.2f);
            Ice = Material("Frost ice", new Color(.22f, .70f, .92f), .60f, .5f);

            ReactorGlow = Material("Reactor neon", new Color(.04f, .78f, .95f), .30f, 1.6f);
            PlasmaCore = Material("Plasma core", new Color(.06f, .45f, .90f), .40f, 1.8f);

            Trim = Material("Machined alloy", new Color(.70f, .78f, .86f), .85f);
            Trim.SetFloat("_Smoothness", .72f);

            Hazard = Material("Safety hazard", new Color(.92f, .68f, .08f), .15f);
            Hazard.SetFloat("_Smoothness", .40f);

            Bronze = Material("Armor bronze", new Color(.55f, .36f, .22f), .78f);
            Bronze.SetFloat("_Smoothness", .55f);

            Foliage = Material("Alpine foliage", new Color(.16f, .36f, .12f), .05f);
            Foliage.SetFloat("_Smoothness", .22f);

            Bark = Material("Pine bark", new Color(.26f, .18f, .12f), 0f);
            Bark.SetFloat("_Smoothness", .12f);

            Rock = Material("Alpine granite", new Color(.38f, .45f, .48f), .05f);
            Rock.SetFloat("_Smoothness", .20f);

            Snow = Material("Alpine snow", new Color(.94f, .97f, 1f), 0f);
            Snow.SetFloat("_Smoothness", .45f);

            Banner = Material("CrowdForge banner", new Color(.10f, .25f, .55f), .35f);
            Floor = Material("Modular titanium deck", new Color(.38f, .46f, .54f), .72f);
            Floor.SetFloat("_Smoothness", .68f);

            // High-detail procedural floor tile texture
            var floorTex = GenerateFloorTexture();
            Floor.SetTexture("_BaseMap", floorTex);
            Steel.SetTexture("_BaseMap", floorTex);

            // Procedural diagonal safety hazard stripe texture
            var hazardTex = GenerateHazardTexture();
            Hazard.SetTexture("_BaseMap", hazardTex);

            // Procedural banner insignia texture
            var bannerTex = GenerateBannerTexture();
            Banner.SetTexture("_BaseMap", bannerTex);
        }

        static Texture2D GenerateFloorTexture() {
            int size = 256;
            var tex = new Texture2D(size, size, TextureFormat.RGB24, true);
            tex.name = "Modular titanium plate";
            tex.wrapMode = TextureWrapMode.Repeat;
            var pixels = new Color[size * size];

            for (int y = 0; y < size; y++) {
                for (int x = 0; x < size; x++) {
                    float u = x / (float)size, v = y / (float)size;
                    // Recessed outer border grooves (tile seams)
                    float edgeDist = Mathf.Min(Mathf.Min(x, size - 1 - x), Mathf.Min(y, size - 1 - y));
                    float seam = edgeDist < 4 ? 0.35f : edgeDist < 7 ? 0.65f : 1.0f;

                    // Brushed titanium grain
                    float noise = Mathf.PerlinNoise(x * 0.12f, y * 0.015f) * 0.18f +
                                  Mathf.PerlinNoise(x * 0.45f, y * 0.05f) * 0.08f;
                    float baseVal = (0.75f + noise) * seam;

                    // Corner rivets at (18, 18), (238, 18), etc.
                    float r1 = Mathf.Sqrt((x - 18) * (x - 18) + (y - 18) * (y - 18));
                    float r2 = Mathf.Sqrt((x - 238) * (x - 238) + (y - 18) * (y - 18));
                    float r3 = Mathf.Sqrt((x - 18) * (x - 18) + (y - 238) * (y - 238));
                    float r4 = Mathf.Sqrt((x - 238) * (x - 238) + (y - 238) * (y - 238));
                    float rMin = Mathf.Min(Mathf.Min(r1, r2), Mathf.Min(r3, r4));
                    if (rMin < 6f) {
                        baseVal = rMin < 2.5f ? 1.0f : 0.28f; // Rivet center highlight + dark rim
                    }

                    // Recessed drainage vent lines in center
                    if (x > 80 && x < 176 && (y % 16 < 4) && y > 60 && y < 196) {
                        baseVal *= 0.45f;
                    }

                    pixels[y * size + x] = new Color(baseVal, baseVal * 1.04f, baseVal * 1.08f);
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(true);
            return tex;
        }

        static Texture2D GenerateHazardTexture() {
            int size = 128;
            var tex = new Texture2D(size, size, TextureFormat.RGB24, true);
            tex.name = "Hazard diagonal stripe";
            tex.wrapMode = TextureWrapMode.Repeat;
            var pixels = new Color[size * size];

            var yellow = new Color(0.96f, 0.72f, 0.06f);
            var dark = new Color(0.08f, 0.10f, 0.12f);

            for (int y = 0; y < size; y++) {
                for (int x = 0; x < size; x++) {
                    int diag = (x + y) % 32;
                    pixels[y * size + x] = diag < 16 ? yellow : dark;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(true);
            return tex;
        }

        static Texture2D GenerateBannerTexture() {
            int w = 128, h = 256;
            var tex = new Texture2D(w, h, TextureFormat.RGB24, true);
            tex.name = "CrowdForge banner emblem";
            tex.wrapMode = TextureWrapMode.Clamp;
            var pixels = new Color[w * h];

            var bg = new Color(0.08f, 0.20f, 0.45f);
            var cyan = new Color(0.15f, 0.88f, 1.0f);
            var white = new Color(0.92f, 0.96f, 1.0f);

            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    float nx = (x - w * 0.5f) / (w * 0.5f);
                    float ny = (y - h * 0.55f) / (h * 0.28f);
                    float d1 = Mathf.Abs(nx) + Mathf.Abs(ny); // Outer diamond

                    float inx = (x - w * 0.5f) / (w * 0.28f);
                    float iny = (y - h * 0.55f) / (h * 0.16f);
                    float d2 = Mathf.Abs(inx) + Mathf.Abs(iny); // Inner diamond

                    Color c = bg * (0.85f + (y / (float)h) * 0.25f);
                    if (d1 < 0.95f && d1 > 0.80f) c = cyan;
                    else if (d2 < 0.92f && d2 > 0.70f) c = white;
                    else if (d2 <= 0.70f) c = cyan * 0.8f;

                    // Light border outline
                    if (x < 3 || x > w - 4 || y < 4 || y > h - 4) c = cyan * 0.7f;
                    pixels[y * w + x] = c;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply(true);
            return tex;
        }

        static Mesh cylinderMesh, sphereMesh;

        public static Mesh GetPrimitiveMesh(PrimitiveType type) {
            if (type == PrimitiveType.Cube) return ForgeMesh.BeveledBox;
            if (type == PrimitiveType.Cylinder) {
                if (!cylinderMesh) {
                    var temp = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    cylinderMesh = temp.GetComponent<MeshFilter>().sharedMesh;
                    Object.DestroyImmediate(temp);
                }
                return cylinderMesh;
            }
            if (type == PrimitiveType.Sphere) {
                if (!sphereMesh) {
                    var temp = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    sphereMesh = temp.GetComponent<MeshFilter>().sharedMesh;
                    Object.DestroyImmediate(temp);
                }
                return sphereMesh;
            }
            return ForgeMesh.BeveledBox;
        }

        static Material Material(string name, Color color, float metallic, float emission = 0) {
            var m = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = name, color = color };
            m.SetFloat("_Metallic", metallic);
            m.SetFloat("_Smoothness", .62f);
            m.enableInstancing = true;
            if (emission > 0) {
                m.EnableKeyword("_EMISSION");
                m.SetColor("_EmissionColor", color * emission);
            }
            return m;
        }

        public static Material MakeMaterial(string name, Color color, float metallic = 0, float emission = 0) => Material(name, color, metallic, emission);

        public static GameObject Part(string name, PrimitiveType type, Transform parent, Vector3 position, Vector3 scale, Material material, bool collision = false) {
            var o = new GameObject(name);
            o.transform.SetParent(parent, false);
            o.transform.localPosition = position;
            o.transform.localScale = scale;
            var mf = o.AddComponent<MeshFilter>();
            mf.sharedMesh = GetPrimitiveMesh(type);
            var mr = o.AddComponent<MeshRenderer>();
            mr.sharedMaterial = material;
            if (collision) {
                var box = o.AddComponent<BoxCollider>();
                box.size = Vector3.one;
            }
            return o;
        }

        public static Transform Robot(Transform parent, int kind) {
            return ForgeCharacters.Build(parent, kind);
        }

        public static void BuildWorld() {
            ForgeEnvironment.Build();
        }
    }
}
