using System.Collections.Generic;
using UnityEngine;
namespace CrowdForge {
    public sealed class ForgeModifiers {
        sealed class Zone { public GameObject View; public Vector3 Position; public float Born,Radius,End;public bool Fire,Used; }
        readonly ArenaGame game;readonly HashSet<string> effects=new HashSet<string>();readonly Zone[] zones=new Zone[20];
        readonly List<GameObject> decor=new List<GameObject>();readonly Vector3[] wells={new Vector3(-4,0,0),new Vector3(6,0,3)};
        readonly Vector3[] patches={new Vector3(-7,0,3),new Vector3(7,0,-3),Vector3.zero};
        float nextStorm,nextFire,nextEcho,nextChain;int sequence;
        public ForgeModifiers(ArenaGame owner){game=owner;for(int i=0;i<zones.Length;i++){zones[i]=new Zone{View=ForgeArt.Part("Telegraphed hazard",PrimitiveType.Cylinder,null,Vector3.zero,Vector3.one,ForgeArt.Amber)};zones[i].View.SetActive(false);}}
        public bool Has(string id)=>effects.Contains(id);
        public void Reset(string[] ids){effects.Clear();foreach(string id in ids)effects.Add(id);foreach(var z in zones){z.Used=false;z.View.SetActive(false);}foreach(var o in decor)Object.Destroy(o);decor.Clear();nextStorm=nextFire=nextEcho=1;nextChain=0;sequence=0;
            if(Has("slippery_floor"))foreach(var p in patches){decor.Add(ForgeArt.Part("Frozen floor",PrimitiveType.Cylinder,null,p+Vector3.up*.03f,new Vector3(6,.025f,6),ForgeArt.Ice));for(int n=0;n<5;n++){var crystal=ForgeArt.Part("Ice crystal",PrimitiveType.Cube,null,p+Quaternion.Euler(0,n*72,0)*Vector3.forward*2.7f+Vector3.up*.5f,new Vector3(.25f,1,.25f),ForgeArt.Ice);crystal.transform.Rotate(15,n*72,20);decor.Add(crystal);}}
            if(Has("gravity_well"))foreach(var p in wells){decor.Add(ForgeArt.Part("Gravitational lens",PrimitiveType.Cylinder,null,p+Vector3.up*.07f,new Vector3(5,.02f,5),ForgeArt.Violet));}
            if(Has("mirror_decoys"))foreach(int side in new[]{-1,1}){decor.Add(ForgeArt.Part("Reflective barrier",PrimitiveType.Cube,null,new Vector3(side*7,1,0),new Vector3(.1f,2,5),ForgeArt.White));var root=new GameObject("Mirror decoy");root.transform.position=new Vector3(side*10,0,-side*5);ForgeArt.Robot(root.transform,-1);decor.Add(root);}
        }
        public float Friction(Vector3 p){if(Has("slippery_floor"))foreach(var patch in patches)if(Vector3.Distance(p,patch)<3.5f)return 2.2f;if(Has("slippery_floor")&&Has("gravity_well"))foreach(var well in wells)if(Vector3.Distance(p,well)<5)return 2.2f;return 14;}
        public Vector3 Pull(Vector3 p){var force=Vector3.zero;if(Has("gravity_well"))foreach(var well in wells){var d=well-p;d.y=0;if(d.magnitude<5&&d.magnitude>.8f)force+=d.normalized*1.7f;}return force;}
        public Vector3 Target(Vector3 enemy){var best=game.Player.transform.position;if(Has("mirror_decoys"))foreach(int s in new[]{-1,1}){var p=new Vector3(s*10,0,-s*5);if(Vector3.Distance(enemy,p)<Vector3.Distance(enemy,best))best=p;}return best;}
        public bool Reflect(Vector3 old,Vector3 next,ref Vector3 direction){if(!Has("mirror_decoys")||Mathf.Abs(next.z)>2.5f)return false;foreach(int side in new[]{-1,1})if(Mathf.Sign(old.x-side*7)!=Mathf.Sign(next.x-side*7)){direction.x=-direction.x;return true;}return false;}
        public void Hit(ForgeEnemy enemy){if(Has("slippery_floor"))enemy.FrozenUntil=game.Clock+.7f;if(Has("burning_zones"))enemy.BurningUntil=game.Clock+2.5f;if(Has("lightning_strikes")&&game.Clock>=nextChain){nextChain=game.Clock+.5f;int count=0;foreach(var other in game.Enemies)if(other.Alive&&other!=enemy&&Vector3.Distance(enemy.transform.position,other.transform.position)<4&&count++<3){other.Damage(14);game.Effects.Burst(other.transform.position,Color.cyan);}}}
        public void Hazard(Vector3 p,float radius,bool fire){foreach(var z in zones)if(!z.Used){z.Used=true;z.Position=p;z.Position.y=.05f;z.Born=game.Clock;z.End=game.Clock+(fire?5:1.35f);z.Fire=fire;z.Radius=radius;z.View.SetActive(true);return;}}
        public void Tick(float dt){
            if(Has("lightning_strikes")&&game.Clock>=nextStorm){nextStorm=game.Clock+2.8f;Hazard(game.Player.transform.position,1.7f,false);if(Has("slippery_floor"))foreach(var patch in patches)Hazard(patch,3,false);}
            if(Has("burning_zones")&&game.Clock>=nextFire){nextFire=game.Clock+3.8f;var p=new Vector3(sequence%2==0?-9:9,0,sequence%4<2?-5:5);sequence++;Hazard(p,2,true);Hazard(p+Vector3.right*2,1.5f,true);}
            if(Has("echo_enemies")&&game.Clock>=nextEcho){nextEcho=game.Clock+6;for(int n=0;n<3;n++)game.Spawn(3,true);if(Has("mirror_decoys")){game.Spawn(1,true);game.Spawn(1,true);}}
            foreach(var z in zones){if(!z.Used)continue;if(game.Clock>=z.End){z.Used=false;z.View.SetActive(false);continue;}
                if(z.Fire&&Has("gravity_well"))z.Position=Vector3.MoveTowards(z.Position,wells[0]+Vector3.up*.05f,dt*.7f);
                bool armed=game.Clock-z.Born>=1;z.View.transform.position=z.Position;z.View.transform.localScale=new Vector3(z.Radius*2,armed?.06f:.015f,z.Radius*2);z.View.GetComponent<Renderer>().sharedMaterial=armed||Mathf.Sin(game.Clock*14)>0?(z.Fire?ForgeArt.Amber:ForgeArt.Cyan):ForgeArt.Dark;
                if(!armed){game.Effects.Warning(z.Position,z.Radius);continue;}
                if(Vector3.Distance(z.Position,game.Player.transform.position)<z.Radius)game.Player.Damage(z.Fire?8:17);
                if(!z.Fire)game.Effects.Burst(z.Position,Color.cyan,3);
                foreach(var e in game.Enemies)if(e.Alive&&Vector3.Distance(e.transform.position,z.Position)<z.Radius){if(z.Fire)e.BurningUntil=game.Clock+.4f;else e.Damage(dt*50);}
            }
        }
    }
}
