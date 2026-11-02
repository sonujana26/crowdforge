using System.Collections.Generic;
using UnityEngine;

namespace CrowdForge {
    public static class ForgeMesh {
        static Mesh bevel;
        public static Mesh BeveledBox {
            get {
                if (bevel) return bevel;
                var vertices=new List<Vector3>();var indices=new List<int>();var uv=new List<Vector2>();
                void Face(params Vector3[] points) {
                    int start=vertices.Count;
                    var normal=Vector3.Cross(points[1]-points[0],points[2]-points[0]);var center=Vector3.zero;foreach(var p in points)center+=p;
                    if(Vector3.Dot(normal,center)<0)System.Array.Reverse(points);
                    foreach(var p in points){vertices.Add(p);uv.Add(new Vector2(p.x+p.z+.5f,p.y+p.z+.5f));}
                    for(int n=1;n<points.Length-1;n++){indices.Add(start);indices.Add(start+n);indices.Add(start+n+1);}
                }
                const float a=.5f,b=.43f;
                Vector3 V(int axis,float d,float u,float v){return axis==0?new Vector3(d,u,v):axis==1?new Vector3(u,d,v):new Vector3(u,v,d);}
                for(int axis=0;axis<3;axis++)for(int sign=-1;sign<=1;sign+=2)Face(V(axis,sign*a,-b,-b),V(axis,sign*a,b,-b),V(axis,sign*a,b,b),V(axis,sign*a,-b,b));
                for(int axis=0;axis<3;axis++)for(int s=-1;s<=1;s+=2)for(int t=-1;t<=1;t+=2)Face(V(axis,-b,s*a,t*b),V(axis,b,s*a,t*b),V(axis,b,s*b,t*a),V(axis,-b,s*b,t*a));
                for(int x=-1;x<=1;x+=2)for(int y=-1;y<=1;y+=2)for(int z=-1;z<=1;z+=2)Face(new Vector3(x*a,y*b,z*b),new Vector3(x*b,y*a,z*b),new Vector3(x*b,y*b,z*a));
                bevel=new Mesh{name="Original chamfered armor mesh"};bevel.SetVertices(vertices);bevel.SetTriangles(indices,0);bevel.SetUVs(0,uv);bevel.RecalculateNormals();bevel.RecalculateBounds();return bevel;
            }
        }

        public static GameObject Ridge(Transform parent,Vector3 position,Vector3 size,Material material,int seed) {
            const int rows=12;var vertices=new Vector3[(rows+1)*(rows+1)];var triangles=new int[rows*rows*6];int index=0;
            for(int z=0;z<=rows;z++)for(int x=0;x<=rows;x++) {
                float px=x/(float)rows,pz=z/(float)rows;
                float peak=Mathf.Pow(Mathf.Max(0,1-Mathf.Abs(px*2-1)),.7f)*Mathf.Pow(Mathf.Max(0,1-Mathf.Abs(pz*2-1)),.55f);
                vertices[z*(rows+1)+x]=new Vector3((px-.5f)*size.x,peak*size.y*(.65f+Mathf.PerlinNoise(x*.63f+seed,z*.48f)*.6f),(pz-.5f)*size.z);
                if(x==rows||z==rows)continue;int a=z*(rows+1)+x,b=a+rows+1;triangles[index++]=a;triangles[index++]=b;triangles[index++]=a+1;triangles[index++]=a+1;triangles[index++]=b;triangles[index++]=b+1;
            }
            var mesh=new Mesh{name="Original alpine ridge"};mesh.vertices=vertices;mesh.triangles=triangles;mesh.RecalculateNormals();
            var go=new GameObject("Alpine outcrop");go.transform.SetParent(parent,false);go.transform.position=position;go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterial=material;return go;
        }

