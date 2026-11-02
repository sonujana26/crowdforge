using UnityEngine;
namespace CrowdForge {
    public sealed class ForgeEnemy : MonoBehaviour {
        public int Kind { get; private set; } public float Health { get; private set; } public float MaxHealth { get; private set; }
        public float FrozenUntil, BurningUntil; public bool Alive=>gameObject.activeSelf&&Health>0;
        public bool Boss=>Kind==5;public float ExposedUntil { get; private set; }
        ArenaGame game;CharacterController body;Transform visual;ForgeRig rig;float nextAttack,born,chargeUntil;Vector3 target,charge;int pattern;
        readonly Transform[] visualPool = new Transform[6];
        readonly ForgeRig[] rigPool = new ForgeRig[6];
        static readonly float[] Hp={45,35,160,18,100,360},Speed={3,2,1.25f,4.2f,2.8f,1.1f};
        public void Initialize(ArenaGame owner){game=owner;body=gameObject.AddComponent<CharacterController>();body.center=Vector3.up*.8f;body.height=1.6f;body.radius=.4f;var bar=new GameObject("Enemy health");bar.transform.SetParent(transform);bar.AddComponent<ForgeVitalBar>().Initialize(game,this,null);}
        public void Spawn(int kind,Vector3 position,bool echo=false){
            Kind=kind;
            if(visual)visual.gameObject.SetActive(false);
            if(!visualPool[kind]){
                visualPool[kind]=ForgeArt.Robot(transform,kind);
                rigPool[kind]=visualPool[kind].GetComponent<ForgeRig>();
            }
            visual=visualPool[kind];
            visual.gameObject.SetActive(true);
            rig=rigPool[kind];
            body.enabled=false;transform.position=position;body.radius=kind==5?1.3f:kind==2?.65f:.4f;body.enabled=true;
            Health=MaxHealth=Hp[kind]*(echo?.6f:1);FrozenUntil=BurningUntil=ExposedUntil=chargeUntil=0;born=game.Clock;nextAttack=game.Clock+(Boss?2:1.2f);pattern=0;target=game.Player.transform.position;gameObject.SetActive(true);
        }
        public void Tick(float dt){
            if(!Alive)return;if(BurningUntil>game.Clock)Damage(8*dt);if(!Alive||game.Clock-born<.8f)return;
            var goal=game.Modifiers.Target(transform.position);var delta=goal-transform.position;delta.y=0;float distance=delta.magnitude;
            if(delta.sqrMagnitude>.01f)transform.rotation=Quaternion.Slerp(transform.rotation,Quaternion.LookRotation(delta),dt*8);
            if(Boss){TickBoss(dt);return;}
            float sign=(Kind==1||Kind==4)&&distance<8?(distance<5?-1:0):1;
            var step=delta.normalized*Speed[Kind]*sign;
            // CharacterController resolves the static environment; a lateral probe avoids crate stalls.
            if(Physics.SphereCast(transform.position+Vector3.up,.35f,step.normalized,out var hit,1)&&hit.collider.gameObject.name.Contains("Crate"))step=Vector3.Cross(Vector3.up,step);
            if(FrozenUntil>game.Clock)step=Vector3.zero;
            body.Move((step+game.Modifiers.Pull(transform.position)+Vector3.down*4)*dt);
            visual.localPosition=Vector3.up*(Mathf.Sin(game.Clock*10+Kind)*.04f);rig.Animate(step.magnitude,game.Clock);
            if(game.Clock>=nextAttack){if((Kind==1||Kind==4)&&distance<16){game.Fire(transform.position+Vector3.up,delta.normalized,false,12,9);if(Kind==4)game.Fire(transform.position+Vector3.up,Quaternion.Euler(0,20,0)*delta.normalized,false,10,9);nextAttack=game.Clock+2;}else if(distance<1.15f){game.Player.Damage(Kind==2?22:Kind==3?6:12);nextAttack=game.Clock+1.1f;}}
        }
        void TickBoss(float dt){
            if(game.Clock<chargeUntil){body.Move((charge+Vector3.down*4)*dt);if(Vector3.Distance(transform.position,game.Player.transform.position)<2)game.Player.Damage(24);return;}
            if(nextAttack-game.Clock>1.2f)target=game.Player.transform.position;
            else game.Effects.Warning(target,1.5f);
            if(game.Clock<nextAttack)return;
            if(pattern%3==1){charge=(target-transform.position).normalized*(game.Modifiers.Has("gravity_well")?8:12);charge.y=0;chargeUntil=game.Clock+.8f;}
            else if(pattern%3==2)for(int n=-1;n<=1;n++)game.Modifiers.Hazard(target+Vector3.right*n*3,1.5f,false);
            else {int count=Health<MaxHealth*.5f?12:8;for(int n=0;n<count;n++)game.Fire(transform.position+Vector3.up,Quaternion.Euler(0,360f*n/count+pattern*13,0)*Vector3.forward,false,15,7);}
            ExposedUntil=game.Clock+(game.Modifiers.Has("slippery_floor")?2.8f:2.2f);nextAttack=game.Clock+(Health<MaxHealth*.5f?3.3f:4);pattern++;
        }
        public void Damage(float amount){if(!Alive)return;rig.Flash();Health-=amount*(Boss&&game.Clock>ExposedUntil?.28f:1);if(Health<=0){game.Score+=Boss?5000:Kind==2?260:100;game.Effects.Burst(transform.position,Boss?new Color(1,.3f,0):Color.magenta);game.Effects.Tone(Boss?800:180,.12f);gameObject.SetActive(false);}}
    }
}