        public static Mesh CreateArcSegment(float rIn, float rOut, float startAngleRad, float sweepAngleRad, float height, int segs = 8) {
            var mesh = new Mesh { name = "Reactor arc segment" };
            int vertCount = (segs + 1) * 4;
            var verts = new Vector3[vertCount];
            var uvs = new Vector2[vertCount];
            var tris = new List<int>();

            for (int i = 0; i <= segs; i++) {
                float t = i / (float)segs;
                float angle = startAngleRad + sweepAngleRad * t;
                float cos = Mathf.Cos(angle), sin = Mathf.Sin(angle);

                int idx = i * 4;
                verts[idx]     = new Vector3(cos * rIn,  height, sin * rIn);
                verts[idx + 1] = new Vector3(cos * rOut, height, sin * rOut);
                verts[idx + 2] = new Vector3(cos * rIn,  0f,     sin * rIn);
                verts[idx + 3] = new Vector3(cos * rOut, 0f,     sin * rOut);

                uvs[idx]     = new Vector2(t, 1f);
                uvs[idx + 1] = new Vector2(t, 0f);
                uvs[idx + 2] = new Vector2(t, 1f);
                uvs[idx + 3] = new Vector2(t, 0f);

                if (i < segs) {
                    int a = idx, b = idx + 1, c = idx + 4, d = idx + 5;
                    // Top face
                    tris.Add(a); tris.Add(c); tris.Add(b);
                    tris.Add(b); tris.Add(c); tris.Add(d);
                    // Outer face
                    int bo = idx + 1, do_ = idx + 5, bo_bot = idx + 3, do_bot = idx + 7;
                    tris.Add(bo); tris.Add(do_); tris.Add(bo_bot);
                    tris.Add(bo_bot); tris.Add(do_); tris.Add(do_bot);
                    // Inner face
                    int bi = idx, di_ = idx + 4, bi_bot = idx + 2, di_bot = idx + 6;
                    tris.Add(bi); tris.Add(bi_bot); tris.Add(di_);
                    tris.Add(di_); tris.Add(bi_bot); tris.Add(di_bot);
                }
            }
            mesh.vertices = verts;
            mesh.uv = uvs;
            mesh.triangles = tris.ToArray();
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        public static GameObject PineTree(Transform parent, Vector3 position, float scale, Material trunkMat, Material foliageMat, int seed) {
            var root = new GameObject("Alpine conifer").transform;
            root.SetParent(parent, false);
            root.position = position;
            root.localScale = Vector3.one * scale;

            // Tapered trunk
            var trunk = new GameObject("Pine trunk");
            trunk.transform.SetParent(root, false);
            trunk.transform.localPosition = new Vector3(0, 2.5f, 0);
            trunk.transform.localScale = new Vector3(0.42f, 2.5f, 0.42f);
            trunk.AddComponent<MeshFilter>().sharedMesh = ForgeArt.GetPrimitiveMesh(PrimitiveType.Cylinder);
            trunk.AddComponent<MeshRenderer>().sharedMaterial = trunkMat;

            // 5 tiered conical canopies with rotational variation
            float[] tierY = { 2.2f, 3.4f, 4.4f, 5.3f, 6.1f };
            float[] tierRadius = { 2.1f, 1.8f, 1.45f, 1.05f, 0.65f };
            float[] tierHeight = { 1.6f, 1.4f, 1.25f, 1.1f, 0.95f };

            for (int t = 0; t < 5; t++) {
                int sides = 7 + (t % 2);
                var coneMesh = new Mesh { name = $"Canopy tier {t}" };
                var verts = new List<Vector3> { new Vector3(0, tierHeight[t], 0) }; // Apex
                var uvs = new List<Vector2> { new Vector2(0.5f, 1f) };
                var tris = new List<int>();

                float rotOffset = (t * 43f + seed * 17f) * Mathf.Deg2Rad;
                for (int s = 0; s < sides; s++) {
                    float a = rotOffset + s * Mathf.PI * 2f / sides;
                    float r = tierRadius[t] * (0.88f + Mathf.PerlinNoise(s * 1.5f + seed, t) * 0.24f);
                    verts.Add(new Vector3(Mathf.Cos(a) * r, 0f, Mathf.Sin(a) * r));
                    uvs.Add(new Vector2(s / (float)sides, 0f));
                }
                // Triangles connecting apex to perimeter
                for (int s = 1; s <= sides; s++) {
                    int next = (s % sides) + 1;
                    tris.Add(0); tris.Add(s); tris.Add(next);
                }
                coneMesh.SetVertices(verts);
                coneMesh.SetUVs(0, uvs);
                coneMesh.SetTriangles(tris, 0);
                coneMesh.RecalculateNormals();

                var tier = new GameObject($"Conifer tier {t}");
                tier.transform.SetParent(root, false);
                tier.transform.localPosition = new Vector3(0, tierY[t], 0);
                tier.AddComponent<MeshFilter>().sharedMesh = coneMesh;
                tier.AddComponent<MeshRenderer>().sharedMaterial = foliageMat;
            }
            return root.gameObject;
        }

        public static GameObject Banner(Transform parent, Vector3 position, Vector2 size, float rotY, Material material) {
            var go = new GameObject("Sci-fi banner");
            go.transform.SetParent(parent, false);
            go.transform.position = position;
            go.transform.rotation = Quaternion.Euler(0, rotY, 0);

            var mesh = new Mesh { name = "Banner cloth" };
            float hw = size.x * 0.5f, h = size.y;
            mesh.vertices = new[] {
                new Vector3(-hw, 0, 0),
                new Vector3(hw, 0, 0),
                new Vector3(-hw, -h, 0.08f),
                new Vector3(hw, -h, 0.08f)
            };
            mesh.uv = new[] {
                new Vector2(0, 1), new Vector2(1, 1),
                new Vector2(0, 0), new Vector2(1, 0)
            };
            mesh.triangles = new[] { 0, 1, 2, 2, 1, 3 };
            mesh.RecalculateNormals();

            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = material;
            return go;
        }
    }
}
